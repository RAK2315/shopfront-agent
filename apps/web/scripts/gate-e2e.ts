// Phase 1 gate, end to end on a real deployment (no mocks):
// buyer agent → our MCP server → PayPal Orders v2 → sandbox buyer approves in the PayPal popup (Playwright)
// → server capture → PayPal webhook (signature-verified) → checkout state in Neon.
// Usage: pnpm --filter web gate -- --base https://<app>.onrender.com [--out ../../docs/screenshots/phase-1] [--headed]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";
import { runBuyerAgent } from "./buyer-agent";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const base = (arg("--base", process.env.APP_URL) ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/phase-1")!);
const headed = args.includes("--headed");
const email = process.env.SANDBOX_BUYER_EMAIL!;
const password = process.env.SANDBOX_BUYER_PASSWORD!;
mkdirSync(out, { recursive: true });

const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

async function approveInPopup(popup: Page) {
  await popup.waitForLoadState("domcontentloaded");
  await popup.screenshot({ path: join(out, "gate-02-paypal-login.png") });
  // Sandbox login: email → Next → password → Log in. Selectors are PayPal's own ids, with role fallbacks.
  const emailBox = popup.locator("#email, input[name='login_email']").first();
  await emailBox.waitFor({ timeout: 45_000 });
  await emailBox.fill(email);
  const next = popup.locator("#btnNext");
  if (await next.isVisible().catch(() => false)) await next.click();
  const pw = popup.locator("#password, input[name='login_password']").first();
  await pw.waitFor({ timeout: 30_000 });
  await pw.fill(password);
  await popup.getByRole('button', { name: /^log in$/i }).click();
  // Review page → pay.
  const pay = popup.getByRole('button', { name: /complete purchase|pay now|^pay$|continue to review|agree.*pay/i }).first();
  await pay.waitFor({ timeout: 60_000 });
  await popup.waitForTimeout(1500);
  await popup.screenshot({ path: join(out, "gate-03-paypal-review.png") });
  await pay.click();
}

async function main() {
  if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
  log("1/5 buyer agent → MCP", `${base}/mcp`);
  const agent = await runBuyerAgent(`${base}/mcp`, "Find me a handmade blue mug under $40 as a gift and set up the checkout.");
  for (const s of agent.steps) log(`   ${s.tool} ${s.ok ? "ok" : "ERROR"} ${s.ms}ms via ${s.source}`);
  if (!agent.checkout) throw new Error(`Agent did not create a checkout. Final text: ${agent.finalText}`);
  const { checkout_id, pay_url, paypal_order_id, order_token } = agent.checkout;
  log("2/5 order created", { checkout_id, paypal_order_id, total: agent.checkout.totals.total });

  // Full Chromium (new headless) — the headless shell crashed after the PayPal popup closed in rehearsal.
  const browser = await chromium.launch({ headless: !headed, channel: "chromium" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(pay_url, { waitUntil: "networkidle" });
  const btn = page.locator("paypal-button");
  await btn.waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({ path: join(out, "gate-01-pay-page.png") });

  log("3/5 human approval in the PayPal popup (sandbox buyer)");
  const popupPromise = page.waitForEvent("popup", { timeout: 30_000 });
  await btn.click();
  const popup = await popupPromise;
  try {
    await approveInPopup(popup);
  } catch (e) {
    await popup.screenshot({ path: join(out, "gate-error-popup.png") }).catch(() => {});
    throw e;
  }

  log("4/5 waiting for capture + webhook");
  await page.getByText("Payment complete").waitFor({ timeout: 90_000 });
  await page.getByText("PayPal webhook received and signature verified").waitFor({ timeout: 180_000 });
  await page.screenshot({ path: join(out, "gate-04-paid-webhook-verified.png"), fullPage: true });
  await browser.close();

  log("5/5 proof from Neon");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const c = (await db.query("select id, status, confirmed_via, webhook_confirmed_at, paypal_order_id, total_cents from checkouts where id=$1", [checkout_id])).rows[0];
  const cap = (await db.query("select paypal_capture_id, status, amount_cents from captures where checkout_id=$1", [checkout_id])).rows[0];
  const wh = (
    await db.query(
      "select event_id, event_type, verified, processed_at from webhook_events where payload->'resource'->'supplementary_data'->'related_ids'->>'order_id' = $1 or resource_id = $1 order by received_at",
      [paypal_order_id],
    )
  ).rows;
  await db.end();
  const proof = { checkout: c, capture: cap, webhooks: wh, screenshots: out, order_token_present: Boolean(order_token) };
  console.log(JSON.stringify(proof, null, 2));
  const ok = c?.status === "paid" && cap?.status === "COMPLETED" && wh.some((w: { event_type: string; verified: boolean }) => w.event_type === "PAYMENT.CAPTURE.COMPLETED" && w.verified);
  log(ok ? "GATE PASSED" : "GATE NOT PASSED");
  process.exit(ok ? 0 : 2);
}

main().catch((e) => {
  console.error("GATE FAILED:", e);
  process.exit(1);
});
