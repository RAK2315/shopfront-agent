// Demo order history (walkthrough #2, D-087): real PayPal sandbox purchases for the demo shops, so the Studio and
// the dashboard show real data. Every order is a test run (flagged `is_test`, shown to the demo seller with a
// "Test run" badge). Nothing is backdated: the history grows on the days this and the ATs run.
//   each order: MCP create_checkout (server-priced) → PayPal approval on PayPal's page (sandbox buyer) → /pay/return
//   captures → some shipped with tracking (PayPal /track), some refunded (policy → PayPal refund)
// Usage: pnpm --filter web demo-history -- --base https://shopfront-agent.onrender.com [--orders 10]
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "@playwright/test";
import pg from "pg";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const howMany = Number(arg("--orders", "10"));
const out = resolve(arg("--out", "../../docs/screenshots/demo-history")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Baskets: mostly one item, some two, across both demo shops (one seller per checkout).
const BASKETS: Array<Array<{ variant_id: string; quantity: number }>> = [
  [{ variant_id: "var_speckoat0000", quantity: 1 }],
  [{ variant_id: "var_cobalt120000", quantity: 2 }],
  [{ variant_id: "var_budwhite0000", quantity: 1 }],
  [{ variant_id: "var_specksea0000", quantity: 1 }, { variant_id: "var_budclay00000", quantity: 1 }],
  [{ variant_id: "var_ashbowl11000", quantity: 1 }],
  [{ variant_id: "var_indigo400000", quantity: 1 }],
  [{ variant_id: "var_shibori10000", quantity: 2 }],
  [{ variant_id: "var_speckoat0000", quantity: 2 }],
  [{ variant_id: "var_runner720000", quantity: 1 }],
  [{ variant_id: "var_cobalt120000", quantity: 1 }, { variant_id: "var_speckoat0000", quantity: 1 }],
  [{ variant_id: "var_budclay00000", quantity: 1 }],
  [{ variant_id: "var_shibori10000", quantity: 1 }],
];
const buyers = [
  { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD },
  ...(e.SANDBOX_BUYER2_EMAIL ? [{ email: e.SANDBOX_BUYER2_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD }] : []),
];

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q1 = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as R | undefined;
await db.query("update variants set stock = greatest(stock, 20) where id = any($1)", [[...new Set(BASKETS.flat().map((b) => b.variant_id))]]);
const paypal = createPayPalApi(new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL, clientId: e.PAYPAL_CLIENT_ID, clientSecret: e.PAYPAL_CLIENT_SECRET }));
const mcp = new Client({ name: "demo-history", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
async function tool<T = Record<string, unknown>>(name: string, a: Record<string, unknown>): Promise<T> {
  const r = await mcp.callTool({ name, arguments: a });
  const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
  if (r.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text) as T;
}

// The demo seller's session (for tracking and refund approvals), as the Studio would hold it.
const sess = await fetch(`${base}/api/seller/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: "juniper_clay" }) });
const cookie = (sess.headers.get("set-cookie") ?? "").split(";")[0]!;
const seller = (path: string, body: unknown) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) });

const browser = await chromium.launch({ headless: false, channel: "chromium" }); // PayPal's sandbox login fails headless
const made: Array<{ checkout: string; seller: string; total: string; buyer: number; shipped?: string; refund?: string }> = [];
try {
  for (let i = 0; i < howMany; i++) {
    const items = BASKETS[i % BASKETS.length]!;
    const buyerIdx = i % buyers.length;
    const ck = await tool<{ checkout_id: string; pay_url: string; paypal_order_id: string; totals: { total: string } }>("create_checkout", { items, client_request_id: randomUUID() });
    const { data } = await paypal.getOrder(ck.paypal_order_id);
    const href = (data as { links?: Array<{ rel: string; href: string }> }).links?.find((l) => l.rel === "payer-action")?.href;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const page = await ctx.newPage();
    try {
      await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await loginAndApprove(page, buyers[buyerIdx]!);
      await page.waitForURL(/\/pay\/chk_/, { timeout: 90_000 });
    } catch (err) {
      log("approval failed, skipping", ck.checkout_id, err instanceof Error ? err.message.split("\n")[0] : err);
      await ctx.close();
      continue;
    }
    await ctx.close();
    let row: { status: string; handle: string } | undefined;
    for (let k = 0; k < 20 && row?.status !== "paid"; k++) {
      row = await q1<{ status: string; handle: string }>("select c.status, s.handle from checkouts c join sellers s on s.id = c.seller_id where c.id = $1", [ck.checkout_id]);
      if (row?.status !== "paid") await sleep(2000);
    }
    const entry: (typeof made)[number] = { checkout: ck.checkout_id, seller: row?.handle ?? "?", total: ck.totals.total, buyer: buyerIdx + 1 };
    made.push(entry);
    log("paid", ck.checkout_id, row?.handle, `$${ck.totals.total}`);

    // Juniper Clay ships most orders (the demo seller can sign in); one in four is refunded instead.
    if (row?.handle === "juniper_clay" && row.status === "paid") {
      if (i % 4 === 3) {
        const token = new URL(ck.pay_url).searchParams.get("t")!;
        const r = await tool<{ refund_request_id: string; decision: string }>("request_refund", { checkout_id: ck.checkout_id, order_token: token, reason_code: "damaged", details: "Arrived with a chipped rim." });
        if (r.decision !== "auto_approve") await seller(`/api/seller/refunds/${r.refund_request_id}`, { approve: true });
        entry.refund = r.decision;
      } else if (i % 4 !== 2) {
        const tn = `9400111${String(Date.now()).slice(-12)}${i}`.slice(0, 22);
        const t = await seller(`/api/seller/orders/${ck.checkout_id}/tracking`, { carrier: "USPS", tracking_number: tn, source: "manual" });
        entry.shipped = t.ok ? "USPS" : `failed ${t.status}`;
      }
    }
  }
} finally {
  writeFileSync(join(out, `history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(made, null, 2));
  log(`${made.length}/${howMany} orders paid`, JSON.stringify(made.map((m) => [m.seller, m.total, m.shipped ?? m.refund ?? "paid"])));
  await browser.close().catch(() => {});
  await mcp.close().catch(() => {});
  await db.end();
}
