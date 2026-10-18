// Owner fix list of 2026-10-18 evening (D-094) on the DEPLOYED app, real PayPal sandbox:
//   X1  /privacy and /terms exist (PayPal's Log in with PayPal consent page links to them) and the landing links them
//   X2  the site nav is on every Studio page (Listings, Orders, Dashboard overview and builder)
//   X3  demo stock never runs out: a demo variant bought down to 0 is restocked at once; the demo reset restocks too
//   X4  judge mode's "Simulate a refund" survives a service restart (the order token is re-derived, never stored)
// Usage: pnpm --filter web fixes3-checks -- --base https://shopfront-agent.onrender.com [--only X1,X2]
import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Browser } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/fixes-3")!);
const only = new Set((arg("--only", "X1,X2,X3,X4") ?? "").split(","));
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
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms = 60_000, every = 1500): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(every);
  }
}
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q1 = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as R | undefined;
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");

/** Approve a PayPal order on PayPal's own page as the sandbox buyer (redirect flow), with one retry for sandbox hiccups. */
async function approve(browser: Browser, paypalOrderId: string) {
  const tok = await (await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, { method: "POST", headers: { authorization: "Basic " + Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })).json();
  const order = await (await fetch(`${e.PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}`, { headers: { authorization: `Bearer ${tok.access_token}` } })).json();
  const href = (order.links as Array<{ rel: string; href: string }>).find((l) => l.rel === "payer-action")!.href;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(href, { waitUntil: "domcontentloaded" });
        await loginAndApprove(page, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
        await page.waitForURL(/\/pay\/chk_/, { timeout: 90_000 });
        return;
      } catch (err) {
        if (attempt >= 2) throw err;
        await sleep(8000);
      }
    }
  } finally {
    await ctx.close();
  }
}

