// Fallback reconciliation (D-025). Webhooks are primary; per-checkout timers ask PayPal only when no webhook
// has confirmed the payment yet. These pure functions decide whether a check is needed and what it should do.
import type { CheckoutStatus } from './checkout-state';

/** Delays for checks armed when a checkout is created or paid by a capture response (D-025). */
export const FALLBACK_DELAYS_MS = [60_000, 180_000, 600_000] as const;

/**
 * Denser checks while a buyer is on the pay page: we cannot see the moment they approve in PayPal, so checks
 * at most 60 s apart catch an approval whose capture never arrives (tab closed, webhook lost) within about a minute.
 */
export const PAY_PAGE_DELAYS_MS = [45_000, 90_000, 150_000, 210_000, 300_000, 600_000] as const;

export interface ReconcileCheckout {
  status: CheckoutStatus;
  expiresAt: Date;
  webhookConfirmedAt: Date | null;
  pollConfirmedAt: Date | null;
}

const OPEN: ReadonlySet<CheckoutStatus> = new Set(['created', 'approved', 'capture_pending']);
const PAID: ReadonlySet<CheckoutStatus> = new Set(['paid', 'shipped', 'partially_refunded']);

/** True while a GET to PayPal could still teach us something. Finished or independently confirmed checkouts need nothing. */
export function needsFallbackCheck(c: ReconcileCheckout): boolean {
  if (OPEN.has(c.status)) return true;
  if (PAID.has(c.status)) return !c.webhookConfirmedAt && !c.pollConfirmedAt;
  return false;
}

export type FallbackAction =
  /** PayPal already has a capture: reconcile our state from it (marks paid, or confirms an existing paid). */
  | { kind: 'settle' }
  /** The buyer approved but nobody captured (tab closed, webhook lost): capture now with the same idempotent request id. */
  | { kind: 'capture' }
  /** Never approved and past our expiry: cancel the checkout. */
  | { kind: 'expire' }
  /** Still waiting for the buyer. */
  | { kind: 'wait' };

/** `order` is what GET /v2/checkout/orders/{id} returned. */
export function fallbackAction(c: ReconcileCheckout, order: { status: string; hasCapture: boolean }, now: Date): FallbackAction {
  if (order.hasCapture) return { kind: 'settle' };
  if (order.status === 'APPROVED' && OPEN.has(c.status)) return { kind: 'capture' };
  if (c.status === 'created' && c.expiresAt.getTime() <= now.getTime()) return { kind: 'expire' };
  return { kind: 'wait' };
}

/** How the UI explains the way a paid checkout was confirmed (the `confirmed_via` badge). */
export type Confirmation = 'webhook' | 'poll' | 'awaiting_webhook' | null;

export function confirmationOf(c: {
  status: CheckoutStatus;
  confirmedVia: string | null;
  webhookConfirmedAt: Date | string | null;
  pollConfirmedAt: Date | string | null;
}): Confirmation {
  if (!PAID.has(c.status) && c.status !== 'refunded' && c.status !== 'reversed') return null;
  if (c.webhookConfirmedAt) return 'webhook';
  if (c.pollConfirmedAt || c.confirmedVia === 'poll') return 'poll';
  return 'awaiting_webhook';
}
