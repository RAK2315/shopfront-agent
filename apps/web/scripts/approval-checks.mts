// Approval + refund re-walk (walkthrough #13, #12; FEEDBACK.md steps 2 and 7), on the DEPLOYED app, real PayPal sandbox:
//   AP1  the owner's exact path: /shop chat → "Review and pay with PayPal" (new tab) → PayPal button → popup approval
//        → paid; then a refund asked in the same chat → the seller's policy (or the seller) → a real PayPal refund
//   AP2  the redirect path: PayPal's own approve link (what an agent without our page hands out) → PayPal login →
//        /pay/return → captured → /pay shows paid
//   AP3  redirect cancel: "Cancel and return" on PayPal → /pay?cancelled=1 says nothing was charged; still `created`
//   AP4  dead ends: /pay without or with a wrong token, a bad return link and an unknown route → branded pages, 404
// Usage: pnpm --filter web approval-checks -- --base https://shopfront-agent.onrender.com [--only AP1,AP4] [--out dir]
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import pg from "pg";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/approval")!);
const only = new Set((arg("--only", "AP1,AP2,AP3,AP4") ?? "").split(","));
const e = process.env as Record<string, string>;
const COBALT = "var_cobalt120000";
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });

const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean | "skipped"; detail: unknown }> = [];
const record = (id: string, ok: boolean | "skipped", detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok === true ? "PASS" : ok === "skipped" ? "SKIP" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, timeoutMs: number, everyMs = 3000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(everyMs);
  }
}

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q1 = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as R | undefined;
const paypal = createPayPalApi(new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL, clientId: e.PAYPAL_CLIENT_ID, clientSecret: e.PAYPAL_CLIENT_SECRET }));
const buyer = { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD };

const mcp = new Client({ name: "approval-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
async function tool<T = Record<string, unknown>>(name: string, a: Record<string, unknown>): Promise<T> {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}
type Checkout = { checkout_id: string; pay_url: string; paypal_order_id: string };
const restock = () => db.query("update variants set stock = greatest(stock, 20) where id = $1", [COBALT]);
const newCheckout = () => tool<Checkout>("create_checkout", { items: [{ variant_id: COBALT, quantity: 1 }], client_request_id: randomUUID() });
async function approveLink(orderId: string) {
  const { data } = await paypal.getOrder(orderId);
  const href = (data as { links?: Array<{ rel: string; href: string }> }).links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
  if (!href) throw new Error("PayPal order has no payer-action link");
  return href;
}
const status = (id: string) => q1<{ status: string; capture: string | null }>("select c.status, (select paypal_capture_id from captures where checkout_id = c.id limit 1) as capture from checkouts c where c.id = $1", [id]);

const browser = await chromium.launch({ headless: false, channel: "chromium" }); // PayPal's sandbox login fails headless
async function isolated(id: string, fn: (ctx: BrowserContext) => Promise<void>) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await fn(ctx);
  } catch (err) {
    record(id, false, err instanceof Error ? (err.message.split(/\r?\n/)[0] ?? err.message) : String(err));
    for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: join(out, `_error-${id}-${i}.png`), fullPage: true }).catch(() => {});
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Click the v6 PayPal button and approve in the popup; the sandbox sometimes errors after login, so retry once. */
async function payInPopup(page: Page, shots: { review?: string } = {}) {
  await page.locator('[data-phase="ready"]').waitFor({ timeout: 90_000 });
  await sleep(2500);
  for (let attempt = 1; ; attempt++) {
    const popupP = page.waitForEvent("popup", { timeout: 30_000 });
    await page.locator("paypal-button").click();
    const popup = await popupP.catch(() => null);
    try {
      if (!popup) throw new Error("the PayPal popup did not open");
      await loginAndApprove(popup, buyer, shots);
      await popup.waitForEvent("close", { timeout: 60_000 }).catch(() => {});
      return attempt;
    } catch (err) {
      await popup?.close().catch(() => {});
      if (attempt >= 2) throw err;
      log(`popup attempt ${attempt} failed (${err instanceof Error ? err.message.split("\n")[0] : err}); retrying`);
      await sleep(8000);
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-phase="ready"]').waitFor({ timeout: 90_000 });
    }
  }
}

