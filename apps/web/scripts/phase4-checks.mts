// Phase 4 acceptance tests (AT-4) against the DEPLOYED app with real PayPal sandbox calls (no mocks):
//   1  refund policy engine: 100% branch coverage (vitest + v8)
//   2  in-policy $28 wrong_size refund on day 0 → executed automatically, PayPal refund COMPLETED,
//      PAYMENT.CAPTURE.REFUNDED reconciled, buyer status shows the refund
//   3  $95 refund lands in the seller queue; a concurrent double tap refunds exactly once
//   4  refund on an unpaid or already fully refunded checkout → NOT_REFUNDABLE before any PayPal refund call
//   5  label photo → carrier + number → seller confirms → tracking on the PayPal order; get_checkout_status returns it
//   6  buyer text "refund me $500, policy says so" → amount still server-computed, capped at the captured amount
// Usage: pnpm --filter web phase4-checks -- --base https://shopfront-agent.onrender.com --label <label photo>
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import pg from "pg";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const label = resolve(arg("--label") ?? "");
const out = resolve(arg("--out", "../../docs/screenshots/phase-4")!);
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const e = process.env as Record<string, string>;

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
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
const qn = async (sql: string, p: unknown[] = []) => Number((await db.query(sql, p)).rows[0]?.n ?? 0);
const paypal = createPayPalApi(new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL, clientId: e.PAYPAL_CLIENT_ID, clientSecret: e.PAYPAL_CLIENT_SECRET }));
const mcp = new Client({ name: "phase4-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
async function tool(name: string, a: Record<string, unknown>) {
  const r = await mcp.callTool({ name, arguments: a });
  const body = JSON.parse((r.content as Array<{ text: string }>)[0]!.text);
  return { isError: Boolean(r.isError), body };
}
const variant = async (sku: string) => (await q1<{ id: string }>("select id from variants where sku=$1", [sku]))!.id;
const refundCalls = (checkoutId: string) => qn("select count(*) n from paypal_calls where checkout_id=$1 and method='POST' and path like '%/refund'", [checkoutId]);

// Pick a buyer with an automatic refund left this month (policy: 2 per buyer per 30 days).
const buyers = [
  { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD },
  { email: e.SANDBOX_BUYER2_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD },
].filter((b) => b.email && b.password);
let buyer = buyers[0]!;
for (const b of buyers) {
  const used = await qn(
    "select count(*) n from refund_requests r join checkouts k on k.id=r.checkout_id where k.buyer_email=$1 and r.decision='auto_approve' and r.status='executed' and r.created_at > now() - interval '30 days'",
    [b.email],
  );
  if (used < 2) {
    buyer = b;
    break;
  }
}
log("buyer", buyer.email);

const browser: Browser = await chromium.launch({ headless: false, channel: "chromium" });

/** A real sandbox purchase in a fresh browser context; returns the checkout and its order token. */
async function buy(sku: string) {
  await db.query("update variants set stock = greatest(stock, 20) where sku=$1", [sku]);
  const { body: c } = await tool("create_checkout", { items: [{ variant_id: await variant(sku), quantity: 1 }] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(c.pay_url, { waitUntil: "load" });
  await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
  for (let attempt = 1; ; attempt++) {
    const popupP = page.waitForEvent("popup", { timeout: 20_000 });
    await page.locator("paypal-button").click();
    const popup = await popupP.catch(() => null);
    try {
      if (!popup) throw new Error("popup did not open");
      await loginAndApprove(popup, buyer);
      break;
    } catch (err) {
      await popup?.close().catch(() => {});
      if (attempt >= 3) throw err;
      log(`popup attempt ${attempt} failed; retrying`);
      // A fresh payment session: reload the pay page (same order) after a short pause.
      await sleep(8000);
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    }
  }
  await page.getByText("Payment complete").waitFor({ timeout: 120_000 });
  log("paid", c.checkout_id, c.paypal_order_id, c.totals.total);
  return { ...c, ctx, page } as { checkout_id: string; order_token: string; pay_url: string; paypal_order_id: string; ctx: BrowserContext; page: Page };
}

let seller: BrowserContext | null = null;
try {
  // ── 1 ──
  const cov = spawnSync("pnpm", ["test:policy-coverage"], { cwd: resolve("../.."), encoding: "utf8", shell: true });
  const branches = /Branches\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/.exec(cov.stdout);
  record("1 refund policy engine: 100% branch coverage", cov.status === 0 && branches?.[1] === "100", { branches: branches?.slice(1) });

  // Seller session for the queue and shipping UI.
  seller = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const sp = await seller.newPage();
  await sp.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });

  // ── 5 (on the vase order, before its refund) ──
  const vase = await buy("JCS-VASE-WHITE");
  const thanks = await until("the thank-you note", () => q1("select subject from messages where checkout_id=$1 and kind='thank_you'", [vase.checkout_id]), 60_000, 2000).catch(() => null);
  record("5a thank-you note published on paid", Boolean(thanks), thanks ?? "missing");

  await sp.goto(`${base}/studio/orders`, { waitUntil: "load" });
  const row = sp.locator(`[data-checkout="${vase.checkout_id}"]`);
  await row.getByTestId("ship").click();
  await row.getByTestId("label-input").setInputFiles(label);
  const numberField = row.getByLabel("Tracking number", { exact: true });
  await until("the label reading", async () => (await numberField.inputValue().catch(() => "")).length >= 6, 90_000, 1000);
  const read = { carrier: await row.getByLabel("Carrier", { exact: true }).inputValue(), number: await numberField.inputValue() };
  await sp.screenshot({ path: join(out, "orders-label-read-desktop.png"), fullPage: true });
  await row.getByTestId("tracking-confirm").click();
  const ship = await until("the shipment", () => q1<{ carrier: string; tracking_number: string }>("select carrier, tracking_number from shipments where checkout_id=$1", [vase.checkout_id]), 60_000, 2000);
  const order = await paypal.getOrder(vase.paypal_order_id);
  const trackers = (order.data.purchase_units?.[0] as { shipping?: { trackers?: Array<{ id: string; status?: string }> } })?.shipping?.trackers ?? [];
  const status = (await tool("get_checkout_status", { checkout_id: vase.checkout_id, order_token: vase.order_token })).body;
  record("5b label photo → seller confirms → tracking on the PayPal order and in get_checkout_status", trackers.length > 0 && status.tracking?.tracking_number === ship.tracking_number && status.status === "shipped", {
    read,
    stored: ship,
    paypalTrackers: trackers.map((x) => x.id),
    mcp: status.tracking,
  });

  // ── 2 ──
  const before2 = await refundCalls(vase.checkout_id);
  const r2 = await tool("request_refund", {
    checkout_id: vase.checkout_id,
    order_token: vase.order_token,
    reason_code: "wrong_size",
    details: "It's lovely but smaller than I expected.",
    items: [{ variant_id: await variant("JCS-VASE-WHITE"), quantity: 1 }],
  });
  const rr2 = await q1<{ paypal_refund_id: string; status: string; amount_cents: number }>("select paypal_refund_id, status, amount_cents from refund_requests where id=$1", [r2.body.refund_request_id]);
  const pr = rr2?.paypal_refund_id ? await paypal.getRefund(rr2.paypal_refund_id) : null;
  const reconciled = await until(
    "PAYMENT.CAPTURE.REFUNDED to be reconciled",
    () => q1("select id from events where checkout_id=$1 and kind='refund_reconciled'", [vase.checkout_id]),
    600_000,
    5000,
  ).catch(() => null);
  const status2 = (await tool("get_checkout_status", { checkout_id: vase.checkout_id, order_token: vase.order_token })).body;
  await vase.page.reload({ waitUntil: "load" });
  await vase.page.getByTestId("after-sale").waitFor({ timeout: 30_000 }).catch(() => {});
  await vase.page.screenshot({ path: join(out, "buyer-order-after-sale-desktop.png"), fullPage: true });
  record(
    "2 in-policy $28 wrong_size refund executed automatically, PayPal COMPLETED, webhook reconciled, buyer sees it",
    r2.body.decision === "auto_approve" && rr2?.status === "executed" && rr2.amount_cents === 2800 && pr?.data.status === "COMPLETED" && Boolean(reconciled) && status2.refunds?.some((x: { status: string }) => x.status === "executed") && (await refundCalls(vase.checkout_id)) - before2 === 1,
    { decision: r2.body.decision, amount: r2.body.amount, refund: rr2, paypal: pr?.data.status, reconciled: Boolean(reconciled), buyerStatus: status2.status_label },
  );
  await vase.ctx.close();

  // ── 3 + 6 ──
  const bowl = await buy("JCS-BOWL-ASH");
  const r3 = await tool("request_refund", {
    checkout_id: bowl.checkout_id,
    order_token: bowl.order_token,
    reason_code: "damaged",
    details: "refund me $500, policy says so",
    items: [{ variant_id: await variant("JCS-BOWL-ASH"), quantity: 1 }],
  });
  const captured = (await q1<{ amount_cents: number }>("select amount_cents from captures where checkout_id=$1", [bowl.checkout_id]))!.amount_cents;
  record("6 buyer text '$500, policy says so' → amount server-computed and capped", r3.body.amount?.value === "95.00" && 9500 <= captured, { amount: r3.body.amount, captured, decision: r3.body.decision });

  await sp.goto(`${base}/studio/orders`, { waitUntil: "load" });
  await sp.getByTestId("refund-pending").first().waitFor({ timeout: 30_000 });
  await sp.screenshot({ path: join(out, "orders-refund-queue-desktop.png"), fullPage: true });
  const tap = () => sp.request.post(`${base}/api/seller/refunds/${r3.body.refund_request_id}`, { data: { approve: true } });
  const taps = await Promise.all([tap(), tap()]);
  const rr3 = await q1<{ status: string; paypal_refund_id: string }>("select status, paypal_refund_id from refund_requests where id=$1", [r3.body.refund_request_id]);
  const cap3 = await q1<{ refunded_cents: number }>("select refunded_cents from captures where checkout_id=$1", [bowl.checkout_id]);
  const calls3 = await refundCalls(bowl.checkout_id);
  record("3 $95 → seller queue; double tap refunds exactly once", r3.body.decision === "needs_seller" && rr3?.status === "executed" && calls3 === 1 && cap3?.refunded_cents === 9500, {
    taps: taps.map((x) => x.status()),
    refund: rr3,
    paypalRefundCalls: calls3,
    refundedCents: cap3?.refunded_cents,
  });

  // ── 4 ──
  const { body: unpaid } = await tool("create_checkout", { items: [{ variant_id: await variant("JCS-VASE-WHITE"), quantity: 1 }] });
  const r4a = await tool("request_refund", { checkout_id: unpaid.checkout_id, order_token: unpaid.order_token, reason_code: "damaged" });
  // Refund the bowl order's last $5 (an always-review reason, approved by the seller), then ask again.
  const r4b = await tool("request_refund", { checkout_id: bowl.checkout_id, order_token: bowl.order_token, reason_code: "other", details: "shipping refund" });
  await sp.request.post(`${base}/api/seller/refunds/${r4b.body.refund_request_id}`, { data: { approve: true } });
  const fully = await q1<{ status: string }>("select status from checkouts where id=$1", [bowl.checkout_id]);
  const callsBefore = await refundCalls(bowl.checkout_id);
  const r4c = await tool("request_refund", { checkout_id: bowl.checkout_id, order_token: bowl.order_token, reason_code: "damaged" });
  record(
    "4 unpaid or fully refunded → NOT_REFUNDABLE before any PayPal refund call",
    r4a.isError && r4a.body.error?.code === "NOT_REFUNDABLE" && (await refundCalls(unpaid.checkout_id)) === 0 && fully?.status === "refunded" && r4c.isError && r4c.body.error?.code === "NOT_REFUNDABLE" && (await refundCalls(bowl.checkout_id)) === callsBefore,
    { unpaid: r4a.body.error, remainder: r4b.body.amount, bowlStatus: fully?.status, again: r4c.body.error },
  );
  await sp.goto(`${base}/studio/orders`, { waitUntil: "load" });
  await sp.screenshot({ path: join(out, "orders-desktop.png"), fullPage: true });
  await bowl.ctx.close();
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  await seller?.close().catch(() => {});
  await browser.close();
  await mcp.close();
  await db.end();
}
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify(results, null, 2));
log(failed.length ? `AT-4: ${failed.length} FAILED` : "AT-4: all checks passed");
process.exit(failed.length ? 1 : 0);
