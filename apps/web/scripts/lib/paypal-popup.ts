// Drives the real PayPal sandbox popup (no mocks): log in as a sandbox buyer and approve the payment.
// Run headed: PayPal's sandbox fails after login in headless Chromium (HANDOFF risk 1).
import type { Page } from "@playwright/test";

export async function loginAndApprove(popup: Page, buyer: { email: string; password: string }, shots: { login?: string; review?: string } = {}) {
  await popup.waitForLoadState("domcontentloaded");
  if (shots.login) await popup.screenshot({ path: shots.login });
  const emailBox = popup.locator("#email, input[name='login_email']").first();
  // PayPal's sandbox sometimes shows "Things don't appear to be working at the moment" with a Try again button.
  for (let i = 0; ; i++) {
    const ready = await emailBox.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    if (ready) break;
    const tryAgain = popup.getByRole("button", { name: /try again/i }).first();
    if (i < 3 && (await tryAgain.isVisible().catch(() => false))) {
      await tryAgain.click().catch(() => {});
      continue;
    }
    if (i >= 3) throw new Error("PayPal's sandbox login page didn't load (after 3 tries)");
  }
  await emailBox.fill(buyer.email);
  const next = popup.locator("#btnNext");
  if (await next.isVisible().catch(() => false)) await next.click();
  const pw = popup.locator("#password, input[name='login_password']").first();
  await pw.waitFor({ timeout: 30_000 });
  await pw.fill(buyer.password);
  await popup.getByRole("button", { name: /^log in$/i }).click();
  const pay = popup.getByRole("button", { name: /complete purchase|pay now|^pay$|continue to review|agree.*pay/i }).first();
  await pay.waitFor({ timeout: 60_000 });
  await popup.waitForTimeout(1500);
  if (shots.review) await popup.screenshot({ path: shots.review });
  await pay.click();
}
