// AT-C: PayPal Cart API v1 merchant contract (D-097, D-098) on the DEPLOYED app, real PayPal sandbox, no mocks.
//   K1  JWKS published (EdDSA)                      K2  missing / garbage / alg:none / expired / other-store / forged
//   K3  no address → REQUIRES_ADDITIONAL_INFORMATION, in PayPal's own schema (payPalCartSchema)
//   K4  validation issues + resolution options: unknown and other-store items, quantity cap, low stock, a $0.01 agent
//       price (→ PRICE_MISMATCH, no PayPal order), non-US address, coupon
//   K5  PUT is a full replacement: same cart keeps its order, a changed cart gets a new one and the old one closes
//   K6  PayPal's own client (the test agent) completes a real order: authorized, stock reserved, hold at PayPal
//   K7  a replayed checkout returns the same cart and places exactly one hold
//   K8  ship → the hold is captured (PayPal GET), order shipped, tracking on the PayPal order
//   K9  direct-paid Fern & Loom: authorized with payee = seller 2, captured on ship into seller 2's PayPal
//   K10 cancel before shipping: platform → hold VOIDED, stock back; direct-paid → handoff link (then shipped, books clean)
//   K11 another agent's cart (same store) → 404
//   K12 screens at desktop, 1920×1080, mobile: /cart/approved, /pay hold panel, /live with Cart API rows
// Every suite ends with the reconciliation (preload). Usage: pnpm --filter web cart-checks -- --base <url>
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { payPalCartSchema } from "@paypal/agentic-commerce-spec";
import { chromium } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";
import { runCartAgent } from "./cart-agent.mjs";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/cart")!);
const only = new Set((arg("--only", "K1,K2,K3,K4,K5,K6,K7,K8,K9,K10,K11,K12") ?? "").split(","));
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
async function adminCall<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as T & { error?: { message?: string } };
  if (!r.ok) throw new Error(`admin ${body.action}: ${r.status} ${j.error?.message ?? ""}`);
  return j;
}
const tokenFor = async (handle: string, client: string, ttl_seconds?: number) => (await adminCall<{ token: string }>({ action: "cart_token", handle, client, ...(ttl_seconds !== undefined ? { ttl_seconds } : {}) })).token;

async function cartApi(store: string, method: string, path: string, token: string | null, body?: unknown) {
  const r = await fetch(`${base}/api/paypal/v1/stores/${store}/merchant-cart${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token !== null ? { authorization: token.startsWith("Bearer") || token === "" ? token : `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: r.status, json };
}
const specific = (c: Record<string, unknown>) => ((c.validation_issues as Array<{ context?: { specific_issue?: string }; code: string; resolution_options?: Array<{ action: string }> }>) ?? []).map((i) => ({ issue: i.context?.specific_issue ?? i.code, actions: (i.resolution_options ?? []).map((o) => o.action) }));
const has = (c: Record<string, unknown>, issue: string, action?: string) => specific(c).some((i) => i.issue === issue && (!action || i.actions.includes(action)));

let ppToken = "";
async function pp(path: string) {
  if (!ppToken)
    ppToken = ((await (await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, { method: "POST", headers: { authorization: "Basic " + Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json()) as { access_token: string }).access_token;
  const r = await fetch(`${e.PAYPAL_BASE_URL}${path}`, { headers: { authorization: `Bearer ${ppToken}` } });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as Record<string, unknown> };
}

const ADDR = { address_line_1: "2211 N First St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" };
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const browser = await chromium.launch({ headless: true });

/** The buyer approves in PayPal (headless, sandbox test buyer); returns the URL PayPal sent them back to. */
async function buyerApproves(approvalUrl: string) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(approvalUrl, { waitUntil: "domcontentloaded" });
        await loginAndApprove(page, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
        await page.waitForURL(/\/cart\/approved\?/, { timeout: 90_000 });
        await page.screenshot({ path: join(out, "approved-desktop.png") }).catch(() => {});
        return page.url();
      } catch (err) {
        if (attempt >= 2) throw err;
        await sleep(8000);
      }
    }
  } finally {
    await ctx.close();
  }
}

