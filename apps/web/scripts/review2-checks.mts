// Review v2 fixes #2, #6, #8 (D-096) on the DEPLOYED app:
//   R2a search relevance: "a handmade blue mug" finds only mugs (no tea towel); the housewarming starter still finds
//       vases and linens, not mugs (MCP search_products, the same tool the agent uses)
//   R2b the mug listing matches its photo: "Blue crackle mug", exactly one photo, served
//   R2c /shop: the agent's blue-mug search shows mug cards only; screenshots at desktop, 1920, mobile
//   R6  Studio Get paid card: 3-step guide, which sandbox login, demo vs real shop, explicit payouts state; after
//       returning from PayPal a prominent "Verified by PayPal" banner with the account
//   R8  /shop wire: a quiet wire shows its 4-lane guide; it steps aside once real events fill it
// Usage: pnpm --filter web review2-checks -- --base https://shopfront-agent.onrender.com
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/review-v2-fixes")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const SIZES = [
  { tag: "desktop", width: 1440, height: 900 },
  { tag: "1920", width: 1920, height: 1080 },
  { tag: "mobile", width: 390, height: 844 },
];
async function shoot(page: Page, name: string, full = false) {
  const overflow: Record<string, number> = {};
  for (const s of SIZES) {
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.waitForTimeout(700);
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `${name}-${s.tag}.png`), fullPage: full && s.tag === "mobile" });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return overflow;
}

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const browser = await chromium.launch({ headless: true });
try {
  // R2a
  {
    const mcp = new Client({ name: "review2-checks", version: "1.0.0" });
    await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
    const search = async (query: string) =>
      (JSON.parse((await mcp.callTool({ name: "search_products", arguments: { query, limit: 10 } })).content[0].text) as { results: Array<{ title: string }> }).results.map((r) => r.title);
    const mug = await search("Find me a handmade blue mug under $40 as a gift");
    const home = await search("A vase or table linens for a housewarming, under $60");
    const towel = await search("tea towel");
    await mcp.close();
    record(
      "R2a search: mugs only for a blue mug; the housewarming starter finds vases and linens",
      mug.length > 0 && mug.every((t) => /mug/i.test(t)) && home.length >= 2 && home.every((t) => !/mug/i.test(t)) && towel.some((t) => /towel/i.test(t)),
      { mug, home, towel },
    );
  }

  // R2b
  {
    const p = (await db.query("select title, description from products where id = 'prd_cobaltdrip00'")).rows[0];
    const imgs = Number((await db.query("select count(*)::int n from product_images where product_id = 'prd_cobaltdrip00'")).rows[0].n);
    const page = await browser.newPage();
    await page.goto(`${base}/s/juniper_clay/prd_cobaltdrip00`, { waitUntil: "load", timeout: 120_000 });
    const loaded = await page.locator("img").first().evaluate((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0).catch(() => false);
    const heading = await page.locator("h1").first().innerText().catch(() => "");
    const overflow = await shoot(page, "R2b-product", true);
    await page.close();
    record("R2b the mug listing matches its photo: one photo, served, titled Blue crackle mug", p?.title === "Blue crackle mug" && /crackle/i.test(p?.description ?? "") && imgs === 1 && loaded && /blue crackle mug/i.test(heading) && Object.values(overflow).every((o) => o <= 0), { title: p?.title, images: imgs, loaded, heading, overflow });
  }

  // R2c + R8
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 120_000 });
    await page.waitForTimeout(2000);
    const guide = page.getByTestId("wire-guide");
    const guideBefore = (await guide.isVisible().catch(() => false)) ? (await guide.locator("li").count()) : 0;
    const guideShots = await shoot(page, "R8-wire-guide");
    await page.getByTestId("shop-input").fill("Find me a handmade blue mug under $40 as a gift");
    await page.getByTestId("shop-input").press("Enter");
    await page.getByTestId("product-card").first().waitFor({ timeout: 90_000 });
    await page.waitForTimeout(4000);
    const cards = await page.getByTestId("product-card").allInnerTexts();
    const rows = await page.locator("[data-testid=chat-scroller] ~ * , section[aria-label^='Live'] li").count().catch(() => 0);
    const guideAfter = await guide.isVisible().catch(() => false);
    const overflow = await shoot(page, "R2c-shop-results");
    await page.close();
    record("R2c /shop: the agent's blue-mug search shows mug cards only", cards.length > 0 && cards.every((t) => /mug/i.test(t)) && !cards.some((t) => /towel|napkin|runner/i.test(t)) && Object.values(overflow).every((o) => o <= 0), { cards: cards.map((t) => t.split("\n").find((l) => /mug|towel|vase|napkin|runner|bowl/i.test(l))), overflow });
    record("R8 a quiet wire shows its 4-lane guide; it steps aside once events fill it", guideBefore === 4 && !guideAfter && Object.values(guideShots).every((o) => o <= 0), { lanesShown: guideBefore, guideAfterSearch: guideAfter, wireRows: rows, overflow: guideShots });
  }

  // R6
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
    const cont = page.getByRole("button", { name: /^continue as/i });
    if (await cont.isVisible().catch(() => false)) {
      await cont.click();
      await page.waitForTimeout(2500);
    }
    const card = page.getByTestId("get-paid-card");
    const steps = await page.getByTestId("lipp-steps").locator("li").count();
    const rowsText = await page.getByTestId("payee-rows").innerText().catch(() => "");
    const login = await page.getByTestId("lipp-login").innerText().catch(() => "");
    const payouts = await page.getByTestId("payouts-state").innerText();
    const shots: Record<string, number> = {};
    for (const s of SIZES) {
      await page.setViewportSize({ width: s.width, height: s.height });
      await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      shots[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      await card.screenshot({ path: join(out, `R6-get-paid-${s.tag}.png`) });
    }
    // Back from PayPal (the result param the return route sets): the Verified banner with the account PayPal confirmed.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/studio?paypal=checked`, { waitUntil: "load" });
    const banner = await page.getByTestId("verified-banner").innerText().catch(() => "");
    await page.getByTestId("get-paid-card").screenshot({ path: join(out, "R6-get-paid-verified-desktop.png") });
    await ctx.close();
    record(
      "R6 Get paid: 3 steps, which login, demo vs real shop, payouts state; Verified banner after PayPal",
      steps === 3 && /this demo shop/i.test(rowsText) && /a real shop/i.test(rowsText) && /@personal\.example\.com/.test(login) && /not enabled on this demo shop/i.test(payouts) && /verified by paypal/i.test(banner) && /[A-Z0-9]{13}/.test(banner) && Object.values(shots).every((o) => o <= 0),
      { steps, payouts, banner: banner.replace(/\s+/g, " ").slice(0, 160), loginShown: Boolean(login), overflow: shots },
    );
  }
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  await browser.close();
  await db.end();
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exitCode = failed.length ? 1 : 0;
}
