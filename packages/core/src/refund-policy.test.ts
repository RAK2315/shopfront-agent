import { describe, expect, it } from 'vitest';
import { decideRefund, type RefundDecisionInput } from './refund-policy';
import { RefundPolicy } from './contracts';

const now = new Date('2026-11-01T12:00:00Z');
const policy = RefundPolicy.parse({}); // defaults: cap $40, 30 days, auto: wrong_size/damaged/not_as_described
const base: RefundDecisionInput = {
  reasonCode: 'wrong_size',
  requestedCents: 2800,
  capture: { status: 'COMPLETED', capturedCents: 3300, refundedCents: 0, capturedAt: new Date('2026-10-30T12:00:00Z') },
  buyerAutoRefundsLast30d: 0,
  policy,
  now,
};
const decide = (over: Partial<RefundDecisionInput>) => decideRefund({ ...base, ...over });

describe('refund policy engine', () => {
  it('auto-approves an in-policy refund', () => {
    const r = decide({});
    expect(r.decision).toBe('auto_approve');
    expect(r.amountCents).toBe(2800);
    expect(r.trace.every((t) => t.passed)).toBe(true);
  });

  it('denies when there is no completed capture or nothing left to refund', () => {
    expect(decide({ capture: null }).decision).toBe('deny');
    expect(decide({ capture: { ...base.capture!, status: 'PENDING' } }).decision).toBe('deny');
    expect(decide({ capture: { ...base.capture!, refundedCents: 3300 } }).decision).toBe('deny');
    expect(decide({ requestedCents: 0 }).decision).toBe('deny');
  });

  it('caps the amount at the remaining refundable balance', () => {
    const r = decide({ requestedCents: 50_000, capture: { ...base.capture!, capturedCents: 3300, refundedCents: 1000 } });
    expect(r.amountCents).toBe(2300);
  });

  it('routes to the seller: always-review reasons, outside window, over cap, non-auto reason, repeat buyer', () => {
    expect(decide({ reasonCode: 'never_arrived' }).decision).toBe('needs_seller');
    expect(decide({ capture: { ...base.capture!, capturedAt: new Date('2026-09-01T00:00:00Z') } }).decision).toBe('needs_seller');
    expect(decide({ requestedCents: 9500, capture: { ...base.capture!, capturedCents: 10_000 } }).decision).toBe('needs_seller');
    expect(decide({ reasonCode: 'changed_mind' }).decision).toBe('needs_seller');
    expect(decide({ buyerAutoRefundsLast30d: 2 }).decision).toBe('needs_seller');
  });

  it('records a trace step for every rule it evaluated', () => {
    const r = decide({ requestedCents: 9500, capture: { ...base.capture!, capturedCents: 10_000 } });
    expect(r.trace.map((t) => t.rule)).toEqual([
      'capture_completed',
      'refundable_balance',
      'positive_request',
      'amount_capped_to_remaining',
      'reason_not_always_review',
      'within_window',
      'under_auto_cap',
    ]);
    expect(r.trace.at(-1)!.passed).toBe(false);
  });
});
