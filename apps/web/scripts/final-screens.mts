// Final regression screenshots (item #14): every screen a judge can reach, at desktop (1440×900), 1920×1080 and
// mobile (390×844, full page), with the sideways-scroll measure for each. Output: docs/screenshots/final/.
// Usage: pnpm --filter web final-screens -- --base https://shopfront-agent.onrender.com
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/final")!);
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });

const mcp = new Client({ name: "final-screens", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
const r = await mcp.callTool({ name: "create_checkout", arguments: { items: [{ variant_id: "var_cobalt120000", quantity: 1 }], client_request_id: randomUUID() } });
const pay = new URL(JSON.parse((r.content as Array<{ text: string }>)[0]!.text).pay_url);
await mcp.close();

const ROUTES: Array<{ name: string; path: string; seller?: boolean; wait?: number }> = [
  { name: "01-landing", path: "/" },
  { name: "02-shop", path: "/shop" },
  { name: "03-pay", path: pay.pathname + pay.search, wait: 3000 },
  { name: "04-live", path: "/live" },
  { name: "05-storefront-juniper", path: "/s/juniper_clay" },
  { name: "06-storefront-fern", path: "/s/fern_and_loom" },
  { name: "07-product", path: "/s/juniper_clay/prd_cobaltdrip00" },
  { name: "08-studio-signin", path: "/studio" },
  { name: "09-studio", path: "/studio", seller: true },
  { name: "10-orders", path: "/studio/orders", seller: true },
  { name: "11-dashboard-overview", path: "/studio/dashboard", seller: true, wait: 5000 },
  { name: "12-dashboard-report", path: "/studio/dashboard?tab=report", seller: true, wait: 10000 },
  { name: "13-pay-link-invalid", path: "/pay/link-invalid" },
  { name: "14-not-found", path: "/no-such-page" },
  { name: "15-design-system", path: "/design" },
  { name: "16-privacy", path: "/privacy" },
  { name: "17-terms", path: "/terms" },
  { name: "18-gauntlet", path: "/gauntlet", wait: 4000 },
  { name: "19-developers", path: "/developers" },
];
const SIZES = [
  { tag: "desktop", width: 1440, height: 900, full: false },
  { tag: "1920", width: 1920, height: 1080, full: false },
  { tag: "mobile", width: 390, height: 844, full: true },
];
const rows: Array<{ route: string; size: string; overflow: number }> = [];
const browser = await chromium.launch();
try {
  const anon = await browser.newContext();
  const seller = await browser.newContext();
  const sp = await seller.newPage();
  await sp.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
  const cont = sp.getByRole("button", { name: /^continue as/i });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await sp.waitForTimeout(2500);
  }
  await sp.close();
  for (const route of ROUTES) {
    const page = await (route.seller ? seller : anon).newPage();
    for (const s of SIZES) {
      await page.setViewportSize({ width: s.width, height: s.height });
      await page.goto(base + route.path, { waitUntil: "load", timeout: 120_000 });
      await page.waitForTimeout(route.wait ?? 1800);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      rows.push({ route: route.name, size: s.tag, overflow });
      await page.screenshot({ path: join(out, `${route.name}-${s.tag}.png`), fullPage: s.full });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(out, "index.json"), JSON.stringify(rows, null, 2));
const bad = rows.filter((x) => x.overflow > 0);
console.log(`${rows.length} screenshots; sideways scroll on ${bad.length}${bad.length ? ": " + bad.map((b) => `${b.route}@${b.size}=${b.overflow}`).join(", ") : ""}`);