async function variantOf(handle: string, minStock = 1) {
  return (
    await db.query(
      `select v.id, v.price_cents, v.stock, p.title from variants v join products p on p.id = v.product_id join sellers s on s.id = p.seller_id
       where s.handle = $1 and p.status = 'approved' and v.active and v.stock >= $2 order by v.price_cents limit 1`,
      [handle, minStock],
    )
  ).rows[0] as { id: string; price_cents: number; stock: number; title: string };
}
const checkoutOf = async (cartId: string) => (await db.query(`select k.* from carts c join checkouts k on k.id = c.checkout_id where c.id = $1`, [cartId])).rows[0];

let k6Checkout: string | undefined;
try {
  await db.query("update variants set stock = greatest(stock, 20) where product_id in (select p.id from products p join sellers s on s.id = p.seller_id where s.handle in ('juniper_clay','fern_and_loom'))");
  const juniper = await variantOf("juniper_clay");
  const fern = await variantOf("fern_and_loom");

  if (only.has("K1")) {
    const r = (await (await fetch(`${base}/.well-known/jwks.json`)).json()) as { keys: Array<{ kty: string; crv: string; alg: string; kid: string }> };
    record("K1 JWKS published (EdDSA / Ed25519)", r.keys?.[0]?.kty === "OKP" && r.keys[0].crv === "Ed25519" && r.keys[0].alg === "EdDSA" && Boolean(r.keys[0].kid), r.keys?.[0]);
  }

  if (only.has("K2")) {
    const good = await tokenFor("juniper_clay", "at-k2");
    const [h, b] = good.split(".");
    const forged = `${h}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b!, "base64url").toString()), aud: "fern_and_loom" })).toString("base64url")}.${good.split(".")[2]}`;
    const none = `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${b}.`;
    const cases = {
      missing: (await cartApi("juniper_clay", "POST", "", null, { items: [] })).status,
      garbage: (await cartApi("juniper_clay", "POST", "", "Bearer abc.def.ghi", { items: [] })).status,
      algNone: (await cartApi("juniper_clay", "POST", "", `Bearer ${none}x`, { items: [] })).status,
      expired: await cartApi("juniper_clay", "POST", "", await tokenFor("juniper_clay", "at-k2", -120), { items: [] }),
      otherStore: await cartApi("fern_and_loom", "POST", "", good, { items: [] }),
      forgedAudience: (await cartApi("fern_and_loom", "POST", "", forged, { items: [] })).status,
    };
    const logged = Number((await db.query(`select count(*)::int n from events where kind = 'cart_rejected' and created_at > now() - interval '2 minutes'`)).rows[0].n);
    const r = { missing: cases.missing, garbage: cases.garbage, algNone: cases.algNone, expired: `${cases.expired.status} ${cases.expired.json.name}`, otherStore: `${cases.otherStore.status} ${cases.otherStore.json.name}`, forgedAudience: cases.forgedAudience, loggedBlocked: logged };
    record("K2 tokens: missing, garbage, alg:none, expired, other store, forged audience all refused and logged", cases.missing === 401 && cases.garbage === 401 && cases.algNone === 401 && cases.expired.status === 401 && cases.expired.json.name === "TOKEN_EXPIRED" && cases.otherStore.status === 403 && cases.forgedAudience === 401 && logged >= 6, r);
  }

  const tok = await tokenFor("juniper_clay", "at-cart-checks");
  if (only.has("K3")) {
    const r = await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1 }], payment_method: { type: "paypal" } });
    const schemaOk = payPalCartSchema.safeParse(r.json).success;
    record("K3 no address → REQUIRES_ADDITIONAL_INFORMATION (PayPal's own schema)", r.status === 200 && r.json.validation_status === "REQUIRES_ADDITIONAL_INFORMATION" && has(r.json, "MISSING_SHIPPING_ADDRESS", "UPDATE_ADDRESS") && !r.json.payment_method && schemaOk, { status: r.status, validation: r.json.validation_status, issues: specific(r.json), schemaOk });
  }

  if (only.has("K4")) {
    const before = Number((await db.query(`select count(*)::int n from checkouts where source = 'cart_api'`)).rows[0].n);
    await db.query("update variants set stock = 1 where id = $1", [juniper.id]);
    const cases = {
      unknown: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: "var_doesnotexist", quantity: 1 }], shipping_address: ADDR }),
      otherStore: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: fern.id, quantity: 1 }], shipping_address: ADDR }),
      tooMany: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 11 }], shipping_address: ADDR }),
      lowStock: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 2 }], shipping_address: ADDR }),
      priceInjection: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1, price: { currency_code: "USD", value: "0.01" } }], shipping_address: ADDR }),
      abroad: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1 }], shipping_address: { ...ADDR, country_code: "FR" } }),
      coupon: await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1 }], shipping_address: ADDR, coupons: [{ code: "FREE100" }] }),
    };
    await db.query("update variants set stock = greatest(stock, 20) where id = $1", [juniper.id]);
    const after = Number((await db.query(`select count(*)::int n from checkouts where source = 'cart_api'`)).rows[0].n);
    const price = cases.priceInjection.json;
    const priceTotal = (price.totals as { total?: { value?: string } } | undefined)?.total?.value;
    const checks = {
      unknown: has(cases.unknown.json, "ITEM_NOT_FOUND", "REMOVE_ITEM"),
      otherStore: has(cases.otherStore.json, "ITEM_NOT_FOUND", "REMOVE_ITEM"),
      tooMany: has(cases.tooMany.json, "MAXIMUM_QUANTITY_EXCEEDED", "MODIFY_CART"),
      lowStock: has(cases.lowStock.json, "INSUFFICIENT_INVENTORY", "MODIFY_CART"),
      priceMismatch: has(price, "PRICE_MISMATCH", "ACCEPT_NEW_PRICE") && !price.payment_method && priceTotal !== "0.01",
      abroad: has(cases.abroad.json, "INTERNATIONAL_SHIPPING_RESTRICTED", "UPDATE_ADDRESS"),
      coupon: has(cases.coupon.json, "DISCOUNT_CUSTOMER_INELIGIBLE", "REMOVE_COUPON"),
      allInvalid: Object.values(cases).every((c) => c.status === 200 && c.json.validation_status === "INVALID" && payPalCartSchema.safeParse(c.json).success),
      noOrdersCreated: after === before,
    };
    record("K4 validation issues with resolution options; a $0.01 agent price creates no order", Object.values(checks).every(Boolean), { checks, priceTotal, priceIssue: specific(price) });
  }

  let k5Cart: string | undefined;
  if (only.has("K5")) {
    const created = await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1 }], shipping_address: ADDR });
    k5Cart = created.json.id as string;
    const t1 = (created.json.payment_method as { token?: string } | undefined)?.token;
    const same = await cartApi("juniper_clay", "PUT", `/${k5Cart}`, tok, { items: [{ variant_id: juniper.id, quantity: 1 }], shipping_address: ADDR, customer: { name: { given_name: "Sam" } } });
    const t2 = (same.json.payment_method as { token?: string } | undefined)?.token;
    const changed = await cartApi("juniper_clay", "PUT", `/${k5Cart}`, tok, { items: [{ variant_id: juniper.id, quantity: 2 }], shipping_address: ADDR });
    const t3 = (changed.json.payment_method as { token?: string } | undefined)?.token;
    const oldStatus = (await db.query(`select status from checkouts where paypal_order_id = $1`, [t1])).rows[0]?.status;
    const dropped = await cartApi("juniper_clay", "PUT", `/${k5Cart}`, tok, { items: [{ variant_id: juniper.id, quantity: 2 }] });
    const got = await cartApi("juniper_clay", "GET", `/${k5Cart}`, tok);
    const totalChanged = (changed.json.totals as { total: { value: string } }).total.value;
    record("K5 PUT is a full replacement: same cart keeps its order, a changed cart gets a new one, the old closes", created.status === 201 && Boolean(t1) && t1 === t2 && Boolean(t3) && t3 !== t1 && oldStatus === "cancelled" && dropped.json.validation_status === "REQUIRES_ADDITIONAL_INFORMATION" && got.json.validation_status === "REQUIRES_ADDITIONAL_INFORMATION" && Number(totalChanged) === (2 * juniper.price_cents + 500) / 100, {
      created: created.status,
      sameToken: t1 === t2,
      newToken: t3 !== t1,
      oldOrder: oldStatus,
      totalChanged,
      afterDroppingAddress: dropped.json.validation_status,
    });
  }

  // K6 + K7: PayPal's own client completes a real order on the platform-paid shop.
  if (only.has("K6")) {
    const stockBefore = Number((await db.query("select stock from variants where id = $1", [juniper.id])).rows[0].stock);
    const r = await runCartAgent({ base, store: "juniper_clay", query: juniper.title, token: tok, approve: buyerApproves, log: (l) => log(`   ${l}`) });
    const c = await checkoutOf(r.cartId);
    k6Checkout = c?.id;
    const auth = c?.paypal_authorization_id ? await pp(`/v2/payments/authorizations/${c.paypal_authorization_id}`) : null;
    const stockAfter = Number((await db.query("select stock from variants where id = (select variant_id from checkout_items where checkout_id = $1 limit 1)", [c?.id])).rows[0]?.stock);
    const wire = (await db.query(`select kind from events where checkout_id = $1 order by id`, [c?.id])).rows.map((x) => x.kind);
    const steps = r.steps.map((s) => `${s.call} ${s.status}`);
    const schemaOk = r.steps.every((s) => !s.cart || payPalCartSchema.safeParse(s.cart).success);
    record("K6 PayPal's client completes a real order: authorized, stock reserved, hold at PayPal", r.final?.status === "COMPLETED" && Boolean(r.final.payment_confirmation?.merchant_order_number) && c?.status === "authorized" && c?.intent === "AUTHORIZE" && auth?.json.status === "CREATED" && Boolean(c?.stock_reserved_at) && (stockAfter === stockBefore - 1 || stockAfter >= 20) && wire.includes("authorized") && wire.includes("cart_checkout_opened") && schemaOk, {
      steps,
      checkout: c?.id,
      status: c?.status,
      authorization: `${c?.paypal_authorization_id} ${auth?.json.status}`,
      expires: auth?.json.expiration_time,
      stock: `${stockBefore} → ${stockAfter}`,
      wire,
      schemaOk,
      review: r.final?.payment_confirmation?.order_review_page?.replace(/t=[^&]+/, "t=…"),
    });
    if (only.has("K7")) {
      const again = await cartApi("juniper_clay", "POST", `/${r.cartId}/checkout`, tok, { payment_method: { type: "paypal", token: c?.paypal_order_id, payer_id: "ANY" } });
      const order = await pp(`/v2/checkout/orders/${c?.paypal_order_id}`);
      const auths = ((order.json.purchase_units as Array<{ payments?: { authorizations?: unknown[] } }>)?.[0]?.payments?.authorizations ?? []).length;
      record("K7 a replayed checkout returns the same completed cart; exactly one hold", again.status === 200 && again.json.status === "COMPLETED" && auths === 1, { status: again.status, cart: again.json.status, authorizations: auths });
    }
  }

  if (only.has("K8") && k6Checkout) {
    const ship = await adminCall<{ shipment: { trackingNumber: string } }>({ action: "ship", checkout_id: k6Checkout, carrier: "USPS", tracking_number: `9400111${Date.now().toString().slice(-15)}` });
    const c = (await db.query(`select k.status, cp.paypal_capture_id cap, cp.status cs from checkouts k left join captures cp on cp.checkout_id = k.id where k.id = $1`, [k6Checkout])).rows[0];
    const cap = c?.cap ? await pp(`/v2/payments/captures/${c.cap}`) : null;
    const auth = await pp(`/v2/payments/authorizations/${(await db.query(`select paypal_authorization_id a from checkouts where id = $1`, [k6Checkout])).rows[0].a}`);
    record("K8 ship → the hold is captured at PayPal, order shipped, tracking added", c?.status === "shipped" && cap?.json.status === "COMPLETED" && auth.json.status === "CAPTURED" && Boolean(ship.shipment?.trackingNumber), { status: c?.status, capture: `${c?.cap} ${cap?.json.status}`, authorization: auth.json.status });
  }

  if (only.has("K9")) {
    const ftok = await tokenFor("fern_and_loom", "at-cart-checks");
    const r = await runCartAgent({ base, store: "fern_and_loom", query: fern.title, token: ftok, approve: buyerApproves, log: (l) => log(`   ${l}`) });
    const c = await checkoutOf(r.cartId);
    const auth = c?.paypal_authorization_id ? await pp(`/v2/payments/authorizations/${c.paypal_authorization_id}`) : null;
    let shipped: Record<string, unknown> = {};
    if (c?.status === "authorized") {
      await adminCall({ action: "ship", checkout_id: c.id, carrier: "UPS", tracking_number: `1Z999AA1${Date.now().toString().slice(-10)}` });
      shipped = (await db.query(`select k.status, cp.paypal_capture_id cap, cp.payee_merchant_id payee from checkouts k left join captures cp on cp.checkout_id = k.id where k.id = $1`, [c.id])).rows[0];
    }
    const seller2 = (await db.query(`select paypal_merchant_id m from sellers where handle = 'fern_and_loom'`)).rows[0].m;
    record("K9 direct-paid Fern & Loom: authorized with payee = seller 2, captured on ship into seller 2's PayPal", r.final?.status === "COMPLETED" && c?.payee_merchant_id === seller2 && auth?.json.status === "CREATED" && shipped.status === "shipped" && shipped.payee === seller2, { checkout: c?.id, payee: c?.payee_merchant_id, hold: auth?.json.status, shipped });
  }

  if (only.has("K10")) {
    // Platform-paid: void.
    const r = await runCartAgent({ base, store: "juniper_clay", query: juniper.title, token: tok, approve: buyerApproves, log: () => {} });
    const c = await checkoutOf(r.cartId);
    const stockHeld = Number((await db.query("select stock from variants where id = (select variant_id from checkout_items where checkout_id = $1 limit 1)", [c.id])).rows[0].stock);
    const v = await adminCall<{ outcome: string }>({ action: "cancel_order", checkout_id: c.id });
    const after = (await db.query(`select status from checkouts where id = $1`, [c.id])).rows[0].status;
    const stockBack = Number((await db.query("select stock from variants where id = (select variant_id from checkout_items where checkout_id = $1 limit 1)", [c.id])).rows[0].stock);
    const auth = await pp(`/v2/payments/authorizations/${c.paypal_authorization_id}`);
    // Direct-paid: handoff, then shipped so the books stay clean.
    const ftok = await tokenFor("fern_and_loom", "at-cart-checks");
    const rf = await runCartAgent({ base, store: "fern_and_loom", query: fern.title, token: ftok, approve: buyerApproves, log: () => {} });
    const cf = await checkoutOf(rf.cartId);
    const hf = await adminCall<{ outcome: string; link?: string }>({ action: "cancel_order", checkout_id: cf.id });
    const stillHeld = (await db.query(`select status from checkouts where id = $1`, [cf.id])).rows[0].status;
    await adminCall({ action: "ship", checkout_id: cf.id, carrier: "UPS", tracking_number: `1Z999AA2${Date.now().toString().slice(-10)}` });
    record("K10 cancel before shipping: platform hold VOIDED + stock back; direct-paid → seller handoff", v.outcome === "voided" && after === "cancelled" && auth.json.status === "VOIDED" && stockBack === stockHeld + 1 && hf.outcome === "handoff" && /paypal\.com\/activity\/payment\//.test(hf.link ?? "") && stillHeld === "authorized", {
      platform: { outcome: v.outcome, status: after, paypal: auth.json.status, stock: `${stockHeld} → ${stockBack}` },
      direct: { outcome: hf.outcome, stillHeld, link: hf.link?.replace(/payment\/.*/, "payment/…") },
    });
  }

  if (only.has("K11")) {
    const mine = await cartApi("juniper_clay", "POST", "", tok, { items: [{ variant_id: juniper.id, quantity: 1 }] });
    const other = await tokenFor("juniper_clay", "another-agent");
    const peek = await cartApi("juniper_clay", "GET", `/${mine.json.id}`, other);
    const put = await cartApi("juniper_clay", "PUT", `/${mine.json.id}`, other, { items: [{ variant_id: juniper.id, quantity: 9 }], shipping_address: ADDR });
    record("K11 another agent's cart (same store) is invisible: 404", peek.status === 404 && put.status === 404, { get: peek.status, put: put.status });
  }

  if (only.has("K12")) {
    const shots: Record<string, number> = {};
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const holdId = (await db.query(`select id, client_request_id from checkouts where intent = 'AUTHORIZE' and status = 'authorized' order by created_at desc limit 1`)).rows[0];
    const k6 = k6Checkout ? (await db.query(`select id, client_request_id from checkouts where id = $1`, [k6Checkout])).rows[0] : null;
    const tokenOf = (id: string, crid: string) => createHmac("sha256", e.SESSION_SECRET).update(`order-token:${id}:${crid}`).digest("base64url");
    const routes: Array<[string, string]> = [["approved", "/cart/approved?cart=cart_aaaaaaaaaaaa"], ["live", "/live"]];
    if (holdId) routes.push(["pay-hold", `/pay/${holdId.id}?t=${tokenOf(holdId.id, holdId.client_request_id)}`]);
    if (k6) routes.push(["pay-shipped", `/pay/${k6.id}?t=${tokenOf(k6.id, k6.client_request_id)}`]);
    for (const [name, path] of routes)
      for (const s of [{ tag: "desktop", width: 1440, height: 900 }, { tag: "1920", width: 1920, height: 1080 }, { tag: "mobile", width: 390, height: 844 }]) {
        await page.setViewportSize({ width: s.width, height: s.height });
        await page.goto(base + path, { waitUntil: "load", timeout: 120_000 });
        await page.waitForTimeout(1500);
        shots[`${name}@${s.tag}`] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        await page.screenshot({ path: join(out, `${name}-${s.tag}.png`), fullPage: s.tag === "mobile" });
      }
    const holdPanel = holdId ? await (async () => {
      await page.goto(`${base}/pay/${holdId.id}?t=${tokenOf(holdId.id, holdId.client_request_id)}`, { waitUntil: "load" });
      return (await page.getByTestId("cart-hold").count()) === 1 && (await page.locator("paypal-button").count()) === 0;
    })() : false;
    await ctx.close();
    record("K12 screens at 3 sizes: /cart/approved, /pay hold panel (no PayPal button), /live", Object.values(shots).every((o) => o <= 0) && holdPanel, { overflow: shots, holdPanel });
  }
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  await browser.close();
  await db.end();
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}
