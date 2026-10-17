// UI review pack, stateful screens (D-073). Static public pages come from `screens` (the public view); this script
// covers the states that need a session or a real purchase, as a test run, so nothing lands on the public wire:
//   /shop with a checkout card → /pay before payment → a real PayPal sandbox approval → /pay after payment,
//   and the seller's Orders and dashboard as a test run sees them (with orders), for the style review.
// Run headed: PayPal's sandbox popup fails headless (D-048). Filenames never contain a pay URL's token.
// Usage: pnpm --filter web review-pack -- --base https://shopfront-agent.onrender.com [--out ../../docs/review-pack]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
const out = resolve(arg("--out", "../../docs/review-pack")!);
mkdirSync(out, { recursive: true });
const e = process.env as Record<string, string>;
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
/** Desktop and mobile shots of the page as it is now (same state, resized). */
async function both(page: Page, name: string, settle = 1200) {
  for (const [label, vp] of [
    ["desktop", DESKTOP],
    ["mobile", MOBILE],
  ] as const) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(settle);
    await page.screenshot({ path: join(out, `${name}-${label}.png`), fullPage: true });
    log("shot", `${name}-${label}.png`);
  }
  await page.setViewportSize(DESKTOP);
}

const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });
  await page.getByRole("button", { name: /blue mug under \$40/ }).click();
  await page.getByTestId("checkout-card").waitFor({ timeout: 120_000 });
  await both(page, "shop-checkout-card");

  const payP = ctx.waitForEvent("page");
  await page.getByTestId("pay-link").click();
  const pay = await payP;
  await pay.waitForLoadState("load");
  await pay.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
  await both(pay, "pay-before-payment", 2500);

  for (let attempt = 1; ; attempt++) {
    await pay.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    const popupP = pay.waitForEvent("popup", { timeout: 20_000 });
    await pay.locator("paypal-button").click();
    const popup = await popupP.catch(() => null);
    try {
      if (!popup) throw new Error("popup did not open");
      await loginAndApprove(popup, { email: e.SANDBOX_BUYER2_EMAIL || e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER2_PASSWORD || e.SANDBOX_BUYER_PASSWORD });
      break;
    } catch (err) {
      await popup?.close().catch(() => {});
      if (attempt >= 3) throw err;
      await sleep(8000);
      await pay.reload({ waitUntil: "load" });
    }
  }
  await pay.getByText("Payment complete").waitFor({ timeout: 120_000 });
  await pay.locator('[data-testid="webhook-state"][data-confirmation="webhook"]').waitFor({ timeout: 90_000 });
  await both(pay, "pay-after-payment");
  log("paid", new URL(pay.url()).pathname.split("/").pop());

  await ctx.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
  const seller = await ctx.newPage();
  await seller.goto(`${base}/studio/orders`, { waitUntil: "load" });
  await both(seller, "studio-orders-with-orders-testrun");
  await seller.goto(`${base}/studio/dashboard`, { waitUntil: "load" });
  await seller.waitForTimeout(8000);
  await both(seller, "studio-dashboard-with-orders-testrun", 4000);
  await ctx.close();
} finally {
  await browser.close();
}
log("review pack: stateful screens done");
