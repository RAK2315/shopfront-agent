// Phase 9 acceptance tests, backend (AT-9 on the Partial path, D-083), against the DEPLOYED app with real PayPal
// sandbox calls and a real seller-side refund in seller 2's own sandbox PayPal (headed browser):
//   P1  connect: before a payout account exists, a checkout is refused before any PayPal call; an email that isn't a
//       PayPal account is handled plainly; then fern_and_loom is connected to seller 2 (unverified)
//   P2  routing: a buyer's agent buys from fern_and_loom → the capture's payee is seller 2, not the platform; seller 2
//       becomes verified from the capture
//   P3  refund handoff: an in-policy refund becomes `handoff` with the deep link, and Shopfront makes 0 refund calls
//   P4  seller 2 refunds in its own PayPal → the verified webhook closes the request with PayPal's refund id and the
//       amount PayPal reports (flagged if it differs); the buyer's order page shows it
//   P5  the GET fallback closes the same kind of request when no webhook is processed (the request is reopened and the
//       admin `handoff_check` runs the fallback now)
// AT-4 #2 and #3 (the platform seller's automatic refunds) are run separately: phase4-checks --only 2,3.
// Usage: pnpm --filter web phase9-checks -- --base https://shopfront-agent.onrender.com [--only P1,P2,P3,P4,P5]
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/phase-9")!);
const only = new Set((arg("--only", "P1,P2,P3,P4,P5") ?? "").split(","));
const e = process.env as Record<string, string>;
const NAPKINS = "var_indigo400000";
const SELLER2_MERCHANT = "B83JSV9ELHV74";
const PLATFORM_MERCHANT = "DY7U9FZDLKJRE";
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
if (!e.SANDBOX_SELLER2_EMAIL || !e.SANDBOX_SELLER2_PASSWORD) throw new Error("SANDBOX_SELLER2_EMAIL / _PASSWORD missing from .env");
mkdirSync(out, { recursive: true });

const t = () => new Date().toISOString().slice(11, 19);
const mask = (s: string) => s.split(e.SANDBOX_SELLER2_EMAIL).join("<seller2>");
const log = (...a: unknown[]) => console.log(mask(`[${t()}] ${a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`));
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail: JSON.parse(mask(JSON.stringify(detail))) });
  log(ok ? "PASS" : "FAIL", id, detail);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, timeoutMs: number, everyMs = 2000): Promise<T> {
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
const adminToken = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
const admin = async (body: Record<string, unknown>) => {
  const r = await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, body: (await r.json()) as Record<string, unknown> };
};

const mcp = new Client({ name: "phase9-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { "x-shopfront-client": "phase9-checks" } } }));
async function tool(name: string, a: Record<string, unknown>) {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
  return { isError: Boolean(r.isError), text, json: (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return null; } })() };
}
const buyNapkins = () => tool("create_checkout", { items: [{ variant_id: NAPKINS, quantity: 1 }], client_request_id: randomUUID() });
const fern = async () => (await q1<{ id: string; payout_status: string; paypal_merchant_id: string | null }>("select id, payout_status, paypal_merchant_id from sellers where handle = 'fern_and_loom'"))!;

const state: { checkoutId?: string; token?: string; payUrl?: string; captureId?: string; refundRequestId?: string } = {};
const statePath = join(out, "_state.json");
try {
  Object.assign(state, JSON.parse((await import("node:fs")).readFileSync(statePath, "utf8")));
} catch {
  /* first run */
}
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2));

// The seller's linen shop: restock, and an auto-refund limit that covers a $42 set (logged in D-083).
await db.query("update variants set stock = greatest(stock, 20) where id = $1", [NAPKINS]);
await db.query("update sellers set refund_policy = jsonb_set(refund_policy, '{auto_refund_max_cents}', '5000') where handle = 'fern_and_loom'");

