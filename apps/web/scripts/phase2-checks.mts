// Phase 2 acceptance tests (AT-2), run against the DEPLOYED app with real PayPal sandbox calls (no mocks):
//   A  real purchase → verified PAYMENT.CAPTURE.COMPLETED processed once; the live timeline shows every step
//      in order without a reload; a PayPal "Resend" of that event changes nothing
//   B  forged webhook (bad signature) → stored verified=false, changes nothing
//   C  buyer closes the PayPal popup → checkout stays `created`
//   D  service restart with an open checkout → timers re-armed on boot; the expired checkout is cancelled
//   E  webhook URL wrong + capture never reaches us (tab closed) → a fallback check captures; badge "via poll"
//   F  second US sandbox buyer completes a purchase (needs SANDBOX_BUYER2_EMAIL / SANDBOX_BUYER2_PASSWORD)
// Usage: pnpm --filter web phase2-checks -- --base https://shopfront-agent.onrender.com [--only A,B] [--out dir]
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Browser, type Page } from "@playwright/test";
import pg from "pg";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/phase-2")!);
const only = new Set((arg("--only", "A,B,C,D,E,F") ?? "").split(","));
const e = process.env as Record<string, string>;
const SERVICE_ID = "srv-db8e76dg1s2s739vvv0g";
const COBALT = "var_cobalt120000";
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);
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
const qn = async (sql: string, p: unknown[] = []) => Number((await db.query(sql, p)).rows[0]?.n ?? 0);

const paypal = createPayPalApi(new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL, clientId: e.PAYPAL_CLIENT_ID, clientSecret: e.PAYPAL_CLIENT_SECRET }));

