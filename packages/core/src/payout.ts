// Phase 9 on the Partial path (D-076, D-083): each seller is paid directly into their own PayPal through
// `purchase_units[].payee`; Shopfront takes no cut. Refunds for routed sellers are made by the seller in their own
// PayPal (our app has no third-party refund permission) and reconciled from PayPal's answer.

export type PayoutStatus = 'platform' | 'none' | 'unverified' | 'verified';

export type PayeeRoute = { kind: 'platform' } | { kind: 'payee'; payee: { email_address: string } | { merchant_id: string } } | { kind: 'not_ready' };

/**
 * Where a seller's money goes. Only a verified account is paid (D-084: PayPal accepts an order to any email, so a
 * typed email that isn't a PayPal account would only fail at the buyer's approval). Unknown or incomplete setups are
 * `not_ready`: never routed to the platform by default.
 */
export function payeeRoute(s: { payoutStatus: string; payoutEmail: string | null; paypalMerchantId: string | null }): PayeeRoute {
  if (s.payoutStatus === 'platform') return { kind: 'platform' };
  if (s.payoutStatus === 'verified' && s.paypalMerchantId) return { kind: 'payee', payee: { merchant_id: s.paypalMerchantId } };
  if (s.payoutStatus === 'verified' && s.payoutEmail) return { kind: 'payee', payee: { email_address: s.payoutEmail } };
  return { kind: 'not_ready' };
}

export const MERCHANT_ID_RE = /^[A-Z0-9]{13}$/;
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

/** A seller's PayPal account as typed: an email or a merchant id. */
export function parsePayoutAccount(input: string): { email: string } | { merchantId: string } | null {
  const v = input.trim();
  if (MERCHANT_ID_RE.test(v.toUpperCase()) && !v.includes('@')) return { merchantId: v.toUpperCase() };
  const email = v.toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? { email } : null;
}

/** The first routed capture proves the account: PayPal returns the payee's merchant id. */
export function payeeVerification(
  seller: { storedMerchantId: string | null },
  merchantIdFromPayPal: string | undefined,
): { kind: 'verify'; merchantId: string } | { kind: 'same' } | { kind: 'mismatch'; expected: string; actual: string } | { kind: 'unknown' } {
  if (!merchantIdFromPayPal) return { kind: 'unknown' };
  if (!seller.storedMerchantId) return { kind: 'verify', merchantId: merchantIdFromPayPal };
  return seller.storedMerchantId === merchantIdFromPayPal ? { kind: 'same' } : { kind: 'mismatch', expected: seller.storedMerchantId, actual: merchantIdFromPayPal };
}

const CAPTURE_ID_RE = /^[A-Z0-9]{10,30}$/;

/** One tap to the capture's own transaction page in the seller's PayPal, which has "Issue a refund" (Spike M, D-076). */
export function refundHandoffLink(paypalApiBase: string, captureId: string): string {
  if (!CAPTURE_ID_RE.test(captureId)) throw new Error('Not a PayPal capture id');
  const sandbox = new URL(paypalApiBase).hostname.includes('sandbox');
  return `https://www.${sandbox ? 'sandbox.' : ''}paypal.com/activity/payment/${captureId}`;
}

/** What the seller actually refunded is what PayPal reports, never what we asked for. */
export function reconcileSellerRefund(r: { requestedCents: number; refundedCents: number }) {
  return { refundedCents: r.refundedCents, differs: r.refundedCents !== r.requestedCents, over: r.refundedCents > r.requestedCents };
}
