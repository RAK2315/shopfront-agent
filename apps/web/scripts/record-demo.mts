// Records the demo story's AI steps on the DEPLOYED app (live models, real PayPal sandbox), so LLM_MODE=replay can
// replay them (D-029, D-055). Run it after any prompt change. Beats it covers (DEMO-SCRIPT.md):
//   5–7  /shop starter "blue mug under $40" → checkout → PayPal approval → paid → thank-you note
//   8    seller adds tracking (manual entry here; the label photo is recorded by AT-3/AT-4) → PayPal /track → shipped note
//   9    the same buyer session: "It arrived the wrong size. Can I get a refund?" → request_refund → refund note
// Prints each AI step's source and every note subject. Never prints pay URLs or order tokens.
// Usage: pnpm --filter web record-demo -- --base https://shopfront-agent.onrender.com
import { chromium } from "@playwright/test";
import pg from "pg";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1]! : "").replace(/\/$/, "");
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
const e = process.env as Record<string, string>;
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q = async <R,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as R[];
async function until<T>(what: string, f: () => Promise<T | undefined>, ms = 90_000): Promise<T> {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 2000))) {
    const v = await f();
    if (v) return v;
  }
  throw new Error(`timed out waiting for ${what}`);
}
const note = (checkoutId: string, kind: string) =>
  until(`the ${kind} note`, async () => (await q<{ subject: string }>("select subject from messages where checkout_id=$1 and kind=$2 order by created_at desc limit 1", [checkoutId, kind]))[0]);

const [{ start }] = await q<{ start: number }>("select coalesce(max(id), 0)::int start from events");
const browser = await chromium.launch({ headless: false, channel: "chromium" });
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });
  await page.getByRole("button", { name: /blue mug under \$40/ }).click();
  await page.getByTestId("checkout-card").waitFor({ timeout: 120_000 });
  const payP = ctx.waitForEvent("page");
  await page.getByTestId("pay-link").click();
  const pay = await payP;
  // The sandbox popup sometimes fails to open after many logins (D-048): retry up to 3 times on the same order.
  for (let attempt = 1; ; attempt++) {
    await pay.locator('[data-phase="ready"]').waitFor({ timeout: 60_000 });
    const popupP = pay.waitForEvent("popup", { timeout: 20_000 });
    await pay.locator("paypal-button").click();
    const popup = await popupP.catch(() => null);
    try {
      if (!popup) throw new Error("popup did not open");
      await loginAndApprove(popup, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
      break;
    } catch (err) {
      await popup?.close().catch(() => {});
      if (attempt >= 3) throw err;
      log(`popup attempt ${attempt} failed; retrying`);
      await new Promise((r) => setTimeout(r, 8000));
      await pay.reload({ waitUntil: "load" });
    }
  }
  await pay.getByText("Payment complete").waitFor({ timeout: 120_000 });
  const checkoutId = new URL(pay.url()).pathname.split("/").pop()!;
  await pay.close();
  log("paid", checkoutId, "· thank-you:", (await note(checkoutId, "thank_you")).subject);

  const seller = await browser.newContext();
  await seller.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
  const tr = await seller.request.post(`${base}/api/seller/orders/${checkoutId}/tracking`, { data: { carrier: "USPS", tracking_number: `9400111899${Date.now().toString().slice(-12)}`, source: "manual" } });
  if (!tr.ok()) throw new Error(`tracking ${tr.status()} ${await tr.text()}`);
  log("tracking on the PayPal order · shipped note:", (await note(checkoutId, "shipped")).subject);
  await seller.close();

  await page.getByRole("textbox").fill("It arrived the wrong size. Can I get a refund?");
  await page.getByRole("button", { name: "Send" }).click();
  log("refund note:", (await note(checkoutId, "refund")).subject);

  const steps = await q<{ kind: string; source: string; summary: string }>(
    "select kind, data->>'source' source, summary from events where id > $1 and data ? 'source' order by id",
    [start],
  );
  for (const s of steps) log(`${s.kind.padEnd(18)} ${String(s.source).padEnd(8)} ${s.summary.slice(0, 90)}`);
  const live = steps.filter((s) => s.source === "groq" || s.source === "gemini").length;
  log(`${steps.length} AI steps (${live} live, now recorded for replay)`);
  await ctx.close();
} finally {
  await browser.close();
  await db.end();
}
