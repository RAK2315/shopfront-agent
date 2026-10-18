// Spike C (D-097, at most 1 day): can Shopfront be a PayPal Cart API v1 merchant with capture-on-ship?
//   C1  a cart in PayPal's own Cart API v1 schema (@paypal/agentic-commerce-spec) validates, and a cart that carries an
//       agent-sent price still parses (so the server must ignore it, D-002)
//   C2  a store-bound RS256 JWT: right store accepted, other store / expired / tampered refused (node:crypto, no deps)
//   C3  platform-paid shop: Orders v2 intent AUTHORIZE → buyer approves → authorize → capture later ("on ship") →
//       refund (books stay clean)
//   C4  platform-paid shop: authorize → void (an order cancelled before it ships releases the hold)
//   C5  direct-paid shop (payee = seller 2): authorize → capture on ship; can our app also refund it? (D-076 says 403)
//   C6  direct-paid shop: authorize → void
// Real sandbox calls only, a PayPal-Request-Id on every POST, debug ids recorded. Nothing here touches the app's DB rows
// except one read of seller 2's merchant id.
// Usage: pnpm --filter web spike-c
import { createPrivateKey, createPublicKey, generateKeyPairSync, randomUUID, sign, verify } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { payPalCartSchema, payPalCartWritableSchema } from "@paypal/agentic-commerce-spec";
import { chromium, type Browser } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const e = process.env as Record<string, string>;
const out = resolve("../../docs/screenshots/spike-c");
mkdirSync(out, { recursive: true });
const RETURN = "https://shopfront-agent.onrender.com/pay/link-invalid?spike=c";
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};

