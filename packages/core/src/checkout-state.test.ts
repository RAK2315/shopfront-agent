import { describe, expect, it } from 'vitest';
import { CHECKOUT_EVENTS, CHECKOUT_STATUSES, transition, type CheckoutEvent, type CheckoutStatus } from './checkout-state';

const apply = (start: CheckoutStatus, events: CheckoutEvent[]) =>
  events.reduce<CheckoutStatus>((s, e) => {
    const r = transition(s, e);
    return r.kind === 'changed' ? r.to : s;
  }, start);

describe('checkout state machine', () => {
  it('happy path: created → approved → paid → shipped → refunded', () => {
    expect(apply('created', ['APPROVED', 'CAPTURE_COMPLETED', 'TRACKING_ADDED', 'REFUND_FULL'])).toBe('refunded');
  });

  it('Cart API capture on ship (D-098): approved → authorized → paid → shipped; or voided → cancelled', () => {
    expect(apply('created', ['APPROVED', 'AUTHORIZED', 'CAPTURE_COMPLETED', 'TRACKING_ADDED'])).toBe('shipped');
    expect(apply('created', ['APPROVED', 'AUTHORIZED', 'AUTHORIZATION_VOIDED'])).toBe('cancelled');
    expect(transition('authorized', 'APPROVED')).toMatchObject({ kind: 'noop', reason: 'stale' });
    expect(transition('authorized', 'AUTHORIZED')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
    expect(transition('paid', 'AUTHORIZED')).toMatchObject({ kind: 'noop', reason: 'stale' });
    expect(transition('paid', 'AUTHORIZATION_VOIDED').kind).toBe('conflict'); // a captured hold can't be voided
    expect(transition('authorized', 'TRACKING_ADDED').kind).toBe('conflict'); // capture first, then ship
    expect(transition('authorized', 'REFUND_FULL').kind).toBe('conflict'); // nothing was charged yet
  });

  it('pending capture then completion', () => {
    expect(apply('created', ['APPROVED', 'CAPTURE_PENDING', 'CAPTURE_COMPLETED'])).toBe('paid');
  });

  it('out-of-order webhooks: capture completed arrives before approval', () => {
    expect(apply('created', ['CAPTURE_COMPLETED', 'APPROVED'])).toBe('paid');
    expect(transition('paid', 'APPROVED')).toEqual({ kind: 'noop', status: 'paid', reason: 'stale' });
  });

  it('duplicate deliveries are no-ops (webhook retries, poll after webhook)', () => {
    expect(transition('paid', 'CAPTURE_COMPLETED')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
    expect(transition('shipped', 'CAPTURE_COMPLETED')).toMatchObject({ kind: 'noop', reason: 'stale' });
    expect(transition('approved', 'APPROVED')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
    expect(transition('refunded', 'REFUND_FULL')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
    expect(transition('shipped', 'TRACKING_ADDED')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
    expect(transition('partially_refunded', 'REFUND_PARTIAL')).toMatchObject({ kind: 'noop', reason: 'duplicate' });
  });

  it('partial then full refund', () => {
    expect(apply('shipped', ['REFUND_PARTIAL', 'REFUND_PARTIAL', 'REFUND_FULL'])).toBe('refunded');
  });

  it('unhappy paths: cancel, deny, reversal', () => {
    expect(apply('created', ['CANCELLED'])).toBe('cancelled');
    expect(apply('created', ['APPROVED', 'CAPTURE_DENIED'])).toBe('capture_denied');
    expect(apply('paid', ['CAPTURE_REVERSED'])).toBe('reversed');
    expect(transition('cancelled', 'APPROVED')).toMatchObject({ kind: 'noop', reason: 'stale' });
  });

  it('money moving on a dead checkout is a conflict, not silently ignored', () => {
    expect(transition('cancelled', 'CAPTURE_COMPLETED').kind).toBe('conflict');
    // D-095: a stray capture on a cancelled order is refunded in full → refunded; a partial refund stays a conflict.
    expect(transition('cancelled', 'REFUND_FULL')).toMatchObject({ kind: 'changed', to: 'refunded' });
    expect(transition('cancelled', 'REFUND_PARTIAL').kind).toBe('conflict');
    expect(transition('capture_denied', 'CAPTURE_COMPLETED').kind).toBe('conflict');
  });

  it('impossible jumps are conflicts', () => {
    expect(transition('created', 'REFUND_FULL').kind).toBe('conflict');
    expect(transition('created', 'TRACKING_ADDED').kind).toBe('conflict');
    expect(transition('paid', 'CANCELLED').kind).toBe('conflict'); // a paid order is refunded, never cancelled
  });

  it('is total and never moves backwards in the lifecycle', () => {
    const order: CheckoutStatus[] = ['created', 'approved', 'capture_pending', 'paid', 'shipped', 'partially_refunded', 'refunded'];
    for (const s of CHECKOUT_STATUSES) {
      for (const e of CHECKOUT_EVENTS) {
        const r = transition(s, e);
        expect(['changed', 'noop', 'conflict']).toContain(r.kind);
        if (r.kind === 'changed' && order.includes(r.from) && order.includes(r.to)) {
          expect(order.indexOf(r.to), `${s} + ${e}`).toBeGreaterThan(order.indexOf(r.from));
        }
      }
    }
  });
});
