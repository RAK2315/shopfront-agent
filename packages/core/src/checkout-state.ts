// Checkout state machine. Monotonic: duplicate or late events (webhook retries, poll after webhook,
// out-of-order delivery) are no-ops, never regressions. Impossible jumps are reported as conflicts.

export const CHECKOUT_STATUSES = [
  'created',
  'approved',
  /** Cart API v1 (D-098): PayPal holds the buyer's money; it is captured when the seller ships. */
  'authorized',
  'capture_pending',
  'paid',
  'shipped',
  'partially_refunded',
  'refunded',
  'capture_denied',
  'reversed',
  'cancelled',
] as const;
export type CheckoutStatus = (typeof CHECKOUT_STATUSES)[number];

export const CHECKOUT_EVENTS = [
  'APPROVED',
  'AUTHORIZED',
  'AUTHORIZATION_VOIDED',
  'CAPTURE_PENDING',
  'CAPTURE_COMPLETED',
  'CAPTURE_DENIED',
  'TRACKING_ADDED',
  'REFUND_PARTIAL',
  'REFUND_FULL',
  'CAPTURE_REVERSED',
  'CANCELLED',
] as const;
export type CheckoutEvent = (typeof CHECKOUT_EVENTS)[number];

export type TransitionResult =
  | { kind: 'changed'; from: CheckoutStatus; to: CheckoutStatus }
  | { kind: 'noop'; status: CheckoutStatus; reason: 'duplicate' | 'stale' }
  | { kind: 'conflict'; status: CheckoutStatus; event: CheckoutEvent; reason: string };

export const TERMINAL_STATUSES: ReadonlySet<CheckoutStatus> = new Set(['refunded', 'capture_denied', 'reversed', 'cancelled']);

/** Rank orders the "payment lifecycle"; events that would move to a lower rank are stale. */
const RANK: Record<CheckoutStatus, number> = {
  created: 0,
  approved: 1,
  authorized: 2,
  capture_pending: 2,
  paid: 3,
  shipped: 4,
  partially_refunded: 5,
  refunded: 6,
  capture_denied: 6,
  reversed: 7,
  cancelled: 6,
};

const TABLE: Partial<Record<CheckoutStatus, Partial<Record<CheckoutEvent, CheckoutStatus>>>> = {
  created: {
    APPROVED: 'approved',
    CAPTURE_PENDING: 'capture_pending',
    CAPTURE_COMPLETED: 'paid', // webhook can beat the approval signal
    CAPTURE_DENIED: 'capture_denied',
    CANCELLED: 'cancelled',
  },
  approved: {
    AUTHORIZED: 'authorized',
    CAPTURE_PENDING: 'capture_pending',
    CAPTURE_COMPLETED: 'paid',
    CAPTURE_DENIED: 'capture_denied',
    CANCELLED: 'cancelled', // e.g. voided because stock ran out before capture (D-009)
  },
  // Capture on ship (D-098): the hold becomes a capture when tracking is added, or is voided if the order is cancelled.
  authorized: {
    CAPTURE_PENDING: 'capture_pending',
    CAPTURE_COMPLETED: 'paid',
    CAPTURE_DENIED: 'capture_denied',
    AUTHORIZATION_VOIDED: 'cancelled',
  },
  capture_pending: {
    CAPTURE_COMPLETED: 'paid',
    CAPTURE_DENIED: 'capture_denied',
  },
  paid: {
    TRACKING_ADDED: 'shipped',
    REFUND_PARTIAL: 'partially_refunded',
    REFUND_FULL: 'refunded',
    CAPTURE_REVERSED: 'reversed',
  },
  shipped: {
    REFUND_PARTIAL: 'partially_refunded',
    REFUND_FULL: 'refunded',
    CAPTURE_REVERSED: 'reversed',
  },
  partially_refunded: {
    REFUND_FULL: 'refunded',
    CAPTURE_REVERSED: 'reversed',
  },
  // A capture that landed after the order was cancelled (D-094) is money we must return: once it is refunded in full
  // the order ends refunded, so our books and PayPal's agree (D-095). Partial refunds and new captures stay conflicts.
  cancelled: {
    REFUND_FULL: 'refunded',
  },
};

/** Event → the status it leads to in the happy lifecycle, used to classify stale vs duplicate. */
const EVENT_TARGET: Record<CheckoutEvent, CheckoutStatus> = {
  APPROVED: 'approved',
  AUTHORIZED: 'authorized',
  AUTHORIZATION_VOIDED: 'cancelled',
  CAPTURE_PENDING: 'capture_pending',
  CAPTURE_COMPLETED: 'paid',
  CAPTURE_DENIED: 'capture_denied',
  TRACKING_ADDED: 'shipped',
  REFUND_PARTIAL: 'partially_refunded',
  REFUND_FULL: 'refunded',
  CAPTURE_REVERSED: 'reversed',
  CANCELLED: 'cancelled',
};

// Events that legitimately repeat without changing status (more tracking numbers, more partial refunds).
const REPEATABLE: Partial<Record<CheckoutStatus, ReadonlySet<CheckoutEvent>>> = {
  shipped: new Set(['TRACKING_ADDED']),
  partially_refunded: new Set(['REFUND_PARTIAL', 'TRACKING_ADDED']),
};

export function transition(current: CheckoutStatus, event: CheckoutEvent): TransitionResult {
  const next = TABLE[current]?.[event];
  if (next) return { kind: 'changed', from: current, to: next };

  if (EVENT_TARGET[event] === current || REPEATABLE[current]?.has(event)) {
    return { kind: 'noop', status: current, reason: 'duplicate' };
  }
  // An event pointing "behind" the current state (e.g. APPROVED after paid) is stale: ignore it.
  // Exception: a failed checkout (cancelled / capture_denied) may only absorb pre-capture signals;
  // anything else there — above all CAPTURE_COMPLETED — means money moved unexpectedly → conflict.
  const failed = current === 'cancelled' || current === 'capture_denied';
  const preCaptureSignal = event === 'APPROVED' || event === 'CAPTURE_PENDING';
  if (RANK[EVENT_TARGET[event]] < RANK[current] && (!failed || preCaptureSignal)) {
    return { kind: 'noop', status: current, reason: 'stale' };
  }
  return {
    kind: 'conflict',
    status: current,
    event,
    reason: `Event ${event} is not valid while checkout is ${current}.`,
  };
}

/** Customer-facing label per status (used by get_checkout_status and the UI). */
export const STATUS_LABEL: Record<CheckoutStatus, string> = {
  created: 'Awaiting payment',
  approved: 'Approved, capturing',
  authorized: 'Authorized · charged when it ships',
  capture_pending: 'Payment pending',
  paid: 'Paid',
  shipped: 'Shipped',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  capture_denied: 'Payment declined',
  reversed: 'Payment reversed',
  cancelled: 'Cancelled',
};

/** Statuses for which a refund may even be considered (policy still decides). */
export const REFUNDABLE_STATUSES: ReadonlySet<CheckoutStatus> = new Set(['paid', 'shipped', 'partially_refunded']);