let token = "";
async function pp(method: string, path: string, body?: unknown, requestId?: string) {
  if (!token) {
    const t = await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: { authorization: "Basic " + Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    token = ((await t.json()) as { access_token: string }).access_token;
  }
  const r = await fetch(`${e.PAYPAL_BASE_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  return { status: r.status, json, debugId: r.headers.get("paypal-debug-id") ?? undefined };
}
const issue = (j: Record<string, unknown>) => `${j.name ?? ""} ${((j.details as Array<{ issue?: string }> | undefined) ?? []).map((d) => d.issue).join(",")}`.trim();

function orderBody(tag: string, payee?: { merchant_id: string }) {
  const amt = { currency_code: "USD", value: "12.00" };
  return {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        reference_id: `spike-c-${tag}`,
        custom_id: `spike-c-${tag}`,
        ...(payee ? { payee } : {}),
        amount: { ...amt, breakdown: { item_total: amt } },
        items: [{ name: `Spike C ${tag}`, quantity: "1", unit_amount: amt, category: "PHYSICAL_GOODS" }],
      },
    ],
    payment_source: { paypal: { experience_context: { brand_name: "Shopfront (Spike C)", shipping_preference: "GET_FROM_FILE", user_action: "PAY_NOW", return_url: RETURN, cancel_url: RETURN } } },
  };
}

async function approve(browser: Browser, href: string, tag: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(href, { waitUntil: "domcontentloaded" });
        await loginAndApprove(page, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD }, attempt === 1 ? { review: join(out, `${tag}-paypal-review.png`) } : {});
        await page.waitForURL(/spike=c/, { timeout: 90_000 });
        return;
      } catch (err) {
        log(`approve ${tag} attempt ${attempt} failed: ${err instanceof Error ? err.message.split(/\r?\n/)[0] : err}`);
        if (attempt >= 2) throw err;
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
  } finally {
    await ctx.close();
  }
}

/** Create an AUTHORIZE order, have the sandbox buyer approve it, authorize it. Returns the authorization. */
async function authorized(browser: Browser, tag: string, payee?: { merchant_id: string }) {
  const run = randomUUID();
  const created = await pp("POST", "/v2/checkout/orders", orderBody(tag, payee), `spike-c-order-${run}`);
  if (created.status !== 200 && created.status !== 201) throw new Error(`create ${created.status} ${issue(created.json)} debug ${created.debugId}`);
  const orderId = created.json.id as string;
  const href = (created.json.links as Array<{ rel: string; href: string }>).find((l) => l.rel === "payer-action")!.href;
  await approve(browser, href, tag);
  const auth = await pp("POST", `/v2/checkout/orders/${orderId}/authorize`, {}, `spike-c-authorize-${run}`);
  const pu = (auth.json.purchase_units as Array<{ payee?: { merchant_id?: string }; payments?: { authorizations?: Array<{ id: string; status: string; expiration_time?: string; amount: { value: string } }> } }> | undefined)?.[0];
  const a = pu?.payments?.authorizations?.[0];
  return { run, orderId, createDebug: created.debugId, authStatus: auth.status, authDebug: auth.debugId, authIssue: auth.status >= 300 ? issue(auth.json) : undefined, authorization: a, payee: pu?.payee?.merchant_id };
}

const browser = await chromium.launch({ headless: true });
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
try {
  // C1: PayPal's own Cart API v1 schema.
  {
    const cart = {
      items: [{ variant_id: "var_cobalt120000", quantity: 1, name: "Cobalt drip mug" }],
      shipping_address: { address_line_1: "1 Main St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" },
      payment_method: { type: "paypal" },
    };
    const writable = payPalCartWritableSchema.safeParse(cart);
    const injected = payPalCartWritableSchema.safeParse({ ...cart, items: [{ ...cart.items[0], price: { currency_code: "USD", value: "0.01" } }] });
    const response = payPalCartSchema.safeParse({
      id: "cart_x",
      status: "INCOMPLETE",
      validation_status: "INVALID",
      validation_issues: [{ code: "PRICING_ERROR", type: "BUSINESS_RULE", message: "price mismatch", resolution_options: [{ action: "ACCEPT_NEW_PRICE", label: "Accept $32.00" }] }],
      totals: { total: { currency_code: "USD", value: "37.00" } },
    });
    record("C1 Cart API v1 schema (PayPal's own Zod)", writable.success && injected.success && response.success, {
      writable: writable.success,
      agentPriceAccepted: injected.success,
      responseShape: response.success,
      note: "an agent-sent item price is valid in the schema, so the server must ignore it (D-002)",
    });
  }

  // C2: store-bound RS256 JWT with node:crypto.
  {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const mint = (claims: Record<string, unknown>) => {
      const head = b64({ alg: "RS256", typ: "JWT", kid: "spike" });
      const body = b64(claims);
      return `${head}.${body}.${sign("sha256", Buffer.from(`${head}.${body}`), createPrivateKey(privateKey.export({ type: "pkcs8", format: "pem" }))).toString("base64url")}`;
    };
    const check = (jwt: string, store: string) => {
      const [h, b, s] = jwt.split(".");
      if (!h || !b || !s) return "malformed";
      if (!verify("sha256", Buffer.from(`${h}.${b}`), createPublicKey(publicKey.export({ type: "spki", format: "pem" })), Buffer.from(s, "base64url"))) return "bad_signature";
      const c = JSON.parse(Buffer.from(b, "base64url").toString()) as { aud?: string; exp?: number; iss?: string };
      if (c.iss !== "https://shopfront-agent.onrender.com") return "bad_issuer";
      if (c.aud !== store) return "wrong_store";
      if (!c.exp || c.exp * 1000 < Date.now()) return "expired";
      return "ok";
    };
    const now = Math.floor(Date.now() / 1000);
    const good = mint({ iss: "https://shopfront-agent.onrender.com", aud: "juniper_clay", sub: "cart-agent", iat: now, exp: now + 600 });
    const expired = mint({ iss: "https://shopfront-agent.onrender.com", aud: "juniper_clay", sub: "cart-agent", iat: now - 900, exp: now - 300 });
    const parts = good.split(".");
    const tampered = `${parts[0]}.${b64({ iss: "https://shopfront-agent.onrender.com", aud: "fern_and_loom", sub: "cart-agent", exp: now + 600 })}.${parts[2]}`;
    const jwk = createPublicKey(publicKey.export({ type: "spki", format: "pem" })).export({ format: "jwk" });
    const r = { right: check(good, "juniper_clay"), otherStore: check(good, "fern_and_loom"), expired: check(expired, "juniper_clay"), tampered: check(tampered, "fern_and_loom"), jwkKty: jwk.kty };
    record("C2 store-bound RS256 JWT", r.right === "ok" && r.otherStore === "wrong_store" && r.expired === "expired" && r.tampered === "bad_signature" && r.jwkKty === "RSA", r);
  }

  const seller2 = (await db.query("select paypal_merchant_id m from sellers where handle = 'fern_and_loom'")).rows[0]?.m as string | undefined;
  const kinds: Array<{ name: string; payee?: { merchant_id: string } }> = [{ name: "platform" }, { name: "direct", payee: seller2 ? { merchant_id: seller2 } : undefined }];
  for (const [i, k] of kinds.entries()) {
    const capId = i === 0 ? "C3" : "C5";
    const voidId = i === 0 ? "C4" : "C6";
    if (k.name === "direct" && !k.payee) {
      record(`${capId} direct payee`, false, "Fern & Loom has no verified merchant id");
      continue;
    }
    // Authorize at checkout, capture "on ship".
    try {
      const a = await authorized(browser, `${k.name}-capture`, k.payee);
      const detail: Record<string, unknown> = { order: a.orderId, authorize: `${a.authStatus} ${a.authorization?.status ?? a.authIssue ?? ""}`.trim(), authDebug: a.authDebug, authorizationId: a.authorization?.id, expires: a.authorization?.expiration_time, payee: a.payee };
      let ok = Boolean(a.authorization && a.authorization.status === "CREATED");
      if (a.authorization) {
        const got = await pp("GET", `/v2/payments/authorizations/${a.authorization.id}`);
        detail.getAuthorization = `${got.status} ${(got.json.status as string) ?? issue(got.json)}`;
        const cap = await pp("POST", `/v2/payments/authorizations/${a.authorization.id}/capture`, { final_capture: true }, `spike-c-capture-${a.run}`);
        detail.captureOnShip = `${cap.status} ${(cap.json.status as string) ?? issue(cap.json)}`;
        detail.captureDebug = cap.debugId;
        detail.captureId = cap.json.id;
        detail.capturePayee = (cap.json.payee as { merchant_id?: string } | undefined)?.merchant_id;
        ok &&= cap.status === 201 || cap.status === 200;
        ok &&= cap.json.status === "COMPLETED";
        if (cap.json.id) {
          const ref = await pp("POST", `/v2/payments/captures/${cap.json.id}/refund`, { amount: { currency_code: "USD", value: "12.00" }, note_to_payer: "Spike C test refund" }, `spike-c-refund-${a.run}`);
          detail.refundByApp = `${ref.status} ${(ref.json.status as string) ?? issue(ref.json)}`;
          detail.refundDebug = ref.debugId;
        }
      }
      record(`${capId} ${k.name}: authorize at checkout → capture on ship`, ok, detail);
    } catch (err) {
      record(`${capId} ${k.name}: authorize at checkout → capture on ship`, false, err instanceof Error ? err.message.split("\n")[0] : String(err));
    }
    // Authorize, then void before shipping.
    try {
      const a = await authorized(browser, `${k.name}-void`, k.payee);
      const detail: Record<string, unknown> = { order: a.orderId, authorize: `${a.authStatus} ${a.authorization?.status ?? a.authIssue ?? ""}`.trim(), authorizationId: a.authorization?.id, payee: a.payee };
      let ok = Boolean(a.authorization);
      if (a.authorization) {
        const v = await pp("POST", `/v2/payments/authorizations/${a.authorization.id}/void`, undefined, `spike-c-void-${a.run}`);
        const got = await pp("GET", `/v2/payments/authorizations/${a.authorization.id}`);
        detail.void = `${v.status} ${v.status >= 300 ? issue(v.json) : ""}`.trim();
        detail.voidDebug = v.debugId;
        detail.after = got.json.status;
        ok &&= (v.status === 204 || v.status === 200) && got.json.status === "VOIDED";
      }
      record(`${voidId} ${k.name}: authorize → void before shipping`, ok, detail);
    } catch (err) {
      record(`${voidId} ${k.name}: authorize → void before shipping`, false, err instanceof Error ? err.message.split("\n")[0] : String(err));
    }
  }
} finally {
  await browser.close();
  await db.end();
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  log(`${results.filter((r) => r.ok).length}/${results.length} passed`);
}
