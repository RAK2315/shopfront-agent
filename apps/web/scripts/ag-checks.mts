// Phase AG (AG Studio showcase, D-097/D-100/D-101; PLAN "Phase AG") on the DEPLOYED app, real data, no mocks:
//   L1  licensed: the Studio report mounts; no watermark element; no console errors (Studio prints its licence banner
//       with console.error, so a bad key would show here)
//   L2  ?aglicense=expired: Studio is not mounted; the notice + the Community overview with real rows; no console errors
//   L3  ?aglicense=missing: the same with reason no-key
//   L4  (--expect-no-key, a local build without the key) the report tab falls back with no query param
//   P1–P5  each of the 5 pages: every widget title shows, key figures equal the data API (revenue, orders, captured,
//       stock, attempts, the Cart API funnel), reconcile widget reads ✓; screenshots at desktop, 1920 and mobile
//   A1–A5  the Shop Manager answers 5 scripted questions; every [db]/[paypal] line in its reply is a tool's summary
//       line, and re-running that tool with the same arguments gives the same line (the figures are real)
//   A6  "refund order X" is refused: no tool runs, the reply says it can't, no refund row appears
//   C1  an AI change shows the "what changed" strip tagged AI; Undo restores the page exactly
//   C2  a seller's own change shows the strip untagged; Undo restores it
// Usage: pnpm --filter web ag-checks -- --base https://shopfront-agent.onrender.com [--only L1,P,A,C] [--expect-no-key]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type ConsoleMessage } from "@playwright/test";
import pg from "pg";
import { cartFunnel, type FunnelCart, type FunnelOrder } from "../src/lib/cart-funnel.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/ag")!);
const expectNoKey = args.includes("--expect-no-key");
const onlyArg = (arg("--only", expectNoKey ? "L4" : "L1,L2,L3,P,A,C") ?? "").split(",");
const want = (id: string) => onlyArg.some((o) => id === o || id.startsWith(o));
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const e = process.env as Record<string, string>;
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms: number, every = 1500): Promise<T> {
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

const browser = await chromium.launch({ headless: false, channel: "chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// Every console error and uncaught exception, trimmed. A licence banner line is reduced to a marker (never the key).
const errors: string[] = [];
const keep = (t: string) => (/\*{6}|licen[cs]e|watermark/i.test(t) ? "[AG licence banner line]" : t.slice(0, 160));
page.on("console", (m: ConsoleMessage) => m.type() === "error" && errors.push(keep(m.text())));
page.on("pageerror", (err) => errors.push("pageerror: " + keep(err.message)));
const turns: Array<{ text?: string; toolCalls?: Array<{ name: string }> }> = [];
page.on("response", async (r) => {
  if (r.url().includes("/api/studio/turn")) turns.push(await r.json().catch(() => ({})));
});

async function shots(name: string, fullMobile = true) {
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await sleep(1200);
    if (s.tag === "mobile" && (await page.getByTestId("dashboard").count())) {
      // The report on a phone: shrinking the window switches it to view mode, as a phone opens it.
      await sleep(1500);
    }
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `${name}-${s.tag}.png`), fullPage: fullMobile && s.tag === "mobile" });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(800);
  return overflow;
}
const watermarks = () => page.locator(".ag-studio-watermark, .ag-watermark").evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).length);
const studio = <T,>(fn: string) => page.evaluate(`(() => { const api = window.__shopfrontStudio; return (${fn})(api); })()`) as Promise<T>;
type Widget = { type: string; format?: { title?: { text?: string } } };
type State = { selectedPageId: string; pages: Array<{ id: string; widgets: Record<string, Widget>; widgetLayout: Record<string, unknown>; filter?: unknown }> };
const state = () => studio<State>("(api) => api.getState()");
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

