// Quick screenshots of one route at desktop, 1920x1080 and mobile, plus the horizontal-overflow measure.
// Usage: node --env-file=../../.env --import tsx --import ./scripts/lib/test-run.ts scripts/screens-quick.mts <base> <route> <outdir> <name>
import { chromium } from "@playwright/test";
const [base, route, out, name] = process.argv.slice(2);
const browser = await chromium.launch();
const sizes = [{ tag: "desktop", width: 1440, height: 900 }, { tag: "1920", width: 1920, height: 1080 }, { tag: "mobile", width: 390, height: 844 }];
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: s.tag === "mobile" ? 2 : 1 });
  const page = await ctx.newPage();
  await page.goto(base + route, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(2500);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: `${out}/${name}-${s.tag}.png`, fullPage: s.tag === "mobile" });
  console.log(s.tag, "overflow", overflow);
  await ctx.close();
}
await browser.close();
