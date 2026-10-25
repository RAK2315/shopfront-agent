// Read-only reference screenshots of the deployed pages, to plan camera moves before a take. Creates no orders or
// listings (signing in as the demo seller only sets a session cookie). Usage: node capture/look.mts <outDir> [path...]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const [out = "out/look", ...paths] = process.argv.slice(2);
const base = "https://shopfront-agent.onrender.com";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: false, channel: "chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
await ctx.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
const page = await ctx.newPage();
for (const p of paths.length ? paths : ["/studio", "/live", "/gauntlet", "/shop", "/studio/dashboard", "/studio/dashboard?tab=report"]) {
  const [path, w = "1440", h = "810"] = p.split("@");
  await page.setViewportSize({ width: Number(w), height: Number(h) });
  await page.goto(base + path, { waitUntil: "load", timeout: 180_000 });
  await page.waitForTimeout(6000);
  const name = path.replace(/[^a-z0-9]+/gi, "_") + `_${w}`;
  await page.screenshot({ path: join(out, `${name}.png`) });
  await page.screenshot({ path: join(out, `${name}_full.png`), fullPage: true });
  console.log("shot", name);
}
await browser.close();
