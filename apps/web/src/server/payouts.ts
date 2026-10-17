import "server-only";
import { parsePayoutAccount, payeeVerification, ShopError } from "@shopfront/core";
import { eq, schema } from "@shopfront/db";
import { recordEvent } from "./events";
import { services } from "./services";

// Phase 9 on the Partial path (D-083): a seller connects their own PayPal by email or merchant id, and the first
// routed capture verifies it (PayPal returns the payee's merchant id). No Partner Referrals: that is gated (D-075).

/** Connect (or change) a seller's payout account. It stays `unverified` until a capture proves it. */
export async function setPayoutAccount(sellerId: string, account: string) {
  const parsed = parsePayoutAccount(account);
  if (!parsed) throw new ShopError("VALIDATION_ERROR", "Enter the email of your PayPal business account, or your 13-character PayPal merchant id.");
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  if (!s) throw new ShopError("NOT_FOUND", "Seller not found.");
  if (s.payoutStatus === "platform") throw new ShopError("CONFLICT", "This shop is paid into the platform account and can't be rerouted.");
  const merchantId = "merchantId" in parsed ? parsed.merchantId : null;
  const email = "email" in parsed ? parsed.email : null;
  const [row] = await db
    .update(schema.sellers)
    .set({ payoutEmail: email, paypalMerchantId: merchantId, payoutStatus: "unverified", payoutVerifiedAt: null })
    .where(eq(schema.sellers.id, sellerId))
    .returning({ payoutStatus: schema.sellers.payoutStatus });
  await recordEvent(db, { actor: "seller", kind: "payout_connected", sellerId, summary: "PayPal payout account connected · verified by the first payment", data: { by: merchantId ? "merchant_id" : "email" }, isTest: true });
  return { payoutStatus: row!.payoutStatus };
}

/**
 * After a capture on a routed checkout: PayPal names the payee's merchant id. The first one verifies the seller; a
 * different one later is flagged and changes nothing (PLAN 9.2).
 */
export async function verifyPayeeFromCapture(checkoutId: string, merchantIdFromPayPal: string | undefined) {
  const { db } = services();
  const [c] = await db.select({ sellerId: schema.checkouts.sellerId, payeeEmail: schema.checkouts.payeeEmail, payeeMerchantId: schema.checkouts.payeeMerchantId }).from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c || (!c.payeeEmail && !c.payeeMerchantId)) return null; // the platform account: nothing to verify
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.id, c.sellerId));
  if (!s) return null;
  const v = payeeVerification({ storedMerchantId: s.paypalMerchantId }, merchantIdFromPayPal);
  if (v.kind === "verify" || (v.kind === "same" && s.payoutStatus !== "verified")) {
    const merchantId = v.kind === "verify" ? v.merchantId : s.paypalMerchantId!;
    await db.update(schema.sellers).set({ paypalMerchantId: merchantId, payoutStatus: "verified", payoutVerifiedAt: new Date() }).where(eq(schema.sellers.id, s.id));
    await recordEvent(db, { actor: "paypal", kind: "payout_verified", checkoutId, sellerId: s.id, summary: `Seller's PayPal verified by the first payment · merchant ${merchantId}`, data: { merchantId } });
  } else if (v.kind === "mismatch") {
    await recordEvent(db, { actor: "paypal", kind: "payout_mismatch", checkoutId, sellerId: s.id, summary: `PayPal paid merchant ${v.actual}, not the connected ${v.expected} · check this seller's payout account`, data: v });
  }
  return v;
}
