// Landing + site nav (walkthrough #6, #11; D-090) on the DEPLOYED app:
//   L1  the hero says what Shopfront is in one line ("Your storefront, ready for AI agents."), with the two doors:
//       "Try buyer demo" → /shop and "Sell with Shopfront" → /studio
//   L2  the flow strip shows 4 steps (seller, buyer's agent, buyer, seller's agent) with real catalog photos loaded
//   L3  the developer card shows the MCP endpoint; the live feed is on the page
//   L4  the site nav: desktop links; on a phone the menu opens and lists the same places
//   L5  no sideways scroll at 390 / 1440 / 1920; screenshots
// Usage: pnpm --filter web landing-checks -- --base https://shopfront-agent.onrender.com
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/landing")!);
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load", timeout: 180_000 });
  await page.waitForTimeout(1500);

  const h1 = (await page.locator("h1").innerText()).trim();
  const buyer = await page.getByTestId("cta-buyer").getAttribute("href");
  const seller = await page.getByTestId("cta-seller").getAttribute("href");
  record("L1 one-line pitch and two doors", h1 === "Your storefront, ready for AI agents." && buyer === "/shop" && seller === "/studio", { h1, buyer, seller });

  const steps = await page.getByTestId("flow-strip").locator("> li").count();
  const imgs = await page.getByTestId("flow-strip").locator("img").evaluateAll((els) => els.map((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0));
  record("L2 flow strip with real photos", steps === 4 && imgs.length >= 3 && imgs.every(Boolean), { steps, imgs });

  const mcp = await page.getByTestId("developer-card").innerText();
  const feed = await page.getByText("Happening on the sandbox right now").isVisible();
  record("L3 developer card + live feed", /\/mcp/.test(mcp) && feed, { hasMcp: /\/mcp/.test(mcp), feed });

  // L6 (review v2 fix #3): the hero sub-text and the live panel read at a glance; the cards are body size; the page
  // uses the width at 1920.
  // A string script: tsx would wrap a named helper in __name(), which the page doesn't have.
  const measure = () =>
    page.evaluate(`(() => {
      const fs = (el) => (el ? parseFloat(getComputedStyle(el).fontSize) : 0);
      const sub = document.querySelector("h1 + p");
      const wire = document.querySelector("[data-testid=hero-wire]");
      const card = document.querySelector("[data-testid=flow-strip] > li p:last-child");
      const strip = document.querySelector("[data-testid=flow-strip]");
      return { subPx: fs(sub), wireWidth: Math.round(wire ? wire.getBoundingClientRect().width : 0), wireZoom: wire ? getComputedStyle(wire).zoom : "", cardPx: fs(card), stripWidth: Math.round(strip ? strip.getBoundingClientRect().width : 0) };
    })()`) as Promise<{ subPx: number; wireWidth: number; wireZoom: string; cardPx: number; stripWidth: number }>;
  const at1440 = await measure();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(700);
  const at1920 = await measure();
  await page.setViewportSize({ width: 1440, height: 900 });
  record("L6 prominence: hero sub-text ≥ 22 px, live panel ≥ 520 px and zoomed, card body ≥ 16 px, 1920 uses ≥ 1450 px", at1440.subPx >= 22 && at1440.wireWidth >= 520 && Number(at1440.wireZoom) > 1 && at1440.cardPx >= 16 && at1920.stripWidth >= 1450, { at1440, at1920 });

  const navLinks = await page.getByRole("navigation", { name: "Site" }).locator("ul a").allInnerTexts();
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.waitForTimeout(700);
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `landing-${s.tag}.png`), fullPage: true });
    await page.screenshot({ path: join(out, `landing-${s.tag}-fold.png`) });
  }
  await page.getByTestId("site-menu-button").click();
  const menu = await page.locator("#site-menu a").allInnerTexts();
  await page.screenshot({ path: join(out, "landing-mobile-menu.png") });
  record("L4 site nav (desktop links, phone menu)", navLinks.length >= 5 && menu.length === navLinks.length, { navLinks, menu });
  record("L5 no sideways scroll", Object.values(overflow).every((o) => o <= 0), { overflow });
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
