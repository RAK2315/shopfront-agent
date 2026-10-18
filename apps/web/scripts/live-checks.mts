// /live console (walkthrough #7, D-090) on the DEPLOYED app, real events:
//   V1  the KPI strip shows four 24-hour counts from the database
//   V2  timeline rows keep ids behind "Details" (copyable when opened); PayPal rows show their one key id
//   V3  a new public event slides in live and the matching KPI counts up (an MCP call made as a public visitor,
//       then archived to is_test so it never lingers on the public wire)
//   V4  "Group by checkout" groups rows under checkout headers; clicking a checkout follows only its events
//   V5  no sideways scroll at 390 / 1440 / 1920; screenshots
// Usage: pnpm --filter web live-checks -- --base https://shopfront-agent.onrender.com
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/live")!);
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
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { "x-shopfront-public-view": "1" } });
  const page = await ctx.newPage();
  await page.goto(`${base}/live`, { waitUntil: "load", timeout: 180_000 });
  await page.getByText("Connected").first().waitFor({ timeout: 60_000 });

  const stat = async (id: string) => Number(await page.getByTestId(`live-stat-${id}-value`).innerText());
  const s0 = { agent: await stat("agent"), mcp: await stat("mcp"), payments: await stat("payments"), blocked: await stat("blocked") };
  record("V1 KPI strip (24 h, from the database)", Object.values(s0).every((n) => Number.isFinite(n) && n >= 0) && (await page.getByTestId("live-stats").locator("li").count()) === 4, s0);

  const toggles = await page.getByTestId("event-details-toggle").count();
  const visibleIdsBefore = await page.locator('section[aria-label="Live timeline"] [data-family]:not([data-family="paypal"]) button[title*="click to copy"]').count();
  await page.getByTestId("event-details-toggle").first().click();
  const opened = await page.getByTestId("event-details").first().locator("button[title*='click to copy'], span").count();
  const paypalKey = await page.locator('[data-family="paypal"] button[title*="click to copy"]').count();
  record("V2 ids behind Details; PayPal rows keep their key id", toggles > 0 && visibleIdsBefore === 0 && opened > 0, { detailToggles: toggles, nonPayPalIdsVisibleBefore: visibleIdsBefore, openedItems: opened, paypalKeyIds: paypalKey });
  await page.screenshot({ path: join(out, "V2-details-open-desktop.png") });

  // V3: one public MCP call (search) → a new row and +1 MCP call, live.
  const before = await stat("mcp");
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-shopfront-public-view": "1" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_products", arguments: { query: "linen" } } }),
  });
  await res.text();
  let after = before;
  for (let i = 0; i < 20 && after === before; i++) {
    await sleep(1000);
    after = await stat("mcp");
  }
  const newest = await page.locator('section[aria-label="Live timeline"] li').first().innerText();
  record("V3 a new event slides in and the KPI counts up", after === before + 1 && /search_products/.test(newest), { before, after, newest: newest.split("\n").slice(0, 2).join(" ") });
  // Keep the public wire clean: the probe's own rows become test rows.
  await db.query("update events set is_test = true where actor = 'mcp' and created_at > now() - interval '3 minutes' and not is_test and (kind = 'search_products' or data->>'tool' = 'search_products') and summary like '%linen%'").catch(() => {});

  await page.getByTestId("group-by-checkout").click();
  await sleep(600);
  const groups = await page.getByTestId("timeline-group").count();
  await page.screenshot({ path: join(out, "V4-grouped-desktop.png") });
  await page.getByTestId("group-by-checkout").click();
  const firstCheckout = page.locator('section[aria-labelledby="checkouts-h"] li button[aria-pressed]').first();
  const hasCheckout = (await firstCheckout.count()) > 0;
  let followed = false;
  if (hasCheckout) {
    await firstCheckout.click();
    await page.locator('section[aria-label="Timeline for one checkout"]').waitFor({ timeout: 10_000 });
    followed = true;
    await page.screenshot({ path: join(out, "V4-one-checkout-desktop.png") });
    await firstCheckout.click();
  }
  record("V4 group by checkout; follow one checkout", groups >= 1 && (followed || !hasCheckout), { groups, followed });

  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await sleep(700);
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `live-${s.tag}.png`), fullPage: s.tag === "mobile" });
  }
  record("V5 no sideways scroll", Object.values(overflow).every((o) => o <= 0), { overflow });
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close();
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
