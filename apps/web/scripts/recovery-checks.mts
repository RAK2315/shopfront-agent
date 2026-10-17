// Webhook and capture recovery ATs (REVIEW-1 #8, AT-9 "Webhook recovery") plus the mcp_client_name fix, run against
// the DEPLOYED app with real PayPal sandbox calls:
//   R1  PayPal's verify endpoint unavailable (signed fault hook) → 503 and nothing stored; a real verify FAILURE → 200
//   R2  a verified event left unprocessed → after a Render restart the boot sweep processes it once
//   R3  INSTRUMENT_DECLINED (PayPal's sandbox negative testing via the signed hook) → 422, attempt bumped, and the
//       next capture goes out as capture-<id>-1 and pays
//   R4  stateless /mcp names the agent from its headers: x-shopfront-client, else the User-Agent product
// Usage: pnpm --filter web recovery-checks -- --base https://shopfront-agent.onrender.com [--only R1,R2,R3,R4]
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/recovery")!);
const only = new Set((arg("--only", "R1,R2,R3,R4") ?? "").split(","));
const e = process.env as Record<string, string>;
const SERVICE_ID = "srv-db8e76dg1s2s739vvv0g";
const COBALT = "var_cobalt120000";
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });

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
const faultHeaders = (name: string) => ({ "x-shopfront-fault": name, "x-shopfront-fault-sig": createHmac("sha256", e.SESSION_SECRET).update(`fault:${name}`).digest("base64url") });

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q1 = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as R | undefined;

async function mcpClient(name: string, headers: Record<string, string> = {}) {
  const c = new Client({ name, version: "1.0.0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers } }));
  return c;
}
async function tool<T = Record<string, unknown>>(c: Client, name: string, a: Record<string, unknown>): Promise<T> {
  const r = await c.callTool({ name, arguments: a });
  const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}
type Checkout = { checkout_id: string; pay_url: string; paypal_order_id: string };
const buyCobalt = (c: Client) => tool<Checkout>(c, "create_checkout", { items: [{ variant_id: COBALT, quantity: 1 }], client_request_id: randomUUID() });

// A fake but well-formed PayPal delivery: the signature is garbage, so a real verify says FAILURE.
function fakeDelivery() {
  const id = `WH-AT-${randomUUID()}`;
  const body = JSON.stringify({ id, event_type: "PAYMENT.CAPTURE.COMPLETED", resource_type: "capture", resource: { id: "AT0000000000000000" } });
  const headers = {
    "content-type": "application/json",
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-ab66f33d",
    "paypal-transmission-id": randomUUID(),
    "paypal-transmission-sig": "AAAA" + "x".repeat(340),
    "paypal-transmission-time": new Date().toISOString(),
  };
  return { id, body, headers };
}

// ---------- R1: verify outage → 503, nothing stored; a genuine FAILURE verdict → 200, stored unverified ----------
if (only.has("R1")) {
  const d = fakeDelivery();
  const r1 = await fetch(`${base}/webhooks/paypal`, { method: "POST", headers: { ...d.headers, ...faultHeaders("verify-unavailable") }, body: d.body });
  const stored1 = await q1("select 1 from webhook_events where event_id = $1", [d.id]);
  const r2 = await fetch(`${base}/webhooks/paypal`, { method: "POST", headers: d.headers, body: d.body });
  const j2 = (await r2.json()) as { verified?: boolean };
  const row = await q1<{ verified: boolean; deliveries: number }>("select verified, deliveries from webhook_events where event_id = $1", [d.id]);
  record("R1 verify outage → 503 + nothing stored; real FAILURE → 200 unverified", r1.status === 503 && !stored1 && r2.status === 200 && j2.verified === false && row?.verified === false, {
    outageStatus: r1.status,
    storedAfterOutage: Boolean(stored1),
    verdictStatus: r2.status,
    verified: j2.verified,
    row,
  });
}

// ---------- R4: the agent's name on stateless /mcp ----------
if (only.has("R4")) {
  const named = await mcpClient("recovery-checks", { "x-shopfront-client": "recovery-checks" });
  const a = await buyCobalt(named);
  await named.close();
  // A raw JSON-RPC tool call with no initialize and no x-shopfront-client, as a remote connector might send it.
  const raw = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "user-agent": "Claude-User/1.0 (+recovery-checks)" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "create_checkout", arguments: { items: [{ variant_id: COBALT, quantity: 1 }], client_request_id: randomUUID() } } }),
  });
  const rj = (await raw.json()) as { result?: { structuredContent?: Checkout } };
  const b = rj.result?.structuredContent;
  const ca = await q1<{ mcp_client_name: string | null; source: string }>("select mcp_client_name, source from checkouts where id = $1", [a.checkout_id]);
  const cb = b ? await q1<{ mcp_client_name: string | null; source: string }>("select mcp_client_name, source from checkouts where id = $1", [b.checkout_id]) : undefined;
  const payHtml = b ? await (await fetch(b.pay_url)).text() : "";
  record("R4 /mcp names the agent: header, then User-Agent; /pay says 'Prepared by Claude'", ca?.mcp_client_name === "recovery-checks" && cb?.mcp_client_name === "Claude-User" && /Prepared by .{0,80}Claude/.test(payHtml.replace(/<[^>]+>/g, "")), {
    header: ca,
    userAgent: cb,
    payPageNamesClaude: /Prepared by .{0,80}Claude/.test(payHtml.replace(/<[^>]+>/g, "")),
  });
}