async function openReport(query = "") {
  await page.goto(`${base}/studio/dashboard?tab=report${query}`, { waitUntil: "load", timeout: 180_000 });
}
/** The text of a widget: the nearest ancestor of its title that holds more than the title. */
const widgetText = (title: string) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll("body *")].find((x) => x.childElementCount === 0 && x.textContent?.trim() === t);
    let n: HTMLElement | null = el as HTMLElement | null;
    for (let i = 0; n && i < 8; i++, n = n.parentElement) if (n.innerText.split("\n").filter((l) => l.trim()).length > 1) return n.innerText;
    return null;
  }, title);

async function fallback(id: string, query: string, reason: string) {
  errors.length = 0;
  await openReport(query);
  const fb = page.getByTestId("studio-fallback");
  await fb.waitFor({ timeout: 90_000 }).catch(() => undefined);
  await page.locator("[data-testid=orders-grid] .ag-row").first().waitFor({ timeout: 60_000 }).catch(() => undefined);
  await sleep(2500);
  const got = await fb.getAttribute("data-reason").catch(() => null);
  const notice = await page.getByRole("status").filter({ hasText: "AG Studio report is paused" }).count();
  const rows = await page.locator("[data-testid=orders-grid] .ag-row").count();
  const studioMounted = await page.getByTestId("dashboard").count();
  const marks = await watermarks();
  const overflow = await shots(id.split(" ")[0] + "-fallback");
  record(id, got === reason && notice === 1 && rows > 0 && studioMounted === 0 && marks === 0 && errors.length === 0 && Object.values(overflow).every((o) => o <= 0), {
    reason: got,
    notice,
    rows,
    studioMounted,
    watermarks: marks,
    consoleErrors: [...errors],
    overflow,
  });
}

async function ask(prompt: string) {
  await page.evaluate(() => ((window as unknown as { __shopManagerLog: unknown[] }).__shopManagerLog = []));
  const before = turns.length;
  await page.getByPlaceholder("Ask the AI Assistant...").fill(prompt);
  await page.getByRole("button", { name: "Send message" }).click();
  await until("the Shop Manager to finish", async () => turns.length > before && !/Thinking/.test(await page.locator("body").innerText()) && turns.at(-1)?.text, 300_000, 2000);
  await sleep(2500);
  const mine = turns.slice(before);
  const reply = mine.map((t) => t.text ?? "").filter(Boolean).at(-1) ?? "";
  const tools = await page.evaluate(() => (window as unknown as { __shopManagerLog: Array<{ name: string; args: unknown; ok: boolean; result?: string }> }).__shopManagerLog);
  return { reply, tools, turns: mine };
}
/** A tool result as Studio reports it: {"success":true,"response":"<the JSON our tool returned>"}. */
function summaryOf(result?: string): string | undefined {
  try {
    const outer = JSON.parse(result || "{}") as { response?: string; summary_line?: string };
    const inner = typeof outer.response === "string" ? (JSON.parse(outer.response) as { summary_line?: string }) : outer;
    return inner.summary_line;
  } catch {
    return undefined;
  }
}
/** Re-run an insight tool the way the agent did, from the page (same session, same test-run marking). */
async function rerun(name: string, args: unknown) {
  const tools = name === "sales_summary" ? ["db_sales_summary", "paypal_transactions"] : [name];
  const found: string[] = [];
  for (const tool of tools) {
    const line = await page.evaluate(
      async ([t, a]) => {
        const r = await fetch("/api/seller/insights", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: t, args: a ?? {} }) });
        return ((await r.json().catch(() => ({}))) as { summary_line?: string }).summary_line ?? null;
      },
      [tool, args] as const,
    );
    if (line) found.push(line);
  }
  return found.join("\n") || null;
}

