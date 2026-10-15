// Phase-end screenshots: each path at desktop (1440×900) and mobile (390×844), with console-error and
// horizontal-overflow checks. Usage:
//   pnpm --filter web screens -- --base https://shopfront-agent.onrender.com --out ../../docs/screenshots/phase-2 /live /design
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const opt = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args.splice(i, 2)[1]! : d;
};
const base = opt("--base", "http://localhost:3000").replace(/\/$/, "");
const out = resolve(opt("--out", "../../docs/screenshots/tmp"));
const settle = Number(opt("--settle", "1500"));
const paths = args.length ? args : ["/"];
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let failures = 0;
for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
] as const) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: label === "mobile" ? 2 : 1 });
  for (const p of paths) {
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    // "load", not "networkidle": live pages hold an SSE connection open.
    await page.goto(base + p, { waitUntil: "load", timeout: 120_000 });
    await page.waitForTimeout(settle);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // Never put the query string in a filename: pay URLs carry an order token (a bearer secret).
    const name = `${(p.split("?")[0]!.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-") || "home").replace(/-$/, "")}-${label}.png`;
    await page.screenshot({ path: join(out, name), fullPage: true });
    const ok = errors.length === 0 && overflow <= 0;
    if (!ok) failures++;
    console.log(`${ok ? "OK  " : "FAIL"} ${label.padEnd(7)} ${p.split("?")[0]} → ${name}${overflow > 0 ? ` overflow=${overflow}px` : ""}${errors.length ? ` errors=${JSON.stringify(errors.slice(0, 3))}` : ""}`);
    await page.close();
  }
  await ctx.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
