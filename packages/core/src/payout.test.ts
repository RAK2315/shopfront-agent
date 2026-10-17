import { describe, expect, it } from 'vitest';
import { parsePayoutAccount, payeeRoute, payeeVerification, reconcileSellerRefund, refundHandoffLink } from './payout';

describe('payeeRoute', () => {
  it('omits payee for the platform account (the API caller is the merchant)', () => {
    expect(payeeRoute({ payoutStatus: 'platform', payoutEmail: null, paypalMerchantId: null })).toEqual({ kind: 'platform' });
  });
  it('refuses a seller with no payout account, so nothing is ever routed to the platform by default', () => {
    expect(payeeRoute({ payoutStatus: 'none', payoutEmail: null, paypalMerchantId: null })).toEqual({ kind: 'not_ready' });
    expect(payeeRoute({ payoutStatus: 'unverified', payoutEmail: null, paypalMerchantId: null })).toEqual({ kind: 'not_ready' });
  });
  it('routes an unverified seller by email and a verified one by merchant id', () => {
    expect(payeeRoute({ payoutStatus: 'unverified', payoutEmail: 'seller@example.com', paypalMerchantId: null })).toEqual({ kind: 'payee', payee: { email_address: 'seller@example.com' } });
    expect(payeeRoute({ payoutStatus: 'verified', payoutEmail: 'seller@example.com', paypalMerchantId: 'B83JSV9ELHV74' })).toEqual({ kind: 'payee', payee: { merchant_id: 'B83JSV9ELHV74' } });
  });
  it('treats an unknown status as not ready', () => {
    expect(payeeRoute({ payoutStatus: 'weird', payoutEmail: 'a@b.co', paypalMerchantId: null })).toEqual({ kind: 'not_ready' });
  });
});

describe('parsePayoutAccount', () => {
  it('accepts an email (lower-cased) or a 13-character merchant id', () => {
    expect(parsePayoutAccount('  Seller@Example.COM ')).toEqual({ email: 'seller@example.com' });
    expect(parsePayoutAccount('b83jsv9elhv74')).toEqual({ merchantId: 'B83JSV9ELHV74' });
  });
  it('rejects anything else', () => {
    for (const s of ['', 'not an email', 'a@b', 'B83JSV9ELHV7', 'x'.repeat(300) + '@a.co', 'a@b.co; drop table']) expect(parsePayoutAccount(s)).toBeNull();
  });
});

describe('payeeVerification', () => {
  it('verifies from the merchant id PayPal returns on the capture', () => {
    expect(payeeVerification({ storedMerchantId: null }, 'B83JSV9ELHV74')).toEqual({ kind: 'verify', merchantId: 'B83JSV9ELHV74' });
    expect(payeeVerification({ storedMerchantId: 'B83JSV9ELHV74' }, 'B83JSV9ELHV74')).toEqual({ kind: 'same' });
  });
  it('flags a different merchant id and changes nothing', () => {
    expect(payeeVerification({ storedMerchantId: 'B83JSV9ELHV74' }, 'DY7U9FZDLKJRE')).toEqual({ kind: 'mismatch', expected: 'B83JSV9ELHV74', actual: 'DY7U9FZDLKJRE' });
  });
  it('does nothing without a merchant id from PayPal', () => {
    expect(payeeVerification({ storedMerchantId: null }, undefined)).toEqual({ kind: 'unknown' });
  });
});

describe('refundHandoffLink', () => {
  it("opens the capture's own transaction page in the seller's PayPal (sandbox host from the API base)", () => {
    expect(refundHandoffLink('https://api-m.sandbox.paypal.com', '3G13556369039540R')).toBe('https://www.sandbox.paypal.com/activity/payment/3G13556369039540R');
  });
  it('rejects a capture id that is not PayPal-shaped', () => {
    expect(() => refundHandoffLink('https://api-m.sandbox.paypal.com', '../evil')).toThrow();
  });
});

describe('reconcileSellerRefund', () => {
  it('records the amount PayPal reports and flags a difference from the request', () => {
    expect(reconcileSellerRefund({ requestedCents: 4200, refundedCents: 4200 })).toEqual({ refundedCents: 4200, differs: false, over: false });
    expect(reconcileSellerRefund({ requestedCents: 4200, refundedCents: 4600 })).toEqual({ refundedCents: 4600, differs: true, over: true });
    expect(reconcileSellerRefund({ requestedCents: 4200, refundedCents: 2800 })).toEqual({ refundedCents: 2800, differs: true, over: false });
  });
});
