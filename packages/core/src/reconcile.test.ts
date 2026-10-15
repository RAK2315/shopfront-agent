import { describe, expect, it } from 'vitest';
import { confirmationOf, fallbackAction, needsFallbackCheck, type ReconcileCheckout } from './reconcile';

const now = new Date('2026-10-18T12:00:00Z');
const later = new Date('2026-10-18T15:00:00Z');
const earlier = new Date('2026-10-18T09:00:00Z');
const ck = (o: Partial<ReconcileCheckout> = {}): ReconcileCheckout => ({
  status: 'created',
  expiresAt: later,
  webhookConfirmedAt: null,
  pollConfirmedAt: null,
  ...o,
});

describe('needsFallbackCheck', () => {
  it('checks open checkouts', () => {
    expect(needsFallbackCheck(ck())).toBe(true);
    expect(needsFallbackCheck(ck({ status: 'approved' }))).toBe(true);
    expect(needsFallbackCheck(ck({ status: 'capture_pending' }))).toBe(true);
  });
  it('checks a paid checkout only until something confirms it', () => {
    expect(needsFallbackCheck(ck({ status: 'paid' }))).toBe(true);
    expect(needsFallbackCheck(ck({ status: 'paid', webhookConfirmedAt: now }))).toBe(false);
    expect(needsFallbackCheck(ck({ status: 'paid', pollConfirmedAt: now }))).toBe(false);
  });
  it('never checks finished checkouts', () => {
    for (const s of ['cancelled', 'capture_denied', 'refunded', 'reversed'] as const) expect(needsFallbackCheck(ck({ status: s }))).toBe(false);
  });
});

describe('fallbackAction', () => {
  it('settles whenever PayPal already has a capture', () => {
    expect(fallbackAction(ck(), { status: 'COMPLETED', hasCapture: true }, now)).toEqual({ kind: 'settle' });
    expect(fallbackAction(ck({ status: 'paid' }), { status: 'COMPLETED', hasCapture: true }, now)).toEqual({ kind: 'settle' });
  });
  it('captures an approved order nobody captured', () => {
    expect(fallbackAction(ck(), { status: 'APPROVED', hasCapture: false }, now)).toEqual({ kind: 'capture' });
    expect(fallbackAction(ck({ status: 'approved' }), { status: 'APPROVED', hasCapture: false }, now)).toEqual({ kind: 'capture' });
  });
  it('captures an approved order even past our expiry (the buyer did approve)', () => {
    expect(fallbackAction(ck({ expiresAt: earlier }), { status: 'APPROVED', hasCapture: false }, now)).toEqual({ kind: 'capture' });
  });
  it('expires an unapproved checkout past its expiry', () => {
    expect(fallbackAction(ck({ expiresAt: earlier }), { status: 'PAYER_ACTION_REQUIRED', hasCapture: false }, now)).toEqual({ kind: 'expire' });
    expect(fallbackAction(ck({ expiresAt: now }), { status: 'CREATED', hasCapture: false }, now)).toEqual({ kind: 'expire' });
  });
  it('waits while the buyer still has time', () => {
    expect(fallbackAction(ck(), { status: 'PAYER_ACTION_REQUIRED', hasCapture: false }, now)).toEqual({ kind: 'wait' });
  });
});

describe('confirmationOf', () => {
  const base = { status: 'paid' as const, confirmedVia: 'capture_response', webhookConfirmedAt: null, pollConfirmedAt: null };
  it('prefers the verified webhook', () => {
    expect(confirmationOf({ ...base, webhookConfirmedAt: now, pollConfirmedAt: now })).toBe('webhook');
  });
  it('reports a poll confirmation', () => {
    expect(confirmationOf({ ...base, pollConfirmedAt: now })).toBe('poll');
    expect(confirmationOf({ ...base, confirmedVia: 'poll' })).toBe('poll');
  });
  it('is awaiting the webhook right after the capture response', () => {
    expect(confirmationOf(base)).toBe('awaiting_webhook');
  });
  it('is not shown before payment', () => {
    expect(confirmationOf({ ...base, status: 'created' })).toBeNull();
  });
});
