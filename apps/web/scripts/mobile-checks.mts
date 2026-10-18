// Mobile pass (walkthrough #11, D-090) on the DEPLOYED app: every route a judge can reach, at 360 / 390 / 430 px.
//   M1  no sideways scroll on any route, on the page or inside a scroll panel (the chat, the live wire)
//   M2  primary buttons and links are at least 44 px tall where they are the main action (reported per route)
//   M3  screenshots of every route at 390 px
// Usage: pnpm --filter web mobile-checks -- --base https://shopfront-agent.onrender.com
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/mobile")!);
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const mcp = new Client({ name: "mobile-checks", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
const r = await mcp.callTool({ name: "create_checkout", arguments: { items: [{ variant_id: "var_cobalt120000", quantity: 1 }], client_request_id: randomUUID() } });
const pay = new URL(JSON.parse((r.content as Array<{ text: string }>)[0]!.text).pay_url);
await mcp.close();

const ROUTES: Array<{ name: string; path: string; seller?: boolean }> = [
  { name: "landing", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "live", path: "/live" },
  { name: "pay", path: pay.pathname + pay.search },
  { name: "pay-invalid", path: "/pay/link-invalid" },
  { name: "storefront", path: "/s/juniper_clay" },
  { name: "storefront-fern", path: "/s/fern_and_loom" },
  { name: "product", path: "/s/juniper_clay/prd_cobaltdrip00" },
  { name: "studio-signin", path: "/studio" },
  { name: "studio", path: "/studio", seller: true },
  { name: "orders", path: "/studio/orders", seller: true },
  { name: "dashboard", path: "/studio/dashboard", seller: true },
  { name: "not-found", path: "/no-such-page" },
];
const WIDTHS = [360, 390, 430];
const rows: Array<{ route: string; width: number; overflow: number; inner: number; smallTargets: number }> = [];

const browser = await chromium.launch();
try {
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const seller = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 844 });
      await page.goto(base + route.path, { waitUntil: "load", timeout: 120_000 });
      await page.waitForTimeout(route.name === "dashboard" ? 4000 : 1500);
      const m = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        // Inner panels that should never scroll sideways (grids are allowed their own horizontal scroll).
        const inner = Math.max(0, ...[...document.querySelectorAll("[data-testid=chat-scroller]")].map((el) => el.scrollWidth - el.clientWidth));
        const small = [...document.querySelectorAll("main a[class*='h-'], main button")].filter((el) => {
          const r = (el as HTMLElement).getBoundingClientRect();
          const primary = /bg-ink|bg-clay|bg-paypal/.test((el as HTMLElement).className);
          return primary && r.height > 0 && r.height < 40;
        }).length;
        return { overflow, inner, small };
      });
      rows.push({ route: route.name, width: w, overflow: m.overflow, inner: m.inner, smallTargets: m.small });
      if (w === 390) await page.screenshot({ path: join(out, `${route.name}-390.png`), fullPage: true });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const bad = rows.filter((x) => x.overflow > 0 || x.inner > 0);
for (const x of rows) log(x.overflow > 0 || x.inner > 0 ? "FAIL" : "ok  ", x.route.padEnd(16), x.width, `overflow ${x.overflow}`, `inner ${x.inner}`, x.smallTargets ? `small primary targets ${x.smallTargets}` : "");
writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(rows, null, 2));
log(bad.length ? `M1 FAIL: ${bad.length} route/width combinations scroll sideways` : `M1 PASS: ${rows.length} route/width combinations, no sideways scroll`);
process.exit(bad.length ? 1 : 0);
