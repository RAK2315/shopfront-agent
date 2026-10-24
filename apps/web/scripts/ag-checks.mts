// Phase AG (AG Studio showcase, D-097/D-100; PLAN "Phase AG") on the DEPLOYED app, real data, no mocks:
//   L1  licensed: the Studio report mounts; no watermark element; no console errors at all (Studio prints its licence
//       banner with console.error, so a bad key would show here)
//   L2  ?aglicense=expired: Studio is not mounted; the notice + the Community overview with real rows; no console errors
//   L3  ?aglicense=missing: the same with reason no-key
//   L4  (--expect-no-key, local dev server started without the key) the report tab falls back with no query param
// Usage: pnpm --filter web ag-checks -- --base https://shopfront-agent.onrender.com [--only L1,L2] [--expect-no-key]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type ConsoleMessage, type Page } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/ag")!);
const expectNoKey = args.includes("--expect-no-key");
const only = new Set((arg("--only", expectNoKey ? "L4" : "L1,L2,L3") ?? "").split(","));
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, channel: "chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// Every console error and uncaught exception, trimmed. Text that could hold the key is never kept: the licence banner
// lines are reduced to a marker.
const errors: string[] = [];
const keep = (t: string) => (/\*{6}|licen[cs]e|watermark/i.test(t) ? "[AG licence banner line]" : t.slice(0, 160));
page.on("console", (m: ConsoleMessage) => m.type() === "error" && errors.push(keep(m.text())));
page.on("pageerror", (err) => errors.push("pageerror: " + keep(err.message)));

async function signIn(p: Page) {
  await p.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
  const cont = p.getByRole("button", { name: /^continue as/i });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await p.waitForLoadState("load");
    await sleep(1500);
  }
}
async function shots(name: string) {
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await sleep(900);
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `${name}-${s.tag}.png`), fullPage: s.tag === "mobile" });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return overflow;
}
const watermarks = () => page.locator(".ag-studio-watermark, .ag-watermark").evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).length);

async function fallback(id: string, query: string, reason: string) {
  errors.length = 0;
  await page.goto(`${base}/studio/dashboard?tab=builder${query}`, { waitUntil: "load" });
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

try {
  await signIn(page);

  if (only.has("L1")) {
    errors.length = 0;
    await page.goto(`${base}/studio/dashboard?tab=builder`, { waitUntil: "load" });
    await page.getByTestId("dashboard").waitFor({ timeout: 120_000 });
    await sleep(6000);
    const marks = await watermarks();
    const fb = await page.getByTestId("studio-fallback").count();
    record("L1 licensed: Studio mounts, no watermark, no console errors", fb === 0 && marks === 0 && errors.length === 0, { fallback: fb, watermarks: marks, consoleErrors: [...errors] });
  }
  if (only.has("L2")) await fallback("L2 expired licence → notice + Community overview", "&aglicense=expired", "expired");
  if (only.has("L3")) await fallback("L3 missing licence → notice + Community overview", "&aglicense=missing", "no-key");
  if (only.has("L4")) await fallback("L4 server built without the key → falls back with no query param", "", "no-key");
} finally {
  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  log(`ag-checks: ${pass}/${results.length} passed`);
  if (pass !== results.length) process.exitCode = 1;
}