// ---------- P1 connect ----------
if (only.has("P1")) {
  await db.query("update sellers set payout_status = 'none', payout_email = null, paypal_merchant_id = null, payout_verified_at = null where handle = 'fern_and_loom'");
  const before = Number((await q1<{ n: number }>("select count(*)::int n from checkouts where seller_id = $1", [(await fern()).id]))?.n);
  const callsBefore = Number((await q1<{ n: number }>("select count(*)::int n from paypal_calls"))?.n);
  const refused = await buyNapkins();
  const after = Number((await q1<{ n: number }>("select count(*)::int n from checkouts where seller_id = $1", [(await fern()).id]))?.n);
  const callsAfter = Number((await q1<{ n: number }>("select count(*)::int n from paypal_calls"))?.n);
  record("P1a no payout account → refused before any row or PayPal call", refused.isError && /SELLER_NOT_READY|hasn't connected a PayPal/.test(refused.text) && after === before && callsAfter === callsBefore, {
    error: refused.text.slice(0, 200),
    newCheckouts: after - before,
    newPayPalCalls: callsAfter - callsBefore,
  });

  // An email that is not a PayPal account: whatever PayPal does is surfaced as it is, and no checkout is left open.
  const bogus = `no-such-account-${Date.now()}@example.com`;
  await admin({ action: "set_payout", handle: "fern_and_loom", account: bogus });
  const r = await buyNapkins();
  const last = await q1<{ id: string; status: string; paypal_order_id: string | null }>("select id, status, paypal_order_id from checkouts where seller_id = $1 order by created_at desc limit 1", [(await fern()).id]);
  const orderCall = last ? await q1<{ status: number; debug_id: string }>("select status, debug_id from paypal_calls where checkout_id = $1 and path = '/v2/checkout/orders' order by id desc limit 1", [last.id]) : undefined;
  record("P1b a payee email that isn't a PayPal account → PayPal's answer surfaced; nothing half-created", r.isError ? last?.status === "cancelled" : Boolean(last?.paypal_order_id), {
    paypalAccepted: !r.isError,
    toolError: r.isError ? r.text.slice(0, 200) : null,
    checkout: last,
    orderCall,
    note: r.isError ? "PayPal refused the order; the checkout is cancelled" : "PayPal created the order (an unknown payee email fails later, at the buyer's approval); the checkout expires unpaid",
  });

  const set = await admin({ action: "set_payout", handle: "fern_and_loom", account: e.SANDBOX_SELLER2_EMAIL });
  const f = await fern();
  record("P1c fern_and_loom connected to seller 2's PayPal (unverified until the first payment)", set.status === 200 && f.payout_status === "unverified", { set: set.status, payoutStatus: f.payout_status });
}

