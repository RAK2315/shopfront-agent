// Spike M, part 2 (D-075): payee routing end to end with seller 2, a US Business sandbox account. Real sandbox calls,
// a real buyer approval in a headed browser, no mocks. Our app never sees this order (it is not in our database),
// so nothing reaches the public wire.
//   1 create an order with purchase_units[].payee = seller 2 (no platform fee: that is gated, D-075)
//   2 the sandbox buyer approves it (full-page redirect flow)   3 capture → who is the payee, what is the breakdown
//   4 refund attempt without PayPal-Auth-Assertion   5 refund attempt with PayPal-Auth-Assertion (payer_id = seller 2)
//   6 did PayPal deliver the capture's webhook to our endpoint? (webhook_events, by resource id)
// Prints ids, statuses, issue names and debug ids; masks seller 2's email; never prints tokens or passwords.
// Usage: pnpm --filter web spike-m2
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import pg from "pg";
import { PayPalApiError, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const e = process.env as Record<string, string>;
const seller2 = e.SANDBOX_SELLER2_EMAIL;
if (!seller2) throw new Error("SANDBOX_SELLER2_EMAIL missing from .env (SETUP §14)");
const mask = (s: string) => s.replaceAll(seller2, "<seller 2>");
const log = (...a: unknown[]) => console.log(mask(`[${new Date().toISOString().slice(11, 19)}] ${a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`));
const pp = new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL!, clientId: e.PAYPAL_CLIENT_ID!, clientSecret: e.PAYPAL_CLIENT_SECRET! });
const fail = (id: string, err: unknown) =>
  err instanceof PayPalApiError ? log(id, "ERROR", err.status, err.issue, "debug", err.debugId ?? "", "|", err.message, err.details) : log(id, "ERROR", String(err));
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const RETURN = "https://shopfront-agent.onrender.com/spike-m-return";

// 1
const created = await pp.request<{ id: string; links: Array<{ rel: string; href: string }> }>("POST", "/v2/checkout/orders", {
  requestId: randomUUID(),
  body: {
    intent: "CAPTURE",
    purchase_units: [{ reference_id: "spike-m2", description: "Spike M: payee routing", amount: { currency_code: "USD", value: "37.00" }, payee: { email_address: seller2 } }],
    payment_source: { paypal: { experience_context: { user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: RETURN, cancel_url: RETURN } } },
  },
});
const orderId = created.data.id;
log("1 order created", orderId, "debug", created.debugId ?? "");

// 2
const approve = created.data.links.find((l) => l.rel === "payer-action" || l.rel === "approve")!.href;
const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  for (let attempt = 1; ; attempt++) {
    const page = await browser.newPage();
    try {
      await page.goto(approve, { waitUntil: "domcontentloaded" });
      await loginAndApprove(page, { email: e.SANDBOX_BUYER2_EMAIL || e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD || e.SANDBOX_BUYER_PASSWORD });
      await page.waitForURL((u) => u.toString().startsWith(RETURN), { timeout: 90_000 });
      log("2 buyer approved");
      break;
    } catch (err) {
      await page.close();
      if (attempt >= 3) throw err;
      log("2 sandbox login flaked, retrying", attempt);
    }
  }
} finally {
  await browser.close();
}

// 3
type Capture = { id: string; status: string; amount: { value: string }; seller_receivable_breakdown?: unknown; payee?: unknown };
let captureId = "";
try {
  const c = await pp.request<{ status: string; purchase_units: Array<{ payee?: unknown; payments: { captures: Capture[] } }> }>("POST", `/v2/checkout/orders/${orderId}/capture`, { requestId: randomUUID(), body: {} });
  const cap = c.data.purchase_units[0]!.payments.captures[0]!;
  captureId = cap.id;
  log("3 captured", { order: c.data.status, capture: cap.id, status: cap.status, payee: c.data.purchase_units[0]!.payee, breakdown: cap.seller_receivable_breakdown, debug: c.debugId });
  const g = await pp.request<Capture>("GET", `/v2/payments/captures/${cap.id}`);
  log("3 GET capture", { status: g.data.status, payee: g.data.payee, debug: g.debugId });
} catch (err) {
  fail("3 capture", err);
}

if (captureId) {
  // 4
  try {
    const r = await pp.request<{ id: string; status: string }>("POST", `/v2/payments/captures/${captureId}/refund`, { requestId: randomUUID(), body: { amount: { currency_code: "USD", value: "5.00" } } });
    log("4 refund without Auth-Assertion", "OK", r.data.id, r.data.status, "debug", r.debugId ?? "");
  } catch (err) {
    fail("4 refund without Auth-Assertion", err);
  }
  // 5 (unsigned JWT, alg none, trailing period; developer.paypal.com multiparty docs)
  try {
    const assertion = `${b64({ alg: "none" })}.${b64({ iss: e.PAYPAL_CLIENT_ID, email: seller2 })}.`;
    const r = await pp.request<{ id: string; status: string }>("POST", `/v2/payments/captures/${captureId}/refund`, {
      requestId: randomUUID(),
      body: { amount: { currency_code: "USD", value: "5.00" } },
      headers: { "PayPal-Auth-Assertion": assertion },
    });
    log("5 refund with Auth-Assertion", "OK", r.data.id, r.data.status, "debug", r.debugId ?? "");
  } catch (err) {
    fail("5 refund with Auth-Assertion", err);
  }
  // 6
  await new Promise((r) => setTimeout(r, 45_000));
  const db = new pg.Client({ connectionString: e.DATABASE_URL });
  await db.connect();
  const rows = (await db.query("select event_type, verified, processed_at is not null processed, error from webhook_events where resource_id = $1 or payload::text like $2", [captureId, `%${orderId}%`])).rows;
  await db.end();
  log("6 webhooks for this order at our endpoint", rows);
}
