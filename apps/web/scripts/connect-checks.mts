// Phase 9 screens + Log in with PayPal (walkthrough #10, D-084) on the DEPLOYED app, real PayPal sandbox:
//   C1  the demo shop's Get paid card says it is paid into the platform account (and why)
//   C2  "Try Log in with PayPal" → PayPal sign-in as sandbox seller 2 → back on the Studio: the card shows the account
//       PayPal confirmed; the demo shop is NOT rerouted
//   C3  replaying that return link is refused (single-use state)
//   C4  an unverified payout email is refused before any order is created (SELLER_NOT_READY)
//   C5  connecting Fern & Loom with Log in with PayPal verifies it: payer id = the merchant PayPal pays (B83JSV9ELHV74);
//       its next checkout names that merchant as payee; /pay, the storefront and the live wire say "paid directly"
// Credentials come from .env and are never printed. Usage: pnpm --filter web connect-checks -- --base https://…
import { randomUUID } from "node:crypto";
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/connect")!);
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
const SELLER2_MERCHANT = "B83JSV9ELHV74";
const skipLipp = args.includes("--skip-lipp");
const seller2 = { email: e.SANDBOX_SELLER2_EMAIL, password: e.SANDBOX_SELLER2_PASSWORD };
if (!seller2.email || !seller2.password) throw new Error("SANDBOX_SELLER2_EMAIL / _PASSWORD missing in .env");
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
const adminCall = async (body: unknown) => (await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify(body) })).json();

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const mcp = new Client({ name: "connect-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
async function tool(name: string, a: Record<string, unknown>) {
  const r = await mcp.callTool({ name, arguments: a });
  return { isError: Boolean(r.isError), text: (r.content as Array<{ text?: string }>)[0]?.text ?? "" };
}

/** PayPal's Log in with PayPal pages: email → (next) → password → log in → consent (if asked). */
async function paypalSignIn(page: Page, shot: string) {
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: join(out, `${shot}-1-paypal.png`) });
  const email = page.locator("#email, input[name='login_email']").first();
  await email.waitFor({ timeout: 45_000 });
  await email.fill(seller2.email);
  const next = page.locator("#btnNext");
  if (await next.isVisible().catch(() => false)) await next.click();
  const pw = page.locator("#password, input[name='login_password']").first();
  await pw.waitFor({ timeout: 30_000 });
  await pw.fill(seller2.password);
  await page.getByRole("button", { name: /^log ?in$/i }).click();
  // Consent screen (first time per app/user); then PayPal redirects to our Return URL.
  for (let i = 0; i < 20 && !page.url().startsWith(base); i++) {
    const agree = page.getByRole("button", { name: /agree|continue|consent|allow/i }).first();
    if (await agree.isVisible().catch(() => false)) {
      await page.screenshot({ path: join(out, `${shot}-2-consent.png`) });
      await agree.click().catch(() => {});
    }
    await sleep(1500);
  }
  await page.waitForURL((u) => u.toString().startsWith(base), { timeout: 60_000 });
}

