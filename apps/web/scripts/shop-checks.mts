// /shop rebuild (walkthrough #4, D-088) on the DEPLOYED app, real PayPal sandbox:
//   S1  empty state: 3 plain lines, 4 suggestion cards with icons, a 5-step rail with nothing done
//   S2  a search shows image-led product cards (photos load, seller, price "set by the shop", in stock);
//       Search + Found are done; the MCP calls are collapsed to one line that expands to the calls
//   S3  "Buy this" → the checkout card (photo, Items / Shipping / Total, the PayPal button inline) → approve in the
//       popup → the card turns into the paid state → all 5 steps done; DB paid with a capture
//   S4  unhappy: closing the PayPal popup → "Nothing was charged" message, PayPal step still open, checkout `created`
//   S5  no sideways scroll at 390 / 1440 / 1920 with a checkout on screen; screenshots of each stage
// Usage: pnpm --filter web shop-checks -- --base https://shopfront-agent.onrender.com [--only S1,S2]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/shop")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
await db.query("update variants set stock = greatest(stock, 20) where id = 'var_cobalt120000'");
const browser = await chromium.launch({ headless: false, channel: "chromium" });
const buyer = { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD };

async function shots(page: Page, name: string) {
  const vp = page.viewportSize()!;
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", width: 1440, height: 900 }, { tag: "1920", width: 1920, height: 1080 }, { tag: "mobile", width: 390, height: 844 }]) {
    await page.setViewportSize({ width: s.width, height: s.height });
    await page.waitForTimeout(600);
    // The page and the chat panel itself (an inner sideways scroll hides the user's own words on phones).
    overflow[s.tag] = await page.evaluate(() => {
      const chat = document.querySelector("[data-testid=chat-scroller]");
      return Math.max(document.documentElement.scrollWidth - window.innerWidth, chat ? chat.scrollWidth - chat.clientWidth : 0);
    });
    await page.screenshot({ path: join(out, `${name}-${s.tag}.png`) });
  }
  await page.setViewportSize(vp);
  return overflow;
}
const rail = async (page: Page) => Object.fromEntries(await page.locator("[data-testid=progress-rail] li").evaluateAll((els) => els.map((el) => [el.getAttribute("data-step"), el.getAttribute("data-state")])));

async function searchAndBuy(page: Page) {
  const input = page.getByTestId("shop-input");
  await input.fill("Find me a handmade blue mug under $40");
  await input.press("Enter");
  await page.getByTestId("product-card").first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
}

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });

  // S1
  {
    const starters = await page.getByTestId("starter").count();
    const r = await rail(page);
    const lines = await page.getByTestId("shop-empty").locator("li").count();
    const overflow = await shots(page, "S1-empty");
    record("S1 empty state", starters === 4 && lines === 3 && Object.values(r).every((v) => v === "todo") && Object.values(overflow).every((o) => o <= 0), { starters, lines, rail: r, overflow });
  }

  // S2
  await searchAndBuy(page);
  {
    const cards = page.getByTestId("product-card");
    const n = await cards.count();
    const imgs = await cards.locator("img").evaluateAll((els) => els.map((i) => ({ ok: (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0, src: (i as HTMLImageElement).src.includes("/img/") })));
    const firstText = await cards.first().innerText();
    const group = page.getByTestId("tool-group").first();
    const collapsed = !(await group.evaluate((d) => (d as HTMLDetailsElement).open));
    await group.locator("summary").click();
    const chips = await group.getByTestId("tool-chip").count();
    await group.locator("summary").click();
    const r = await rail(page);
    const overflow = await shots(page, "S2-results");
    record("S2 image-led results + collapsed tool log", n >= 1 && imgs.length > 0 && imgs.every((i) => i.ok && i.src) && /set by the shop/i.test(firstText) && /in stock/i.test(firstText) && collapsed && chips >= 1 && r.search === "done" && r.found === "done" && Object.values(overflow).every((o) => o <= 0), { cards: n, imgs, collapsedByDefault: collapsed, chipsWhenOpen: chips, rail: r, overflow });
  }

  // S3
  {
    // The agent sometimes sets up the checkout straight from the search message; otherwise "Buy this" asks for it.
    if ((await page.getByTestId("checkout-card").count()) === 0) {
      const card = page.getByTestId("product-card").filter({ hasText: /cobalt/i }).first();
      const target = (await card.count()) ? card : page.getByTestId("product-card").first();
      await target.getByTestId("buy-this").click();
    }
    const ck = page.getByTestId("checkout-card").last();
    await ck.waitFor({ timeout: 90_000 });
    await ck.locator('[data-phase="ready"]').waitFor({ timeout: 90_000 });
    const checkoutId = /\/pay\/(chk_[a-z0-9]{12})/.exec((await ck.getByTestId("pay-link").getAttribute("href")) ?? "")?.[1];
    const thumb = await ck.locator("img").first().evaluate((i) => (i as HTMLImageElement).naturalWidth > 0).catch(() => false);
    const overflowCheckout = await shots(page, "S3-checkout-card");
    const popupP = page.waitForEvent("popup", { timeout: 20_000 });
    await ck.locator("paypal-button").click();
    const popup = await popupP;
    await loginAndApprove(popup, buyer, { review: join(out, "S3-paypal-review.png") });
    await ck.getByText("Payment complete").waitFor({ timeout: 90_000 });
    await page.waitForTimeout(3000);
    const row = (await db.query("select c.status, (select paypal_capture_id from captures where checkout_id = c.id limit 1) cap from checkouts c where id = $1", [checkoutId])).rows[0];
    const r = await rail(page);
    const overflow = await shots(page, "S3-paid");
    record("S3 inline PayPal approval → paid state → rail done", row?.status === "paid" && Boolean(row?.cap) && Object.values(r).every((v) => v === "done") && thumb && (await ck.getAttribute("data-phase")) === "paid" && [...Object.values(overflowCheckout), ...Object.values(overflow)].every((o) => o <= 0), { checkoutId, db: row, rail: r, thumb, overflowCheckout, overflow });
  }
  await ctx.close();

  // S4: unhappy path — close the popup
  {
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(`${base}/shop`, { waitUntil: "load" });
    await searchAndBuy(p2);
    if ((await p2.getByTestId("checkout-card").count()) === 0) await p2.getByTestId("buy-this").first().click();
    const ck = p2.getByTestId("checkout-card").last();
    await ck.locator('[data-phase="ready"]').waitFor({ timeout: 90_000 });
    const checkoutId = /\/pay\/(chk_[a-z0-9]{12})/.exec((await ck.getByTestId("pay-link").getAttribute("href")) ?? "")?.[1];
    const popupP = p2.waitForEvent("popup", { timeout: 20_000 });
    await ck.locator("paypal-button").click();
    const popup = await popupP;
    await popup.waitForLoadState("domcontentloaded").catch(() => {});
    await popup.close();
    const alert = ck.locator('p[role="alert"]');
    await alert.waitFor({ timeout: 30_000 });
    const msg = await alert.innerText();
    const r = await rail(p2);
    const row = (await db.query("select status from checkouts where id = $1", [checkoutId])).rows[0];
    await p2.screenshot({ path: join(out, "S4-popup-closed-desktop.png") });
    record("S4 closing PayPal charges nothing", /nothing was charged/i.test(msg) && r.paid !== "done" && row?.status === "created", { message: msg, rail: r, db: row });
    await ctx2.close();
  }
} catch (err) {
  for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: join(out, `_error-${i}.png`) }).catch(() => {});
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
