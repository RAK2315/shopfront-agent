import { describe, expect, it } from 'vitest';
import { reconcileLedger, type LedgerCapture, type LedgerInput } from './ledger-check';

const cap = (o: Partial<LedgerCapture> = {}): LedgerCapture => ({
  captureId: 'CAP1',
  checkoutId: 'chk_1',
  sellerId: 'sel_1',
  orderStatus: 'paid',
  captureStatus: 'COMPLETED',
  amountCents: 3300,
  orderTotalCents: 3300,
  isTest: false,
  ...o,
});
const run = (o: Partial<LedgerInput>) => reconcileLedger({ ours: [], paidWithoutCaptureRow: [], paypal: [], unknownAtPayPal: {}, explained: {}, ...o });

describe('reconcileLedger (D-095)', () => {
  it('a paid order whose capture PayPal reports is matched', () => {
    const r = run({ ours: [cap()], paypal: [{ captureId: 'CAP1', amountCents: 3300, source: 'transaction_search' }] });
    expect(r).toMatchObject({ matched: 1, matchedBySeller: { sel_1: 1 }, mismatches: [] });
  });

  it('the D-094 incident: captured at PayPal, cancelled in our DB → flagged', () => {
    const r = run({ ours: [cap({ orderStatus: 'cancelled' })], paypal: [{ captureId: 'CAP1', amountCents: 3300, source: 'webhook' }] });
    expect(r.mismatches).toEqual([expect.objectContaining({ kind: 'capture_without_paid_order', checkoutId: 'chk_1', orderStatus: 'cancelled' })]);
    expect(r.matched).toBe(0);
  });

  it('after the repair (refunded in full, order refunded) it is matched again', () => {
    const r = run({ ours: [cap({ orderStatus: 'refunded', captureStatus: 'REFUNDED' })] });
    expect(r).toMatchObject({ matched: 1, mismatches: [] });
  });

  it('a capture PayPal reports with no order at all → flagged, unless explained', () => {
    expect(run({ paypal: [{ captureId: 'X', amountCents: 3700, source: 'webhook', payeeMerchantId: 'M2' }] }).mismatches).toEqual([
      expect.objectContaining({ kind: 'capture_without_paid_order', captureId: 'X', payeeMerchantId: 'M2' }),
    ]);
    const r = run({ paypal: [{ captureId: 'X', amountCents: 3700, source: 'webhook' }], explained: { X: 'spike (D-076)' } });
    expect(r.mismatches).toEqual([]);
    expect(r.explained).toEqual([expect.objectContaining({ captureId: 'X', reason: 'spike (D-076)', amountCents: 3700 })]);
  });

  it('a paid order with no capture row → flagged', () => {
    const r = run({ paidWithoutCaptureRow: [{ checkoutId: 'chk_2', sellerId: 'sel_1', orderStatus: 'paid', totalCents: 1200, isTest: true }] });
    expect(r.mismatches).toEqual([expect.objectContaining({ kind: 'paid_order_without_capture', checkoutId: 'chk_2' })]);
  });

  it('a paid order whose capture PayPal does not know → flagged', () => {
    const r = run({ ours: [cap()], unknownAtPayPal: { CAP1: '404 RESOURCE_NOT_FOUND' } });
    expect(r.mismatches).toEqual([expect.objectContaining({ kind: 'paid_order_without_capture', captureId: 'CAP1' })]);
  });

  it('a paid order whose capture was declined → flagged', () => {
    expect(run({ ours: [cap({ captureStatus: 'DECLINED' })] }).mismatches[0]?.kind).toBe('paid_order_without_capture');
  });

  it('amounts that differ between the order, our capture and PayPal → flagged', () => {
    expect(run({ ours: [cap({ orderTotalCents: 3000 })] }).mismatches[0]?.kind).toBe('amount_mismatch');
    expect(run({ ours: [cap()], paypal: [{ captureId: 'CAP1', amountCents: 3000, source: 'transaction_search' }] }).mismatches[0]?.kind).toBe('amount_mismatch');
  });

  it('a declined capture on a declined order is not money and not a mismatch', () => {
    expect(run({ ours: [cap({ orderStatus: 'capture_denied', captureStatus: 'DECLINED' })] })).toMatchObject({ matched: 0, mismatches: [] });
  });
});