const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
  const cont = page.getByRole("button", { name: /^continue as/i });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await page.getByTestId("get-paid-card").waitFor({ timeout: 60_000 });
  }
  const card = page.getByTestId("get-paid-card");
  record("C1 demo shop's Get paid card: platform account, explained", (await card.getAttribute("data-status")) === "platform" && /platform/i.test(await card.innerText()), { status: await card.getAttribute("data-status") });
  await card.screenshot({ path: join(out, "C1-get-paid-platform.png") });

  // --skip-lipp: PayPal hasn't accepted our Return URL yet (OWNER-TODO #4). Skip every step that needs Log in with
  // PayPal, including C4, which would unverify fern_and_loom with no way to verify it again.
  if (!skipLipp) {
  // C2: real Log in with PayPal from the card (the demo shop is only checked, never rerouted).
  let returnUrl = "";
  page.on("request", (r) => {
    if (r.url().includes("/api/seller/paypal/return")) returnUrl = r.url();
  });
  await card.getByTestId("connect-paypal").click();
  await paypalSignIn(page, "C2");
  await page.getByTestId("get-paid-result").waitFor({ timeout: 30_000 });
  const result = await page.getByTestId("get-paid-result").innerText();
  const cardText = await page.getByTestId("get-paid-card").innerText();
  const juniper = (await db.query("select payout_status from sellers where handle='juniper_clay'")).rows[0];
  const fields = (await db.query("select data->'fields' f from events where kind='payout_identity_checked' order by id desc limit 1")).rows[0]?.f;
  await page.getByTestId("get-paid-card").screenshot({ path: join(out, "C2-get-paid-checked.png") });
  await page.screenshot({ path: join(out, "C2-studio-after-connect-desktop.png") });
  record("C2 Log in with PayPal returns the account PayPal confirmed; demo shop not rerouted", /confirmed the account/i.test(result) && cardText.includes(SELLER2_MERCHANT) && juniper.payout_status === "platform", { result, merchantShown: cardText.includes(SELLER2_MERCHANT), juniper: juniper.payout_status, userinfoFields: fields });

  // C3: the same return link again → refused.
  if (returnUrl) {
    await page.goto(returnUrl, { waitUntil: "load" });
    const again = await page.getByTestId("get-paid-result").innerText().catch(() => "");
    record("C3 a replayed return link is refused", /expired or was already used/i.test(again), { again });
  } else record("C3 a replayed return link is refused", false, "no return URL captured");

  // C5: connect Fern & Loom with Log in with PayPal (admin link: it has no studio login).
  const { url } = (await adminCall({ action: "connect_url", handle: "fern_and_loom" })) as { url: string };
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const p2 = await ctx2.newPage();
  await p2.goto(url, { waitUntil: "domcontentloaded" });
  await paypalSignIn(p2, "C5");
  await sleep(1500);
  const fern = (await db.query("select payout_status, paypal_merchant_id from sellers where handle='fern_and_loom'")).rows[0];
  const via = (await db.query("select data->>'via' via from events where kind='payout_verified' and seller_id=(select id from sellers where handle='fern_and_loom') order by id desc limit 1")).rows[0]?.via;
  await ctx2.close();
  const ck = await tool("create_checkout", { items: [{ variant_id: "var_indigo400000", quantity: 1 }], client_request_id: randomUUID() });
  const ckj = ck.isError ? null : (JSON.parse(ck.text) as { checkout_id: string; pay_url: string });
  const row = ckj ? (await db.query("select payee_merchant_id from checkouts where id=$1", [ckj.checkout_id])).rows[0] : null;
  const summary = ckj ? (await db.query("select summary from events where checkout_id=$1 and kind='order_created'", [ckj.checkout_id])).rows[0]?.summary : null;
  let payText = "";
  let storeText = "";
  if (ckj) {
    await page.goto(ckj.pay_url, { waitUntil: "load" });
    payText = await page.getByTestId("paid-to").innerText();
    await page.screenshot({ path: join(out, "C5-pay-paid-directly-desktop.png") });
    await page.goto(`${base}/s/fern_and_loom`, { waitUntil: "load" });
    storeText = await page.getByTestId("storefront-paid-to").innerText();
    await page.screenshot({ path: join(out, "C5-storefront-fern-desktop.png") });
  }
  record(
    "C5 Log in with PayPal verifies Fern & Loom; next order pays that merchant; /pay, storefront, wire say so",
    fern.payout_status === "verified" && fern.paypal_merchant_id === SELLER2_MERCHANT && via === "log_in_with_paypal" && row?.payee_merchant_id === SELLER2_MERCHANT && /paid directly/i.test(String(summary)) && /directly to Fern/i.test(payText) && /paid directly to Fern/i.test(storeText),
    { fern, via, payee: row?.payee_merchant_id, summary, payText, storeText },
  );
  // C4: unverified email → refused before any order.
  await adminCall({ action: "set_payout", handle: "fern_and_loom", account: "not-a-paypal-account@example.com" });
  const before = Number((await db.query("select count(*)::int n from checkouts c join sellers s on s.id=c.seller_id where s.handle='fern_and_loom'")).rows[0].n);
  const refused = await tool("create_checkout", { items: [{ variant_id: "var_indigo400000", quantity: 1 }], client_request_id: randomUUID() });
  const after = Number((await db.query("select count(*)::int n from checkouts c join sellers s on s.id=c.seller_id where s.handle='fern_and_loom'")).rows[0].n);
  record("C4 unverified payout email: refused before any order (SELLER_NOT_READY)", refused.isError && /SELLER_NOT_READY/.test(refused.text) && after === before, { refused: refused.text.slice(0, 120), checkoutsBefore: before, checkoutsAfter: after });

  // Restore: connect Fern & Loom again so it keeps selling (an unverified seller can't be paid any more, D-084).
  {
    const { url: again } = (await adminCall({ action: "connect_url", handle: "fern_and_loom" })) as { url: string };
    const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const p3 = await ctx3.newPage();
    await p3.goto(again, { waitUntil: "domcontentloaded" });
    await paypalSignIn(p3, "C6");
    await ctx3.close();
    const f = (await db.query("select payout_status, paypal_merchant_id from sellers where handle='fern_and_loom'")).rows[0];
    record("C6 Fern & Loom reconnected (verified again)", f.payout_status === "verified" && f.paypal_merchant_id === SELLER2_MERCHANT, f);
  }

  }

  // C7: a real paid order lands in seller 2's PayPal (the capture names seller 2 as payee), so Fern & Loom sells again.
  {
    await db.query("update variants set stock = greatest(stock, 20) where id = 'var_indigo400000'");
    const ck7 = await tool("create_checkout", { items: [{ variant_id: "var_indigo400000", quantity: 1 }], client_request_id: randomUUID() });
    if (ck7.isError) {
      record("C7 a paid Fern & Loom order lands in seller 2's PayPal", false, { error: ck7.text.slice(0, 160) });
    } else {
      const c7 = JSON.parse(ck7.text) as { checkout_id: string; paypal_order_id: string };
      const tok = await (await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, { method: "POST", headers: { authorization: "Basic " + Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
      const order = await (await fetch(`${e.PAYPAL_BASE_URL}/v2/checkout/orders/${c7.paypal_order_id}`, { headers: { authorization: `Bearer ${tok.access_token}` } })).json();
      const href = (order.links as Array<{ rel: string; href: string }>).find((l) => l.rel === "payer-action")!.href;
      const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 860 } });
      const p4 = await ctx4.newPage();
      for (let attempt = 1; ; attempt++) {
        try {
          await p4.goto(href, { waitUntil: "domcontentloaded" });
          await loginAndApprove(p4, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
          await p4.waitForURL(/\/pay\/chk_/, { timeout: 90_000 });
          break;
        } catch (err) {
          if (attempt >= 2) throw err;
          await sleep(8000);
        }
      }
      await p4.screenshot({ path: join(out, "C7-fern-paid-desktop.png") });
      await ctx4.close();
      let cap: { status: string; payee_merchant_id: string | null } | undefined;
      for (let i = 0; i < 20 && !cap; i++) {
        cap = (await db.query("select c.status, k.payee_merchant_id from checkouts c join captures k on k.checkout_id = c.id where c.id = $1", [c7.checkout_id])).rows[0];
        if (!cap) await sleep(2000);
      }
      record("C7 a paid Fern & Loom order lands in seller 2's PayPal", cap?.status === "paid" && cap?.payee_merchant_id === SELLER2_MERCHANT, { checkout: c7.checkout_id, capture: cap });
    }
  }
} catch (err) {
  for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: join(out, `_error-${i}.png`) }).catch(() => {});
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await mcp.close().catch(() => {});
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
