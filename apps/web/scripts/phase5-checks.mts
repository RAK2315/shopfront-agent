// Phase 5 acceptance tests (AT-5) against the DEPLOYED app (real LLM turns, real PayPal sandbox calls, no mocks):
//   1  "Show refunds by product this week" → the agent adds a correctly configured widget; money data unchanged (checksum)
//   2  an inline ledger edit persists across a reload; a custom layout persists across a reload
//   3  4 refunds within 10 minutes → a refund-spike alert widget appears with an explanation
//   4  "What sold this week?" → figures labelled [db] and [paypal]; the PayPal figures match /v1/reporting/transactions
//   5  the dashboard updates live while a purchase happens in another browser
//   6  Lighthouse accessibility ≥ 90 on the dashboard and the storefront
// Usage: pnpm --filter web phase5-checks -- --base https://shopfront-agent.onrender.com [--only 1,2,3,4,5,6]
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
const out = resolve(arg("--out", "../../docs/screenshots/phase-5")!);
const only = new Set((arg("--only", "1,2,3,4,5,6") ?? "").split(","));
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
const mcp = new Client({ name: "phase5-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
const tool = async (name: string, a: Record<string, unknown>) => {
  const r = await mcp.callTool({ name, arguments: a });
  return { isError: Boolean(r.isError), body: JSON.parse((r.content as Array<{ text: string }>)[0]!.text) };
};

/**
 * Every money value, hashed: the agent may only change views (AT-5 #1). Statuses are left out on purpose, because the
 * deployed server's fallback timers legitimately expire old unpaid checkouts while a test runs.
 */
const moneyChecksum = async () =>
  (
    await q1<{ h: string }>(`select md5(coalesce((select string_agg(concat_ws('|', c.id, c.total_cents, c.item_total_cents, c.shipping_cents, cap.amount_cents, cap.refunded_cents), ',' order by c.id)
       from checkouts c left join captures cap on cap.checkout_id = c.id), '') ||
       coalesce((select string_agg(concat_ws('|', id, amount_cents), ',' order by id) from refund_requests), '') ||
       coalesce((select string_agg(concat_ws('|', id, price_cents), ',' order by id) from variants), '')) h`)
  )!.h;

const browser = await chromium.launch({ headless: false, channel: "chromium" });
const seller: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await seller.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
await db.query("update sellers set dashboard_state = null where handle = 'juniper_clay'"); // start from the preset
const dash: Page = await seller.newPage();
const turns: Array<{ src?: string; tools?: string[]; text?: string }> = [];
const insights: Array<{ tool: string; req: { from: string; to: string }; res: Record<string, unknown> }> = [];
dash.on("response", async (r) => {
  if (r.url().includes("/api/studio/turn")) turns.push(await r.json().catch(() => ({})));
  if (r.url().includes("/api/seller/insights") && r.ok()) {
    const req = JSON.parse(r.request().postData() ?? "{}");
    insights.push({ tool: req.tool, req: await r.json().then((j) => ({ from: j.from, to: j.to })).catch(() => req.args), res: await r.json().catch(() => ({})) });
  }
});
const studio = <T,>(fn: string) => dash.evaluate(`(() => { const api = window.__shopfrontStudio; return (${fn})(api); })()`) as Promise<T>;
async function openDashboard() {
  await dash.goto(`${base}/studio/dashboard`, { waitUntil: "load", timeout: 180_000 });
  await dash.locator(".ag-row").first().waitFor({ timeout: 120_000 });
  await until("the Studio API", () => studio<boolean>("(api) => !!api"), 60_000, 1000);
}
async function ask(prompt: string) {
  const before = turns.length;
  await dash.getByPlaceholder("Ask the AI Assistant...").fill(prompt);
  await dash.getByRole("button", { name: "Send message" }).click();
  await until("the agent to finish", async () => turns.length > before && !/Thinking/.test(await dash.locator("body").innerText()), 300_000, 2000);
  await sleep(1500);
  return turns.slice(before);
}

async function buy(sku: string, quantity: number, buyer: { email: string; password: string }) {
  await db.query("update variants set stock = greatest(stock, 30) where sku=$1", [sku]);
  const v = (await q1<{ id: string }>("select id from variants where sku=$1", [sku]))!.id;
  const { body: c } = await tool("create_checkout", { items: [{ variant_id: v, quantity }] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
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
      await sleep(8000);
      await page.reload({ waitUntil: "load" });
      await page.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    }
  }
  await page.getByText("Payment complete").waitFor({ timeout: 120_000 });
  await ctx.close();
  return { ...c, variantId: v } as { checkout_id: string; order_token: string; variantId: string };
}

try {
  await openDashboard();
  await dash.screenshot({ path: join(out, "dashboard-desktop.png") });

  // ── 1 ──
  if (only.has("1")) {
    const sumBefore = await moneyChecksum();
    const widgetsBefore = await studio<string[]>("(api) => Object.keys(api.getState().pages[0].widgets)");
    const tt = await ask("Show refunds by product this week");
    const state = await studio<{ pages: Array<{ widgets: Record<string, { type: string; dataMapping: Record<string, Array<{ id: string; aggregation?: string }>> }>; filter?: unknown }> }>("(api) => api.getState()");
    const added = Object.entries(state.pages[0]!.widgets).filter(([id]) => !widgetsBefore.includes(id));
    const fields = added.flatMap(([, w]) => Object.values(w.dataMapping ?? {}).flat().map((f) => `${f.id}${f.aggregation ? `:${f.aggregation}` : ""}`));
    const sumAfter = await moneyChecksum();
    await dash.screenshot({ path: join(out, "dashboard-agent-widget-desktop.png") });
    record(
      "1 'Show refunds by product this week' → agent adds a configured widget; money data unchanged",
      added.length >= 1 && fields.some((f) => f.startsWith("refunds.product")) && fields.some((f) => f.startsWith("refunds.amount_usd") || f.startsWith("refunds.refund")) && sumBefore === sumAfter,
      { added: added.map(([id, w]) => ({ id, type: w.type })), fields, pageFilter: Boolean(state.pages[0]!.filter), turns: tt.map((x) => `${x.src}:${(x.tools ?? []).join("+") || "text"}`), checksumUnchanged: sumBefore === sumAfter },
    );
  }

  // ── 4 ──
  if (only.has("4")) {
    const before = insights.length;
    const tt = await ask("What sold this week?");
    const answer = tt.map((x) => x.text ?? "").join("\n");
    const pp = insights.slice(before).find((x) => x.tool === "paypal_transactions");
    let match = false;
    let independent: unknown = null;
    if (pp) {
      const { data } = await paypal.listTransactions(pp.req.from, pp.req.to);
      const tx = (data.transaction_details ?? []).map((d) => d.transaction_info);
      const sales = tx.filter((x) => /^T00\d\d$/.test(x.transaction_event_code ?? "") && Number(x.transaction_amount?.value ?? 0) > 0);
      const gross = sales.reduce((n, x) => n + Number(x.transaction_amount!.value), 0).toFixed(2);
      independent = { count: sales.length, gross };
      const toolSales = pp.res.sales as { count: number; gross_usd: string };
      match = toolSales.count === sales.length && toolSales.gross_usd === gross && answer.replace(/,/g, "").includes(Number(gross).toFixed(2).replace(/\.00$/, ""));
    }
    await dash.screenshot({ path: join(out, "dashboard-what-sold-desktop.png") });
    record("4 'What sold this week?' → figures labelled [db] and [paypal]; PayPal figures match Transaction Search", /\[db\]/i.test(answer) && /\[paypal\]/i.test(answer) && match, {
      answer: answer.slice(0, 400),
      paypalTool: pp?.res.sales,
      independent,
    });
  }

  // ── 2 ──
  if (only.has("2")) {
    const note = `Gift wrap · ${Date.now().toString().slice(-5)}`;
    const firstRow = dash.locator('.ag-row[row-id^="chk_"]').first();
    const orderId = (await firstRow.getAttribute("row-id"))!;
    const cell = firstRow.locator('[col-id="note"]');
    await sleep(4000); // let the live-event reloads after connect settle before editing
    await cell.scrollIntoViewIfNeeded();
    // Focus the ✎ cell and press Enter: in Studio's edit mode, keyboard editing works (pointer gestures go to Studio).
    await cell.press("Enter");
    await dash.locator(".ag-cell-inline-editing").waitFor({ timeout: 10_000 });
    await dash.keyboard.press("ControlOrMeta+a");
    await dash.keyboard.type(note);
    const saved = dash.waitForResponse((r) => r.url().includes("/ledger") && r.request().method() === "PATCH", { timeout: 15_000 }).catch(() => null);
    await dash.keyboard.press("Enter");
    const patch = await saved;
    if (!patch) await dash.screenshot({ path: join(out, "_ledger-edit.png") });
    log("ledger PATCH", patch?.status() ?? "none");
    await until("the note to save", async () => (await q1<{ internal_note: string }>("select internal_note from checkouts where id=$1", [orderId]))?.internal_note === note, 20_000, 1000);
    // Layout: widen the revenue tile, as a seller dragging it would.
    await studio("(api) => { const s = api.getState(); s.pages[0].widgetLayout.revenue.xSpan = 9; s.pages[0].widgetLayout.orders.xTrack = 9; s.pages[0].widgetLayout.orders.xSpan = 3; window.__shopfrontApplyState(s); }");
    await until("the layout to save", async () => (await q1<{ x: number }>("select (dashboard_state->'state'->'pages'->0->'widgetLayout'->'revenue'->>'xSpan')::int x from sellers where handle='juniper_clay'"))?.x === 9, 20_000, 1000);
    await openDashboard();
    const noteAfter = await dash.locator(`.ag-row[row-id="${orderId}"] [col-id="note"]`).first().innerText();
    const span = await studio<number>("(api) => api.getState().pages[0].widgetLayout.revenue.xSpan");
    record("2 inline ledger edit and custom layout survive a reload", noteAfter.trim() === note && span === 9, { orderId, note: noteAfter.trim(), revenueTileSpan: span });
  }

  // ── 5 + 3 ──
  if (only.has("5") || only.has("3")) {
    await dash.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    const buyer = { email: e.SANDBOX_BUYER2_EMAIL || e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD || e.SANDBOX_BUYER_PASSWORD };
    const order = await buy("JCS-MUG-COBALT", 4, buyer);
    const row = await until("the new order in the live ledger", async () => (await dash.locator(`.ag-row[row-id="${order.checkout_id}"]`).count()) > 0, 90_000, 1000).catch(() => false);
    const noReload = await dash.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload === true);
    await dash.screenshot({ path: join(out, "dashboard-live-order-desktop.png") });
    if (only.has("5")) record("5 dashboard updates live during a purchase in another browser", Boolean(row) && noReload, { checkout: order.checkout_id, appeared: Boolean(row), noReload });

    if (only.has("3")) {
      // Four real partial refunds of one mug each, inside 10 minutes. Ones the policy routes to the seller are approved.
      const ids: string[] = [];
      for (let i = 0; i < 4; i++) {
        const r = await tool("request_refund", { checkout_id: order.checkout_id, order_token: order.order_token, reason_code: "wrong_size", items: [{ variant_id: order.variantId, quantity: 1 }] });
        if (r.isError) throw new Error(`refund ${i + 1}: ${JSON.stringify(r.body)}`);
        if (r.body.decision === "needs_seller") await seller.request.post(`${base}/api/seller/refunds/${r.body.refund_request_id}`, { data: { approve: true } });
        await until(`refund ${i + 1} executed`, async () => (await q1<{ status: string }>("select status from refund_requests where id=$1", [r.body.refund_request_id]))?.status === "executed", 60_000, 1500);
        ids.push(r.body.refund_request_id);
      }
      const alertId = await until(
        "the refund-spike alert widget",
        () => studio<string | undefined>("(api) => Object.keys(api.getState().pages[0].widgets).find((k) => k.startsWith('refund-spike-'))"),
        60_000,
        1500,
      ).catch(() => undefined);
      const alertText = alertId ? await studio<string>(`(api) => api.getState().pages[0].widgets['${alertId}'].format.style.text`) : "";
      await dash.screenshot({ path: join(out, "dashboard-refund-spike-desktop.png") });
      record("3 four refunds in 10 minutes → refund-spike alert widget with an explanation", Boolean(alertId) && /refunds in the last 10 minutes/.test(alertText), { refunds: ids.length, alertId, alertText: alertText.slice(0, 160) });
    }
  }

  // ── 6 ──
  if (only.has("6")) {
    const cookie = (await seller.cookies(base)).map((c) => `${c.name}=${c.value}`).join("; ");
    const scores: Record<string, number | null> = {};
    for (const [name, url, headers] of [
      ["dashboard", `${base}/studio/dashboard`, JSON.stringify({ Cookie: cookie })],
      ["storefront", `${base}/s/juniper_clay`, "{}"],
    ] as const) {
      const file = join(out, `lighthouse-${name}.json`);
      const hdrFile = join(tmpdir(), `shopfront-lh-headers-${name}.json`); // outside the repo: it holds the session cookie
      writeFileSync(hdrFile, headers);
      spawnSync("npx", ["--yes", "lighthouse@12.8.2", url, "--only-categories=accessibility", "--output=json", `--output-path=${file}`, `--extra-headers=${hdrFile}`, "--chrome-flags=--headless=new", "--quiet"], { shell: true, encoding: "utf8", timeout: 300_000 });
      try {
        scores[name] = Math.round(JSON.parse(readFileSync(file, "utf8")).categories.accessibility.score * 100);
      } catch {
        scores[name] = null;
      }
      writeFileSync(hdrFile, "{}"); // never leave the session cookie on disk
    }
    record("6 Lighthouse accessibility ≥ 90 on dashboard and storefront", (scores.dashboard ?? 0) >= 90 && (scores.storefront ?? 0) >= 90, scores);
  }
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
  await dash.screenshot({ path: join(out, "_error.png"), fullPage: true }).catch(() => {});
} finally {
  await browser.close();
  await mcp.close();
  await db.end();
}
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify(results, null, 2));
log(failed.length ? `AT-5: ${failed.length} FAILED` : "AT-5: all checks passed");
process.exit(failed.length ? 1 : 0);