// ---------- P2 routing ----------
async function approveOnPayPage(page: Page) {
  await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  for (let i = 1; ; i++) {
    const popupP = page.waitForEvent("popup", { timeout: 30_000 });
    await page.locator("paypal-button").click();
    const popup = await popupP.catch(() => null);
    if (!popup) {
      if (i >= 3) throw new Error("popup did not open");
      continue;
    }
    try {
      await loginAndApprove(popup, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
      await popup.waitForEvent("close", { timeout: 60_000 }).catch(() => {});
      return;
    } catch (err) {
      await popup.close().catch(() => {});
      if (i >= 3) throw err;
      await sleep(8000);
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    }
  }
}

if (only.has("P2")) {
  const r = await buyNapkins();
  if (r.isError || !r.json) throw new Error(`P2 create_checkout failed: ${r.text}`);
  const ck = r.json as { checkout_id: string; order_token: string; pay_url: string; paypal_order_id: string };
  Object.assign(state, { checkoutId: ck.checkout_id, token: ck.order_token, payUrl: ck.pay_url });
  saveState();
  const routed = await q1<{ payee_email: string | null; payee_merchant_id: string | null }>("select payee_email, payee_merchant_id from checkouts where id = $1", [ck.checkout_id]);
  log("P2 checkout", ck.checkout_id, "routed", routed);
  const browser = await chromium.launch({ headless: false, channel: "chromium" });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(ck.pay_url, { waitUntil: "load" });
  await approveOnPayPage(page);
  const paid = await until("the order to be paid", async () => {
    const c = await q1<{ status: string }>("select status from checkouts where id = $1", [ck.checkout_id]);
    return c?.status === "paid" ? c : null;
  }, 120_000);
  await page.locator('[data-confirmation="webhook"]').waitFor({ timeout: 60_000 }).catch(() => {});
  await page.screenshot({ path: join(out, "P2-paid-to-seller2-desktop.png") });
  await browser.close();
  const cap = await q1<{ paypal_capture_id: string; payee_merchant_id: string | null; amount_cents: number }>("select paypal_capture_id, payee_merchant_id, amount_cents from captures where checkout_id = $1", [ck.checkout_id]);
  state.captureId = cap?.paypal_capture_id;
  saveState();
  const live = cap ? (await paypal.getCapture(cap.paypal_capture_id)).data : null;
  const f = await until("seller 2 to be verified", async () => ((await fern()).payout_status === "verified" ? fern() : null), 60_000);
  record("P2 routed: capture payee = seller 2, not the platform; seller 2 verified by the capture", Boolean(paid) && cap?.payee_merchant_id === SELLER2_MERCHANT && live?.payee?.merchant_id === SELLER2_MERCHANT && f.payout_status === "verified" && f.paypal_merchant_id === SELLER2_MERCHANT, {
    checkout: ck.checkout_id,
    routedAs: routed,
    capture: cap?.paypal_capture_id,
    payeeOnOurRow: cap?.payee_merchant_id,
    payeeFromPayPalGet: live?.payee?.merchant_id,
    platformPaid: live?.payee?.merchant_id === PLATFORM_MERCHANT,
    sellerPayout: f,
  });
}

// ---------- P3 handoff ----------
if (only.has("P3")) {
  if (!state.checkoutId || !state.token) throw new Error("P3 needs P2's checkout (state file)");
  const r = await tool("request_refund", { checkout_id: state.checkoutId, order_token: state.token, reason_code: "damaged", details: "One napkin arrived with a torn hem." });
  const rr = r.json as { refund_request_id?: string; status?: string; explanation?: string } | null;
  state.refundRequestId = rr?.refund_request_id;
  saveState();
  const row = await q1<{ status: string; decision: string; amount_cents: number; handoff_at: Date | null }>("select status, decision, amount_cents, handoff_at from refund_requests where id = $1", [state.refundRequestId]);
  const ev = await q1<{ summary: string; data: { link?: string } }>("select summary, data from events where checkout_id = $1 and kind = 'refund_handoff' order by id desc limit 1", [state.checkoutId]);
  const refundCalls = Number((await q1<{ n: number }>("select count(*)::int n from paypal_calls where checkout_id = $1 and method = 'POST' and path like '%/refund'", [state.checkoutId]))?.n);
  record("P3 in-policy refund → handoff with the deep link; 0 refund calls from Shopfront", row?.status === "handoff" && row.decision === "auto_approve" && ev?.data.link === `https://www.sandbox.paypal.com/activity/payment/${state.captureId}` && refundCalls === 0, {
    toolStatus: rr?.status,
    explanation: rr?.explanation,
    row,
    wire: ev?.summary,
    link: ev?.data.link,
    refundPostsFromOurApp: refundCalls,
  });
}

// ---------- P4 seller refunds in their own PayPal; the webhook closes the request ----------
async function sellerRefundsInPayPal(link: string) {
  const browser = await chromium.launch({ headless: false, channel: "chromium" });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  try {
    await page.goto("https://www.sandbox.paypal.com/signin", { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(e.SANDBOX_SELLER2_EMAIL);
    if (await page.locator("#btnNext").isVisible().catch(() => false)) await page.locator("#btnNext").click();
    await page.locator("#password").fill(e.SANDBOX_SELLER2_PASSWORD);
    await page.locator("#btnLogin").click();
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.goto(link, { waitUntil: "domcontentloaded" });
    await page.getByText(/issue a refund/i).first().waitFor({ timeout: 60_000 });
    await page.screenshot({ path: join(out, "P4-seller-transaction-page.png") });
    await page.getByText(/issue a refund/i).first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: join(out, "P4-seller-refund-form.png") });
    // PayPal's form defaults to the full amount (HANDOFF quirk); confirm through its one or two steps.
    for (let step = 0; step < 3; step++) {
      const btn = page.getByRole("button", { name: /^(issue refund|refund|continue|confirm)/i }).last();
      if (!(await btn.isVisible().catch(() => false))) break;
      await btn.click();
      await page.waitForTimeout(4000);
    }
    await page.screenshot({ path: join(out, "P4-seller-refund-done.png") });
  } finally {
    await browser.close();
  }
}

if (only.has("P4")) {
  if (!state.refundRequestId || !state.captureId) throw new Error("P4 needs P2/P3 state");
  const t0 = Date.now();
  await sellerRefundsInPayPal(`https://www.sandbox.paypal.com/activity/payment/${state.captureId}`);
  const sellerDone = Date.now();
  const row = await until("the handoff to close", async () => {
    const r = await q1<{ status: string; paypal_refund_id: string | null; refunded_cents: number | null; amount_cents: number }>("select status, paypal_refund_id, refunded_cents, amount_cents from refund_requests where id = $1", [state.refundRequestId]);
    return r?.status === "executed" ? r : null;
  }, 90_000);
  const closedS = Math.round((Date.now() - sellerDone) / 1000);
  const ev = await q1<{ summary: string; data: { via: string; differs: boolean } }>("select summary, data from events where checkout_id = $1 and kind = 'refund_by_seller' order by id desc limit 1", [state.checkoutId]);
  const buyer = (await (await fetch(`${base}/api/checkouts/${state.checkoutId}/status?t=${encodeURIComponent(state.token!)}`)).json()) as { status?: string; refunds?: Array<{ status: string; paypalRefundId: string | null }> };
  const browser = await chromium.launch({ headless: true });
  for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }], ["1920x1080", { width: 1920, height: 1080 }]] as const) {
    const p = await (await browser.newContext({ viewport: vp })).newPage();
    await p.goto(state.payUrl!, { waitUntil: "networkidle" });
    await p.waitForTimeout(2500);
    await p.screenshot({ path: join(out, `P4-buyer-order-page-refunded-${name}.png`), fullPage: true });
  }
  await browser.close();
  record("P4 seller refunds in PayPal → webhook closes the request (PayPal's id and amount); buyer page shows it", row.status === "executed" && Boolean(row.paypal_refund_id) && ev?.data.via === "webhook" && closedS <= 60 && buyer.refunds?.some((x) => x.status === "executed" && x.paypalRefundId === row.paypal_refund_id) === true, {
    sellerFlowSeconds: Math.round((sellerDone - t0) / 1000),
    closedSecondsAfterSellerRefund: closedS,
    row,
    wire: ev?.summary,
    via: ev?.data.via,
    buyerStatus: buyer.status,
  });
}