// ---------- R3: decline → new request id on the next capture ----------
if (only.has("R3")) {
  await db.query("update variants set stock = greatest(stock, 20) where id = $1", [COBALT]);
  const c = await mcpClient("recovery-checks", { "x-shopfront-client": "recovery-checks" });
  const ck = await buyCobalt(c);
  await c.close();
  log("R3 checkout", ck.checkout_id);
  const browser = await chromium.launch({ headless: false, channel: "chromium" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let faulted = 0;
  // Only the buyer's first capture carries the signed fault, so PayPal's sandbox answers INSTRUMENT_DECLINED once.
  await page.route(/\/api\/checkouts\/[^/]+\/capture$/, (route) => {
    const extra = faulted++ === 0 ? faultHeaders("capture-declined") : {};
    return route.continue({ headers: { ...route.request().headers(), ...extra } });
  });
  await page.goto(ck.pay_url, { waitUntil: "load" });
  const buyer = { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD };
  const approve = async () => {
    await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    for (let i = 1; ; i++) {
      const popupP = page.waitForEvent("popup", { timeout: 20_000 });
      await page.locator("paypal-button").click();
      const popup = await popupP.catch(() => null);
      if (!popup) {
        if (i >= 3) throw new Error("popup did not open");
        continue;
      }
      try {
        // A second approval in the same context may skip the login (PayPal remembers the buyer).
        const email = popup.locator("#email, input[name='login_email']").first();
        const pay = popup.getByRole("button", { name: /complete purchase|pay now|^pay$|continue to review|agree.*pay/i }).first();
        const which = await Promise.race([email.waitFor({ timeout: 45_000 }).then(() => "login"), pay.waitFor({ timeout: 45_000 }).then(() => "pay")]);
        if (which === "login") await loginAndApprove(popup, buyer);
        else {
          await popup.waitForTimeout(1500);
          await pay.click();
        }
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
  };
  await approve();
  const declined = await until(
    "the declined capture event",
    () => q1<{ data: Record<string, string> }>("select data from events where checkout_id = $1 and kind = 'capture_declined' order by id desc", [ck.checkout_id]),
    90_000,
  );
  await page.getByRole("alert").filter({ hasText: /declined/i }).waitFor({ timeout: 30_000 });
  await page.screenshot({ path: join(out, "R3-declined-desktop.png") });
  const afterDecline = await q1<{ capture_attempt: number; status: string }>("select capture_attempt, status from checkouts where id = $1", [ck.checkout_id]);
  // PayPal's mock declined only the response; the order is still APPROVED. The CHECKOUT.ORDER.APPROVED webhook may
  // capture it as attempt 1 before the buyer retries; otherwise the buyer approves again and the pay page captures.
  await sleep(15_000);
  let st = await q1<{ status: string }>("select status from checkouts where id = $1", [ck.checkout_id]);
  if (st?.status !== "paid") {
    await approve();
    st = await until("the checkout to be paid", async () => {
      const r = await q1<{ status: string }>("select status from checkouts where id = $1", [ck.checkout_id]);
      return r?.status === "paid" ? r : null;
    }, 90_000);
  }
  await page.locator('[data-testid="webhook-state"]').waitFor({ timeout: 60_000 }).catch(() => {});
  await page.screenshot({ path: join(out, "R3-paid-desktop.png") });
  const calls = (await db.query("select paypal_request_id, status, debug_id from paypal_calls where checkout_id = $1 and path like '%/capture' order by id", [ck.checkout_id])).rows as Array<{ paypal_request_id: string; status: number; debug_id: string }>;
  const firstId = `capture-${ck.checkout_id}`;
  const retryId = `capture-${ck.checkout_id}-1`;
  record("R3 decline → 422 + attempt 1; the next capture is capture-<id>-1 and pays", declined.data.paypalRequestId === firstId && declined.data.nextRequestId === retryId && afterDecline?.capture_attempt === 1 && calls.some((x) => x.paypal_request_id === firstId && x.status === 422) && calls.some((x) => x.paypal_request_id === retryId && x.status < 300) && st?.status === "paid", {
    checkout: ck.checkout_id,
    declined: declined.data,
    afterDecline,
    captureCalls: calls,
    final: st?.status,
  });
  await browser.close();
}

// ---------- R2: a verified event left unprocessed → the boot sweep processes it after a restart ----------
if (only.has("R2")) {
  const ev = await q1<{ event_id: string; attempts: number }>(
    `select w.event_id, w.attempts from webhook_events w join checkouts c on c.paypal_order_id = w.payload->'resource'->'supplementary_data'->'related_ids'->>'order_id'
      where w.verified and w.processed_at is not null and w.error is null and w.event_type = 'PAYMENT.CAPTURE.COMPLETED' and c.is_test
      order by w.received_at desc limit 1`,
  );
  if (!ev) throw new Error("R2 needs a verified, processed capture webhook for a test checkout (run R3 first)");
  // Simulate "stored and answered 200, then the process died before processing" for this one event.
  await db.query("update webhook_events set processed_at = null, error = null, last_delivery_at = now() - interval '5 minutes' where event_id = $1", [ev.event_id]);
  log("R2 reset event", ev.event_id, "; restarting Render");
  const restartAt = new Date();
  const r = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/restart`, { method: "POST", headers: { Authorization: `Bearer ${e.RENDER_API_KEY}` } });
  if (!r.ok) throw new Error(`Render restart ${r.status}`);
  const swept = await until(
    "the sweep to process the event",
    () => q1<{ data: { eventIds: string[]; reason: string }; created_at: Date }>("select data, created_at from events where kind = 'webhook_swept' and created_at > $1 and data->'eventIds' ? $2 order by id desc", [restartAt, ev.event_id]),
    6 * 60_000,
    5000,
  );
  const row = await q1<{ processed_at: Date | null; attempts: number; error: string | null }>("select processed_at, attempts, error from webhook_events where event_id = $1", [ev.event_id]);
  record("R2 restart → boot sweep processes the stored, unprocessed event once", swept.data.reason === "boot" && row?.processed_at !== null && row!.attempts === ev.attempts + 1, {
    eventId: ev.event_id,
    reason: swept.data.reason,
    sweptAt: swept.created_at,
    row,
  });
}

await db.end();
writeFileSync(join(out, "recovery-results.json"), JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
log(failed.length ? `${failed.length} FAILED` : `ALL ${results.length} PASSED`);
process.exit(failed.length ? 1 : 0);