const browser = await chromium.launch({ headless: false, channel: "chromium" }); // PayPal's sandbox login fails headless
try {
  if (only.has("X1")) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const res: Record<string, unknown> = {};
    for (const [path, h1] of [["/privacy", "Privacy"], ["/terms", "Terms of use"]] as const) {
      const r = await page.goto(base + path, { waitUntil: "load" });
      res[path] = { status: r?.status(), h1: (await page.locator("h1").innerText()).trim(), sandbox: /sandbox/i.test(await page.locator("main").innerText()) };
      await page.screenshot({ path: join(out, `X1${path.replace("/", "-")}-desktop.png`), fullPage: true });
      Object.assign(res[path] as object, { ok: r?.status() === 200 && (await page.locator("h1").innerText()).trim() === h1 });
    }
    await page.goto(base + "/", { waitUntil: "load" });
    const footer = await page.locator("footer a").evaluateAll((els) => els.map((a) => a.getAttribute("href")));
    record("X1 /privacy and /terms are live and linked from the landing", Object.values(res).every((x) => (x as { ok: boolean }).ok) && footer.includes("/privacy") && footer.includes("/terms"), { ...res, footer });
    await ctx.close();
  }

  if (only.has("X2")) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
    const page = await ctx.newPage();
    const seen: Record<string, number> = {};
    for (const path of ["/studio", "/studio/orders", "/studio/dashboard", "/studio/dashboard?tab=builder"]) {
      await page.goto(base + path, { waitUntil: "load" });
      seen[path] = await page.getByRole("navigation", { name: "Site" }).count();
      if (path === "/studio") await page.screenshot({ path: join(out, "X2-studio-with-site-nav-desktop.png") });
    }
    record("X2 the site nav is on every Studio page", Object.values(seen).every((n) => n === 1), seen);
    await ctx.close();
  }

  if (only.has("X3")) {
    const V = "var_budclay00000";
    await db.query("update variants set stock = 1 where id = $1", [V]);
    const mcp = new Client({ name: "fixes3-checks", version: "1.0.0" });
    await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const r = await mcp.callTool({ name: "create_checkout", arguments: { items: [{ variant_id: V, quantity: 1 }], client_request_id: randomUUID() } });
    const ck = JSON.parse((r.content as Array<{ text: string }>)[0]!.text) as { checkout_id: string; paypal_order_id: string };
    await approve(browser, ck.paypal_order_id);
    await until("paid", () => q1("select 1 from checkouts where id = $1 and status = 'paid'", [ck.checkout_id]), 60_000);
    const afterSale = (await q1<{ stock: number }>("select stock from variants where id = $1", [V]))!.stock;
    const search = await mcp.callTool({ name: "get_product", arguments: { product_id: "prd_budvases0000" } });
    const available = (JSON.parse((search.content as Array<{ text: string }>)[0]!.text) as { variants: Array<{ variant_id: string; available: boolean }> }).variants.find((x) => x.variant_id === V)?.available;
    await mcp.close();
    // The demo reset restocks every demo shop too.
    await db.query("update variants set stock = 0 where id in ('var_cobalt120000', 'var_judgemug1000', 'var_shibori10000')");
    const reset = await (await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify({ action: "reset" }) })).json();
    const low = (await db.query("select v.id, v.stock from variants v join products p on p.id = v.product_id join sellers s on s.id = p.seller_id where v.active and p.status = 'approved' and s.handle in ('juniper_clay','fern_and_loom','judge_demo') and v.stock < 20")).rows;
    record("X3 a demo variant sold down to 0 restocks at once; the demo reset restocks every demo shop", afterSale === 20 && available === true && low.length === 0, { checkout: ck.checkout_id, stockAfterSale: afterSale, availableToAgents: available, reset, belowTwentyAfterReset: low });
  }

  if (only.has("X4")) {
    const CHAT = -(8_000_000_000 + Math.floor(Math.random() * 1e8));
    const hash = createHash("sha256").update(`tg:${CHAT}`).digest("hex").slice(0, 16);
    let upd = Math.floor(Date.now() / 1000) * 10 + 7;
    const hook = (body: unknown) => fetch(`${base}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": e.TELEGRAM_WEBHOOK_SECRET }, body: JSON.stringify(body) });
    const text = (s: string) => hook({ update_id: ++upd, message: { message_id: upd, date: Math.floor(Date.now() / 1000), chat: { id: CHAT }, text: s } });
    const tap = (data: string) => hook({ update_id: ++upd, callback_query: { id: `cq${upd}`, data, message: { message_id: 1, chat: { id: CHAT } } } });
    const sent = (kind: string, after: Date) => q1<{ checkout_id: string | null; text: string }>("select checkout_id, data->>'text' text from events where kind='telegram_sent' and data->>'chat'=$1 and data->>'kind'=$2 and created_at >= $3 order by id desc limit 1", [hash, kind, after]);
    try {
      const t0 = new Date();
      await text("/start judge");
      await until("welcome", () => sent("welcome", t0));
      await tap("m:simbuy:var_judgemug1000");
      const so = await until("simulated order", () => sent("simulated_order", t0), 60_000);
      const ck = so.checkout_id!;
      const order = (await q1<{ paypal_order_id: string }>("select paypal_order_id from checkouts where id = $1", [ck]))!;
      await approve(browser, order.paypal_order_id);
      await until("order ping", () => sent("order_ping", t0), 90_000);
      log("X4: restarting the Render service (as Render free does after idling)");
      const rr = await fetch(`https://api.render.com/v1/services/srv-db8e76dg1s2s739vvv0g/restart`, { method: "POST", headers: { Authorization: `Bearer ${e.RENDER_API_KEY}` } });
      if (!rr.ok) throw new Error(`Render restart ${rr.status}`);
      await sleep(20_000);
      await until("the service back up", async () => (await fetch(`${base}/api/health`).catch(() => null))?.ok, 240_000, 5000);
      const t1 = new Date();
      await tap(`m:simrefund:${ck}`);
      const decided = await until("a refund decision after the restart", async () => (await sent("refund_auto", t1)) ?? (await sent("refund_request", t1)) ?? (await sent("simulated_refund", t1)), 90_000);
      const rq = await q1<{ status: string; decision: string }>("select status, decision from refund_requests where checkout_id = $1 order by created_at desc limit 1", [ck]);
      record("X4 'Simulate a refund' still works after a service restart", Boolean(rq) && !/can only simulate/i.test(decided.text ?? ""), { checkout: ck, botSaid: (decided.text ?? "").slice(0, 120), refundRequest: rq });
    } finally {
      await db.query("update telegram_links set revoked_at = now() where chat_id = $1", [String(CHAT)]).catch(() => {});
    }
  }
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