// ---------- P5 the GET fallback ----------
if (only.has("P5")) {
  if (!state.refundRequestId) throw new Error("P5 needs P3/P4 state");
  // As if the webhook had never been processed: reopen the request, then run the fallback check now.
  const before = await q1<{ paypal_refund_id: string }>("select paypal_refund_id from refund_requests where id = $1", [state.refundRequestId]);
  await db.query("update refund_requests set status = 'handoff', paypal_refund_id = null, refunded_cents = null, executed_at = null where id = $1", [state.refundRequestId]);
  const check = await admin({ action: "handoff_check", refund_request_id: state.refundRequestId });
  const row = await q1<{ status: string; paypal_refund_id: string | null; refunded_cents: number | null }>("select status, paypal_refund_id, refunded_cents from refund_requests where id = $1", [state.refundRequestId]);
  const ev = await q1<{ data: { via: string } }>("select data from events where checkout_id = $1 and kind = 'refund_by_seller' order by id desc limit 1", [state.checkoutId]);
  record("P5 GET fallback closes the handoff from PayPal's order refunds when no webhook is processed", check.status === 200 && row?.status === "executed" && row.paypal_refund_id === before?.paypal_refund_id && ev?.data.via === "poll", { check: check.body, row, via: ev?.data.via });
}

await mcp.close();
await db.end();
writeFileSync(join(out, `phase9-results-${[...only].join("")}.json`), JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
log(failed.length ? `${failed.length} FAILED` : `ALL ${results.length} PASSED`);
process.exit(failed.length ? 1 : 0);