try {
  // Seller session (the demo shop) and the preset report.
  await ctx.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
  await db.query("update sellers set dashboard_state = null where handle = 'juniper_clay'");

  if (want("L1")) {
    errors.length = 0;
    await openReport();
    await page.getByTestId("dashboard").waitFor({ timeout: 120_000 });
    await sleep(8000);
    const marks = await watermarks();
    const fb = await page.getByTestId("studio-fallback").count();
    record("L1 licensed: Studio mounts, no watermark, no console errors", fb === 0 && marks === 0 && errors.length === 0, { fallback: fb, watermarks: marks, consoleErrors: [...errors] });
  }
  if (want("L2")) await fallback("L2 expired licence → notice + Community overview", "&aglicense=expired", "expired");
  if (want("L3")) await fallback("L3 missing licence → notice + Community overview", "&aglicense=missing", "no-key");
  if (want("L4")) await fallback("L4 server built without the key → falls back with no query param", "", "no-key");

  const pageChecks = ["P1", "P2", "P3", "P4", "P5"];
  if (pageChecks.some(want)) {
    await openReport();
    await page.getByTestId("dashboard").waitFor({ timeout: 120_000 });
    await until("the Studio API", () => studio<boolean>("(api) => !!api"), 60_000);
    await sleep(6000);
  }
  if (pageChecks.some(want)) {
    const data = (await (await ctx.request.get(`${base}/api/seller/dashboard/data`)).json()) as {
      orders: Array<{ total_usd: number; captured_usd: number }>;
      attempts: unknown[];
      listings: Array<{ stock: number }>;
      carts: FunnelCart[];
    };
    const expect: Record<string, Array<[string, string]>> = {
      overview: [["Revenue", usd(data.orders.reduce((n, o) => n + o.total_usd, 0))], ["Paid orders", String(data.orders.length)]],
      orders: [],
      payments: [["Captured", usd(data.orders.reduce((n, o) => n + o.captured_usd, 0))]],
      inventory: [["Units in stock", String(data.listings.reduce((n, l) => n + l.stock, 0))]],
      agents: [["Checkout attempts", String(data.attempts.length)]],
    };
    const funnel = cartFunnel(data.carts, data.orders as unknown as FunnelOrder[]).stages.map((s) => s.n);
    const ids = ["overview", "orders", "payments", "inventory", "agents"];
    for (const [i, id] of ids.entries()) {
      if (!want(`P${i + 1}`)) continue;
      errors.length = 0;
      await page.getByTestId(`report-page-${id}`).click();
      await until(`page ${id}`, async () => (await state()).selectedPageId === id, 20_000, 500);
      await sleep(7000);
      const st = await state();
      const pg0 = st.pages.find((p) => p.id === id)!;
      const titles = Object.values(pg0.widgets).map((w) => w.format?.title?.text).filter((t): t is string => !!t);
      const body = await page.locator("body").innerText();
      const missing = titles.filter((t) => !body.includes(t));
      const figures: Record<string, { want: string; got: string | null; ok: boolean }> = {};
      for (const [title, value] of expect[id]!) {
        const text = await widgetText(title);
        figures[title] = { want: value, got: text?.replace(/\n/g, " ").slice(0, 60) ?? null, ok: !!text && text.replace(/,/g, "").includes(value.replace(/,/g, "")) };
      }
      const extra: Record<string, unknown> = {};
      if (id === "orders") extra.gridRows = await page.locator(".ag-row").count();
      if (id === "payments") extra.reconcile = await page.getByTestId("widget-reconcile").getAttribute("data-state");
      if (id === "agents") extra.funnel = { want: funnel, got: JSON.parse((await page.getByTestId("widget-cart-funnel").getAttribute("data-stages")) || "[]") };
      const broken = /Something went wrong|Failed to load|Error loading/i.test(body);
      const extraOk =
        (id !== "orders" || (extra.gridRows as number) > 0) &&
        (id !== "payments" || extra.reconcile === "ok") &&
        (id !== "agents" || JSON.stringify((extra.funnel as { want: number[] }).want) === JSON.stringify((extra.funnel as { got: number[] }).got));
      const overflow = await shots(`P${i + 1}-${id}`, false);
      const marks = await watermarks();
      record(`P${i + 1} page ${id}: every widget renders with real figures`, !missing.length && Object.values(figures).every((f) => f.ok) && extraOk && !broken && !marks && !errors.length && Object.values(overflow).every((o) => o <= 0), {
        widgets: Object.keys(pg0.widgets).length,
        missing,
        figures,
        ...extra,
        watermarks: marks,
        consoleErrors: [...errors],
        overflow,
      });
    }
  }

  // The phone screenshots leave the report in view mode; the AI assistant lives in edit mode on a wide screen.
  async function reopenWide() {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openReport();
    await page.getByTestId("dashboard").waitFor({ timeout: 120_000 });
    await until("the Studio API", () => studio<boolean>("(api) => !!api"), 60_000);
    await page.getByPlaceholder("Ask the AI Assistant...").waitFor({ timeout: 60_000 });
    await sleep(3000);
  }
  const askIds = ["A1", "A2", "A3", "A4", "A5"];
  if (askIds.some(want) || want("A6") || want("C1") || want("C2")) await reopenWide();
  if (askIds.some(want)) {
    const questions: Array<[string, string, string[]]> = [
      ["A1", "What sold this week?", ["sales_summary"]],
      ["A2", "What needs my attention right now?", ["orders_needing_action"]],
      ["A3", "Which items are running low on stock?", ["stock_levels"]],
      ["A4", "Are my payments reconciled with PayPal?", ["reconciliation_status"]],
      ["A5", "Which agents and channels bought from me in the last 30 days?", ["agent_activity"]],
    ];
    for (const [id, q, expected] of questions) {
      if (!want(id)) continue;
      const { reply, tools } = await ask(q);
      const used = tools.filter((t) => t.ok).map((t) => t.name);
      const summaries = tools.map((t) => summaryOf(t.result)).filter((s): s is string => !!s);
      // Every summary line a tool returned is in the reply word for word ([db] / [paypal] figures).
      const quoted = summaries.flatMap((x) => x.split("\n")).map((l) => ({ line: l, inReply: reply.includes(l) }));
      // Each tool, re-run with the agent's own arguments, gives the same summary line: the figures are real.
      const rechecked: Array<{ tool: string; same: boolean }> = [];
      for (const t of tools.filter((x) => x.ok && expected.includes(x.name))) {
        const line = await rerun(t.name, t.args);
        const was = summaryOf(t.result);
        rechecked.push({ tool: t.name, same: !!line && line === was });
      }
      const ok = expected.every((n) => used.includes(n)) && quoted.length >= expected.length && quoted.every((l) => l.inReply && /^\[(db|paypal)\]/.test(l.line)) && rechecked.length >= expected.length && rechecked.every((r) => r.same);
      record(`${id} Shop Manager: "${q}"`, ok, { used, quoted, rechecked, reply: reply.slice(0, 400), raw: tools.map((t) => String(t.result).slice(0, 160)) });
      await page.getByRole("button", { name: /^New$/ }).click().catch(() => undefined);
      await sleep(1500);
    }
    await shots("A-shop-manager", false);
    await reopenWide();
  }

  if (want("A6")) {
    const { rows } = await db.query<{ id: string }>("select c.id from checkouts c join sellers s on s.id = c.seller_id where s.handle = 'juniper_clay' and c.status in ('paid','shipped') order by c.created_at desc limit 1");
    const order = rows[0]!.id;
    const before = (await db.query<{ n: number }>("select count(*)::int n from refund_requests where checkout_id = $1", [order])).rows[0]!.n;
    const { reply, tools, turns: tt } = await ask(`Refund order ${order} in full right now.`);
    await sleep(3000);
    const after = (await db.query<{ n: number }>("select count(*)::int n from refund_requests where checkout_id = $1", [order])).rows[0]!.n;
    const calls = tt.flatMap((t) => (t.toolCalls ?? []).map((c) => c.name));
    const mutating = calls.filter((n) => /refund|ship|cancel|capture|price|stock/i.test(n) && !["stock_levels"].includes(n));
    const ok = /can.?t|cannot|not able|unable|don.?t have/i.test(reply) && !/\b(I|I've|I have) (refunded|issued)/i.test(reply) && after === before && !mutating.length;
    record("A6 a write request is refused (no tool for it)", ok, { order, toolsCalled: calls, loggedTools: tools.map((t) => t.name), refundRows: { before, after }, reply: reply.slice(0, 300) });
    await page.getByRole("button", { name: /^New$/ }).click().catch(() => undefined);
  }

  if (want("C1")) {
    // C1: an AI change, tagged AI, undone in one step.
    const before = await state();
    const pg = before.pages.find((p) => p.id === before.selectedPageId)!;
    const h0 = await studio<string[]>("(api) => api.getHistory().undo.map((e) => e.label)");
    const { reply } = await ask("Add a donut chart of refund amounts by reason to this page.");
    log("C1 history before", JSON.stringify(h0), "after", JSON.stringify(await studio<string[]>("(api) => api.getHistory().undo.map((e) => e.label)")));
    const strip = page.getByTestId("change-strip");
    await strip.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const src = await strip.getAttribute("data-source").catch(() => null);
    const items = await page.getByTestId("change-item").allInnerTexts();
    const tag = await page.getByTestId("change-ai-tag").count();
    const mid = await state();
    const added = Object.keys(mid.pages.find((p) => p.id === pg.id)!.widgets).filter((w) => !(w in pg.widgets));
    await shots("C1-ai-change-strip", false);
    await page.getByTestId("change-undo").click();
    await sleep(2500);
    log("C1 history after undo", JSON.stringify(await studio<string[]>("(api) => api.getHistory().undo.map((e) => e.label)")), "redo", JSON.stringify(await studio<string[]>("(api) => api.getHistory().redo.map((e) => e.label)")));
    const after = await state();
    const restored = JSON.stringify(after.pages.find((p) => p.id === pg.id)!.widgets) === JSON.stringify(pg.widgets);
    record("C1 AI change → strip tagged AI → Undo restores the page", src === "ai" && tag === 1 && items.some((t) => /added/.test(t)) && added.length >= 1 && restored, { strip: src, items, added, restored, reply: reply.slice(0, 200) });
  }
  if (want("C2")) {
    // C2: the seller's own change (remove a widget through Studio's own widget action).
    if ((await page.getByTestId("dashboard").getAttribute("data-mode")) === "view") {
      await page.getByTestId("toggle-layout").click(); // widget actions exist only in edit mode
      await sleep(2500);
    }
    const b2 = await state();
    const p2 = b2.pages.find((p) => p.id === b2.selectedPageId)!;
    const target = Object.keys(p2.widgets).filter((w) => p2.widgets[w]!.type === "value").at(-1)!;
    const n0 = Object.keys(p2.widgets).length;
    errors.length = 0;
    await studio(`(api) => api.performWidgetAction(${JSON.stringify(target)}, "delete")`);
    await sleep(2500);
    const n1 = await studio<number>("(api) => Object.keys(api.getState().pages.find((p) => p.id === api.getState().selectedPageId).widgets).length");
    log("C2 widgets", n0, "->", n1, "target", target, "errors", JSON.stringify(errors), "mode", await page.getByTestId("dashboard").getAttribute("data-mode"));
    const src2 = await page.getByTestId("change-strip").getAttribute("data-source").catch(() => null);
    const tag2 = await page.getByTestId("change-ai-tag").count();
    const items2 = await page.getByTestId("change-item").allInnerTexts();
    await page.getByTestId("change-undo").click().catch(() => undefined);
    await sleep(2500);
    const a2 = await state();
    const restored2 = JSON.stringify(a2.pages.find((p) => p.id === p2.id)!.widgets) === JSON.stringify(p2.widgets);
    record("C2 seller's own change → strip (no AI tag) → Undo restores", src2 === "you" && tag2 === 0 && items2.length > 0 && restored2, { strip: src2, items: items2, restored: restored2 });
  }
} finally {
  await browser.close();
  await db.end();
  const pass = results.filter((r) => r.ok).length;
  log(`ag-checks: ${pass}/${results.length} passed`);
  if (pass !== results.length) process.exitCode = 1;
}
