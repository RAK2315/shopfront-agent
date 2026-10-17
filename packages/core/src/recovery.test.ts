import { describe, expect, it } from 'vitest';
import { captureRequestId, isVerifyOutage, sweepEligible, WEBHOOK_SWEEP } from './recovery';

describe('captureRequestId', () => {
  it('keeps the original id for the first attempt, so existing checkouts stay idempotent', () => {
    expect(captureRequestId('chk_abc123def456', 0)).toBe('capture-chk_abc123def456');
  });
  it('gives each attempt after a decline its own PayPal-Request-Id', () => {
    expect(captureRequestId('chk_abc123def456', 1)).toBe('capture-chk_abc123def456-1');
    expect(captureRequestId('chk_abc123def456', 2)).toBe('capture-chk_abc123def456-2');
  });
  it('rejects a negative or fractional attempt', () => {
    expect(() => captureRequestId('chk_abc123def456', -1)).toThrow();
    expect(() => captureRequestId('chk_abc123def456', 1.5)).toThrow();
  });
});

describe('isVerifyOutage', () => {
  it('treats a network failure, 5xx, 429 and our own auth failures as an outage (answer 5xx so PayPal retries)', () => {
    for (const s of [undefined, 500, 502, 503, 429, 401, 403]) expect(isVerifyOutage(s)).toBe(true);
  });
  it('treats other 4xx as a verdict on the delivery (not verified, answer 2xx)', () => {
    for (const s of [400, 404, 422]) expect(isVerifyOutage(s)).toBe(false);
  });
});

describe('sweepEligible', () => {
  const now = new Date('2026-10-18T10:00:00Z');
  const old = new Date(now.getTime() - WEBHOOK_SWEEP.minAgeMs - 1);
  const row = { verified: true, processedAt: null, receivedAt: old, lastDeliveryAt: old, attempts: 1 };
  it('picks a verified, unprocessed event once its own after() has had time to run', () => {
    expect(sweepEligible(row, now)).toBe(true);
  });
  it('skips unverified, processed, fresh or exhausted events', () => {
    expect(sweepEligible({ ...row, verified: false }, now)).toBe(false);
    expect(sweepEligible({ ...row, processedAt: now }, now)).toBe(false);
    expect(sweepEligible({ ...row, lastDeliveryAt: new Date(now.getTime() - 1000) }, now)).toBe(false);
    expect(sweepEligible({ ...row, attempts: WEBHOOK_SWEEP.maxAttempts }, now)).toBe(false);
  });
});