const mcp = new Client({ name: "phase2-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
async function tool<T = Record<string, unknown>>(name: string, a: Record<string, unknown>): Promise<T> {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}
type Checkout = { checkout_id: string; pay_url: string; paypal_order_id: string };
const newCheckout = () => tool<Checkout>("create_checkout", { items: [{ variant_id: COBALT, quantity: 1 }], client_request_id: randomUUID() });

async function restockCobalt() {
  // Each paid run decrements stock (D-009); keep the seed variant buyable for repeat runs.
  await db.query("update variants set stock = greatest(stock, 20) where id = $1", [COBALT]);
}

async function payInPopup(page: Page, buyer: { email: string; password: string }, shots: { login?: string; review?: string } = {}) {
  const btn = page.locator("paypal-button");
  // The pay page marks itself ready once the v6 payment session exists.
  await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
  // The sandbox sometimes answers a login with "Things don't appear to be working"; retry the same order once.
  for (let attempt = 1; ; attempt++) {
    const popupP = page.waitForEvent("popup", { timeout: 20_000 });
    await btn.click();
    const popup = await popupP.catch(() => null);
    if (!popup) {
      if (attempt >= 3) throw new Error("The PayPal popup did not open after 3 clicks");
      log(`popup did not open (attempt ${attempt}); clicking again`);
      continue;
    }
    try {
      await loginAndApprove(popup, buyer, shots);
      await popup.waitForEvent("close", { timeout: 60_000 }).catch(() => {});
      return;
    } catch (err) {
      await popup.screenshot({ path: join(out, `_popup-attempt-${attempt}.png`) }).catch(() => {});
      await popup.close().catch(() => {});
      if (attempt >= 3) throw err;
      log(`popup attempt ${attempt} failed (${err instanceof Error ? err.message.split(String.fromCharCode(10))[0] : err}); retrying`);
      // A fresh payment session: reload the pay page (same order) after a short pause.
      await sleep(8000);
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    }
  }
}

const buyer1 = { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD };
const browser: Browser = await chromium.launch({ headless: false, channel: "chromium" });
// A fresh context per check group: after a PayPal popup error, the SDK opens no new popup in the same context.
let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// D's checkout is created first so its creation timers (+60 s, +3 min) pass harmlessly before the restart.
let dCheckout: Checkout | null = null;
const dCreatedAt = Date.now();
if (only.has("D")) {
  await restockCobalt();
  dCheckout = await newCheckout();
  log("D: open checkout for the restart test", dCheckout.checkout_id);
}

/** Runs one check group; a failure is recorded with screenshots and the remaining groups still run. */
async function isolated(id: string, fn: () => Promise<void>) {
  await ctx.close().catch(() => {});
  ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await fn();
  } catch (err) {
    record(id, false, err instanceof Error ? (err.message.split(/\r?\n/)[0] ?? err.message) : String(err));
    for (const [i, pg2] of ctx.pages().entries()) await pg2.screenshot({ path: join(out, `_error-${id.replace("/", "")}-${i}.png`), fullPage: true }).catch(() => {});
    for (const pg2 of ctx.pages()) await pg2.close().catch(() => {});
  }
}

try {
  // ───────────────────────── A ─────────────────────────
  if (only.has("A")) await isolated("A", async () => {
    await restockCobalt();
    const live = await ctx.newPage();
    await live.goto(`${base}/live`, { waitUntil: "load", timeout: 180_000 });
    await live.getByText("Connected").waitFor({ timeout: 60_000 });
    await live.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));

    log("A: agent-style tool calls over MCP");
    const found = await tool<{ results: Array<{ product_id: string; title: string }> }>("search_products", { query: "blue mug", max_price_usd: 40 });
    await tool("get_product", { product_id: found.results[0]!.product_id });
    const a = await newCheckout();
    log("A: checkout", a.checkout_id, a.paypal_order_id);

    const pay = await ctx.newPage();
    await pay.goto(a.pay_url, { waitUntil: "load" });
    await payInPopup(pay, buyer1);
    await pay.getByText("Payment complete").waitFor({ timeout: 120_000 });
    await pay.locator('[data-testid="webhook-state"][data-confirmation="webhook"]').waitFor({ timeout: 240_000 });
    await pay.screenshot({ path: join(out, "pay-paid-webhook-verified-desktop.png"), fullPage: true });

    // Live timeline for this checkout, oldest → newest.
    await live.locator('section[aria-labelledby="checkouts-h"]').getByRole("button", { name: new RegExp(a.checkout_id) }).click();
    await live.waitForTimeout(1500);
    const titles = (await live.locator('section[aria-label="Timeline for one checkout"] li').allInnerTexts()).reverse();
    const idx = (s: string) => titles.findIndex((x) => x.includes(s));
    const order = ["create_checkout", "Order created", "Buyer approved", "Payment captured"].map(idx);
    const webhooks = ["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED"].map(idx);
    const noReload = await live.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload === true);
    await live.screenshot({ path: join(out, "live-purchase-desktop.png") });
    record("A1 timeline shows every step in order, live", order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1]!)) && webhooks.every((w) => w > order[0]!) && noReload, {
      order,
      webhooks,
      noReload,
      steps: titles.map((x) => x.split("\n").slice(0, 2).join(" ")),
    });

    const cap = await q1<{ paypal_capture_id: string }>("select paypal_capture_id from captures where checkout_id=$1", [a.checkout_id]);
    const wh = await q1<{ event_id: string; deliveries: number; attempts: number; processed_at: Date; verified: boolean }>(
      "select event_id, deliveries, attempts, processed_at, verified from webhook_events where event_type='PAYMENT.CAPTURE.COMPLETED' and resource_id=$1",
      [cap!.paypal_capture_id],
    );
    const before = {
      events: await qn("select count(*) n from events where checkout_id=$1", [a.checkout_id]),
      rows: await qn("select count(*) n from webhook_events where event_id=$1", [wh!.event_id]),
      checkout: await q1("select status, updated_at, confirmed_via from checkouts where id=$1", [a.checkout_id]),
    };
    record("A2 capture webhook verified and processed once", wh!.verified && wh!.attempts === 1 && Boolean(wh!.processed_at), wh);

    log("A: asking PayPal to resend", wh!.event_id);
    // PayPal only accepts a resend once the event has settled on its side (~1 min): "Resource id is invalid" before that.
    await until(
      "PayPal to accept the resend",
      () =>
        paypal
          .resendWebhookEvent(wh!.event_id, [e.PAYPAL_WEBHOOK_ID], `resend-${wh!.event_id}-${Date.now()}`)
          .then(() => true)
          .catch((err: Error) => (/invalid/i.test(err.message) ? false : Promise.reject(err))),
      240_000,
      15_000,
    );
    const after = await until(
      "the resent delivery (sandbox can take minutes for recent events)",
      async () => {
        const r = await q1<{ deliveries: number; attempts: number }>("select deliveries, attempts from webhook_events where event_id=$1", [wh!.event_id]);
        return r && r.deliveries > wh!.deliveries ? r : null;
      },
      600_000,
      10_000,
    );
    await sleep(5000);
    const afterState = {
      events: await qn("select count(*) n from events where checkout_id=$1", [a.checkout_id]),
      rows: await qn("select count(*) n from webhook_events where event_id=$1", [wh!.event_id]),
      checkout: await q1("select status, updated_at, confirmed_via from checkouts where id=$1", [a.checkout_id]),
    };
    record(
      "A3 PayPal resend → no duplicate state change or event",
      after.attempts === wh!.attempts && afterState.events === before.events && afterState.rows === 1 && JSON.stringify(afterState.checkout) === JSON.stringify(before.checkout),
      { deliveries: `${wh!.deliveries} → ${after.deliveries}`, attempts: after.attempts, events: `${before.events} → ${afterState.events}` },
    );
    await pay.close();
    await live.close();
  });

  // ───────────────────────── B + C ─────────────────────────
  if (only.has("B") || only.has("C")) await isolated("B/C", async () => {
    await restockCobalt();
    const c = await newCheckout();
    log("B/C: checkout", c.checkout_id);

    if (only.has("B")) {
      const forgedId = `WH-FORGED-${randomUUID().slice(0, 8).toUpperCase()}`;
      const res = await fetch(`${base}/webhooks/paypal`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "paypal-transmission-id": randomUUID(),
          "paypal-transmission-time": new Date().toISOString(),
          "paypal-transmission-sig": "Zm9yZ2Vk",
          "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-forged",
          "paypal-auth-algo": "SHA256withRSA",
        },
        body: JSON.stringify({
          id: forgedId,
          event_type: "PAYMENT.CAPTURE.COMPLETED",
          resource_type: "capture",
          resource: { id: "FORGEDCAPTURE01", status: "COMPLETED", amount: { currency_code: "USD", value: "0.01" }, supplementary_data: { related_ids: { order_id: c.paypal_order_id } } },
        }),
      });
      const body = await res.json();
      const row = await until("the forged event to be handled", () => q1<{ verified: boolean; processed_at: Date; error: string }>("select verified, processed_at, error from webhook_events where event_id=$1 and processed_at is not null", [forgedId]), 30_000, 1000);
      const ck = await q1<{ status: string }>("select status from checkouts where id=$1", [c.checkout_id]);
      const caps = await qn("select count(*) n from captures where checkout_id=$1", [c.checkout_id]);
      const rejected = await qn("select count(*) n from events where kind='webhook_rejected' and data->>'eventId'=$1", [forgedId]);
      record("B forged webhook stored verified=false and changes nothing", res.ok && body.verified === false && row.verified === false && ck!.status === "created" && caps === 0 && rejected === 1, {
        response: body,
        row,
        checkout: ck!.status,
        captures: caps,
      });
    }

    if (only.has("C")) {
      const pay = await ctx.newPage();
      await pay.goto(c.pay_url, { waitUntil: "load" });
      const btn = pay.locator("paypal-button");
      await pay.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
      const popupP = pay.waitForEvent("popup", { timeout: 45_000 });
      await btn.click();
      const popup = await popupP;
      await popup.waitForLoadState("domcontentloaded");
      await popup.waitForTimeout(2500);
      await popup.close();
      await pay.getByText("You closed PayPal before approving").waitFor({ timeout: 30_000 });
      await pay.screenshot({ path: join(out, "pay-popup-cancelled-desktop.png"), fullPage: true });
      const ck = await q1<{ status: string }>("select status from checkouts where id=$1", [c.checkout_id]);
      const order = await paypal.getOrder(c.paypal_order_id);
      record("C popup closed → checkout stays created, nothing charged", ck!.status === "created" && order.data.status !== "COMPLETED", { checkout: ck!.status, paypalOrder: order.data.status });
      await pay.close();
    }
  });

  // ───────────────────────── E ─────────────────────────
  if (only.has("E")) await isolated("E", async () => {
    await restockCobalt();
    const hooks = await paypal.listWebhooks();
    const hook = hooks.data.webhooks.find((w) => w.id === e.PAYPAL_WEBHOOK_ID)!;
    const goodUrl = hook.url;
    log("E: pointing the PayPal webhook at a wrong URL");
    await paypal.updateWebhookUrl(hook.id, `${base}/webhooks/paypal-wrong`);
    try {
      const x = await newCheckout();
      log("E: checkout", x.checkout_id);
      const pay = await ctx.newPage();
      // The buyer approves, but the capture call never reaches us (tab closed / network gone).
      await pay.route("**/api/checkouts/*/capture", (r) => r.abort());
      await pay.goto(x.pay_url, { waitUntil: "load" });
      await payInPopup(pay, buyer1);
      const approvedAt = Date.now();
      log("E: approved in PayPal; capture blocked; waiting for a fallback check");
      const paid = await until(
        "the fallback check to capture",
        () => q1<{ status: string; confirmed_via: string; poll_confirmed_at: Date; webhook_confirmed_at: Date | null }>(
          "select status, confirmed_via, poll_confirmed_at, webhook_confirmed_at from checkouts where id=$1 and status='paid'",
          [x.checkout_id],
        ),
        240_000,
        2000,
      );
      const seconds = Math.round((Date.now() - approvedAt) / 1000);
      await pay.unroute("**/api/checkouts/*/capture");
      await pay.reload({ waitUntil: "load" });
      await pay.locator('[data-testid="webhook-state"][data-confirmation="poll"]').waitFor({ timeout: 30_000 });
      await pay.screenshot({ path: join(out, "pay-paid-via-poll-desktop.png"), fullPage: true });
      const live = await ctx.newPage();
      await live.goto(`${base}/live`, { waitUntil: "load" });
      await live.locator('section[aria-labelledby="checkouts-h"]').getByRole("button", { name: new RegExp(x.checkout_id) }).click();
      await live.waitForTimeout(1500);
      await live.screenshot({ path: join(out, "live-via-poll-desktop.png") });
      record("E webhook lost + capture lost → fallback check marks it paid, badge 'via poll'", paid.confirmed_via === "poll" && !paid.webhook_confirmed_at && seconds <= 75, {
        seconds_after_approval: seconds,
        ...paid,
      });
      await live.close();
      await pay.close();
    } finally {
      await paypal.updateWebhookUrl(hook.id, goodUrl);
      log("E: webhook URL restored");
    }
  });

  // ───────────────────────── D ─────────────────────────
  if (only.has("D") && dCheckout) await isolated("D", async () => {
    // Make sure we're past D's +3 min creation timer, then simulate "3 hours later" and restart at once.
    const wait = Math.max(0, dCreatedAt + 200_000 - Date.now());
    if (wait) {
      log(`D: waiting ${Math.round(wait / 1000)} s for the creation timers to pass`);
      await sleep(wait);
    }
    await db.query("update checkouts set expires_at = now() - interval '1 minute' where id=$1", [dCheckout.checkout_id]);
    log("D: restarting the Render service");
    const r = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/restart`, { method: "POST", headers: { Authorization: `Bearer ${e.RENDER_API_KEY}` } });
    if (!r.ok) throw new Error(`Render restart ${r.status}`);
    const restartAt = new Date();
    const rearm = await until(
      "the restarted server to re-arm timers",
      () => q1<{ data: { checkoutIds: string[] }; created_at: Date }>("select data, created_at from events where kind='fallback_rearmed' and created_at > $1 order by id desc", [restartAt]),
      420_000,
      5000,
    );
    const expired = await until(
      "the expired checkout to be cancelled by the restarted server",
      () => q1<{ data: { trigger: string } }>("select data from events where kind='checkout_expired' and checkout_id=$1", [dCheckout!.checkout_id]),
      120_000,
      3000,
    );
    const ck = await q1<{ status: string }>("select status from checkouts where id=$1", [dCheckout.checkout_id]);
    record("D restart re-arms timers; expired checkout → cancelled", rearm.data.checkoutIds.includes(dCheckout.checkout_id) && expired.data.trigger === "boot" && ck!.status === "cancelled", {
      rearmedCount: rearm.data.checkoutIds.length,
      includesOurs: rearm.data.checkoutIds.includes(dCheckout.checkout_id),
      expiredBy: expired.data.trigger,
      status: ck!.status,
    });
  });

  // ───────────────────────── F ─────────────────────────
  if (only.has("F")) await isolated("F", async () => {
    if (!e.SANDBOX_BUYER2_EMAIL || !e.SANDBOX_BUYER2_PASSWORD) {
      record("F second US sandbox buyer", "skipped", "SANDBOX_BUYER2_EMAIL / SANDBOX_BUYER2_PASSWORD not in .env");
    } else {
      await restockCobalt();
      const f = await newCheckout();
      const pay = await ctx.newPage();
      await pay.goto(f.pay_url, { waitUntil: "load" });
      await payInPopup(pay, { email: e.SANDBOX_BUYER2_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD });
      await pay.getByText("Payment complete").waitFor({ timeout: 120_000 });
      const ck = await until("buyer 2 paid", () => q1<{ status: string; buyer_email: string; buyer_country: string }>("select status, buyer_email, buyer_country from checkouts where id=$1 and status='paid'", [f.checkout_id]), 120_000);
      record("F second US sandbox buyer completes a purchase", ck.buyer_email === e.SANDBOX_BUYER2_EMAIL && ck.buyer_country === "US", ck);
      await pay.close();
    }
  });
} catch (err) {
  record("run", false, err instanceof Error ? err.message : String(err));
  for (const [i, pg2] of ctx.pages().entries()) await pg2.screenshot({ path: join(out, `_error-${i}.png`), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await mcp.close();
  await db.end();
}

const failed = results.filter((r) => r.ok === false);
console.log(JSON.stringify(results, null, 2));
log(failed.length ? `AT-2: ${failed.length} FAILED` : "AT-2: all executed checks passed");
process.exit(failed.length ? 1 : 0);