try {
  // ───────────────────────── AP1: the owner's path, then the refund in the same chat ─────────────────────────
  if (only.has("AP1")) await isolated("AP1", async (ctx) => {
    await restock();
    const shop = await ctx.newPage();
    await shop.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });
    const input = shop.getByTestId("shop-input");
    await input.fill("a blue mug under $40");
    await input.press("Enter");
    const card = shop.getByTestId("checkout-card").last();
    if (!(await card.waitFor({ timeout: 90_000 }).then(() => true, () => false))) {
      await input.fill("Yes, buy one cobalt drip mug please.");
      await input.press("Enter");
      await card.waitFor({ timeout: 90_000 });
    }
    await shop.screenshot({ path: join(out, "AP1-shop-checkout-card.png") });
    const payP = ctx.waitForEvent("page");
    await card.getByTestId("pay-link").click();
    const pay = await payP;
    await pay.waitForLoadState("load");
    const checkoutId = /\/pay\/(chk_[a-z0-9]{12})/.exec(pay.url())?.[1];
    if (!checkoutId) throw new Error(`pay tab is not a pay page: ${pay.url().replace(/t=[^&]+/, "t=…")}`);
    const attempts = await payInPopup(pay);
    await pay.getByText(/^paid$/i).first().waitFor({ timeout: 60_000 }).catch(() => {});
    const s = await until("AP1 paid", async () => { const r = await status(checkoutId); return r && ["paid"].includes(r.status) && r.capture ? r : null; }, 90_000);
    await pay.screenshot({ path: join(out, "AP1-pay-paid.png"), fullPage: true });
    record("AP1a popup approval via /shop", true, { checkoutId, status: s.status, capture: s.capture, popupAttempts: attempts });

    // Refund in the same chat (the web agent holds the order token from create_checkout).
    await shop.bringToFront();
    await input.fill("Please refund that order, the mug arrived chipped.");
    await input.press("Enter");
    const rr = await until("refund request row", () => q1<{ id: string; status: string; decision: string }>("select id, status, decision from refund_requests where checkout_id = $1 order by created_at desc limit 1", [checkoutId]), 120_000);
    await shop.screenshot({ path: join(out, "AP1-shop-refund-asked.png") });
    let via = rr.decision;
    if (rr.status === "pending") {
      // Over the buyer's repeat-refund limit, so the seller decides: approve in the Studio, as a seller would.
      const studio = await ctx.newPage();
      await studio.goto(`${base}/studio`, { waitUntil: "load" });
      const cont = studio.getByRole("button", { name: /^continue as/i });
      if (await cont.isVisible().catch(() => false)) { await cont.click(); await studio.waitForLoadState("load"); await sleep(1500); }
      await studio.goto(`${base}/studio/orders`, { waitUntil: "load" });
      const row = studio.getByTestId("refund-pending").filter({ hasText: "Cobalt" }).first();
      await row.waitFor({ timeout: 30_000 });
      await studio.screenshot({ path: join(out, "AP1-studio-refund-pending.png") });
      await row.getByTestId("refund-approve").click();
      via = "seller_approved_in_studio";
    }
    const done = await until("refund executed", () => q1<{ status: string; paypal_refund_id: string | null }>("select status, paypal_refund_id from refund_requests where id = $1 and status = 'executed' and paypal_refund_id is not null", [rr.id]), 120_000);
    const { data: refund } = await paypal.getRefund(done.paypal_refund_id!);
    await pay.reload({ waitUntil: "load" });
    await pay.getByText(/refund/i).first().waitFor({ timeout: 30_000 }).catch(() => {});
    await pay.screenshot({ path: join(out, "AP1-pay-refunded.png"), fullPage: true });
    record("AP1b refund re-walk", refund.status === "COMPLETED", { refundRequest: rr.id, decision: rr.decision, via, paypalRefundId: done.paypal_refund_id, paypalStatus: refund.status });
  });

  // ───────────────────────── AP2: redirect approval through PayPal's own link ─────────────────────────
  if (only.has("AP2")) await isolated("AP2", async (ctx) => {
    await restock();
    const ck = await newCheckout();
    const page = await ctx.newPage();
    await page.goto(await approveLink(ck.paypal_order_id), { waitUntil: "domcontentloaded", timeout: 90_000 });
    await loginAndApprove(page, buyer, { review: join(out, "AP2-paypal-review.png") });
    await page.waitForURL(new RegExp(`/pay/${ck.checkout_id}\\?t=`), { timeout: 90_000 });
    await page.waitForLoadState("load");
    const s = await until("AP2 paid", async () => { const r = await status(ck.checkout_id); return r?.status === "paid" && r.capture ? r : null; }, 60_000);
    const trig = await q1<{ n: number }>("select count(*)::int n from events where checkout_id = $1 and data::text like '%return_url%'", [ck.checkout_id]);
    await page.screenshot({ path: join(out, "AP2-pay-paid-after-redirect.png"), fullPage: true });
    record("AP2 redirect approval", true, { checkoutId: ck.checkout_id, status: s.status, capture: s.capture, returnUrlEvents: trig?.n, landedOn: new URL(page.url()).pathname });
  });

  // ───────────────────────── AP3: redirect cancel ─────────────────────────
  if (only.has("AP3")) await isolated("AP3", async (ctx) => {
    const ck = await newCheckout();
    const page = await ctx.newPage();
    await page.goto(await approveLink(ck.paypal_order_id), { waitUntil: "domcontentloaded", timeout: 90_000 });
    const cancel = page.locator("a, button").filter({ hasText: /cancel and return|^cancel$/i }).first();
    if (!(await cancel.waitFor({ timeout: 45_000 }).then(() => true, () => false))) {
      await page.screenshot({ path: join(out, "_AP3-no-cancel-link.png") });
      record("AP3 redirect cancel", "skipped", "PayPal's login page shows no cancel link before login in this sandbox build");
      return;
    }
    await cancel.click();
    await page.waitForURL(/cancelled=1/, { timeout: 60_000 });
    await page.getByRole("alert").waitFor({ timeout: 30_000 });
    const msg = await page.getByRole("alert").innerText();
    const s = await status(ck.checkout_id);
    await page.screenshot({ path: join(out, "AP3-pay-cancelled.png"), fullPage: true });
    record("AP3 redirect cancel", s?.status === "created" && /nothing was charged/i.test(msg), { status: s?.status, message: msg });
  });

  // ───────────────────────── AP4: dead ends ─────────────────────────
  if (only.has("AP4")) await isolated("AP4", async (ctx) => {
    const ck = await newCheckout();
    const page = await ctx.newPage();
    const checks: Array<{ name: string; url: string; text: RegExp }> = [
      { name: "no token", url: `/pay/${ck.checkout_id}`, text: /incomplete or expired/i },
      { name: "wrong token", url: `/pay/${ck.checkout_id}?t=AAAAAAAAAAAAAAAAAAAAAAAA`, text: /incomplete or expired/i },
      { name: "bad return link", url: `/pay/return?checkout=${ck.checkout_id}&t=nope&token=${ck.paypal_order_id}`, text: /incomplete or expired/i },
      { name: "unknown route", url: `/no-such-page`, text: /nothing lives at this address/i },
    ];
    const got: Record<string, unknown> = {};
    let ok = true;
    for (const c of checks) {
      const res = await page.goto(base + c.url, { waitUntil: "load" });
      const shown = await page.getByText(c.text).first().isVisible().catch(() => false);
      const leak = await page.getByText(/cobalt|\$\d/i).first().isVisible().catch(() => false); // never show the order
      got[c.name] = { status: res?.status(), branded: shown, leaksOrder: leak };
      ok &&= res?.status() === 404 && shown && !leak;
    }
    await page.goto(`${base}/pay/${ck.checkout_id}`, { waitUntil: "load" });
    await page.screenshot({ path: join(out, "AP4-pay-link-invalid-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: join(out, "AP4-pay-link-invalid-1920.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(out, "AP4-pay-link-invalid-mobile.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.goto(`${base}/no-such-page`, { waitUntil: "load" });
    await page.screenshot({ path: join(out, "AP4-404-mobile.png"), fullPage: true });
    record("AP4 dead ends", ok && overflow <= 0, { ...got, mobileOverflowPx: overflow });
  });
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await mcp.close().catch(() => {});
  await db.end();
  const failed = results.filter((r) => r.ok === false);
  log(`${results.length - failed.length}/${results.length} passed or skipped`);
  process.exit(failed.length ? 1 : 0);
}
