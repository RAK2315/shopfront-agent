// Webhook and capture recovery rules (REVIEW-1 #8).

/**
 * PayPal-Request-Id for a capture. After INSTRUMENT_DECLINED the buyer picks another method in PayPal and approves
 * again; that capture must be a new logical request, or PayPal's idempotency would replay the declined answer.
 * Attempt 0 keeps the original `capture-<checkout>` so every existing checkout stays idempotent.
 */
export function captureRequestId(checkoutId: string, attempt: number): string {
  if (!Number.isInteger(attempt) || attempt < 0) throw new Error(`Invalid capture attempt ${attempt}`);
  return attempt === 0 ? `capture-${checkoutId}` : `capture-${checkoutId}-${attempt}`;
}

/**
 * Did the signature check fail because PayPal couldn't answer (so we reply 5xx and PayPal redelivers), rather than
 * because it judged the delivery? `undefined` is a network failure. 401/403 mean our own credentials failed, which
 * says nothing about the delivery.
 */
export function isVerifyOutage(status: number | undefined): boolean {
  return status === undefined || status >= 500 || status === 429 || status === 401 || status === 403;
}

export const WEBHOOK_SWEEP = {
  /** A delivery's own after() runs within seconds; the sweep only picks up what it left behind. */
  minAgeMs: 60_000,
  maxAttempts: 5,
  batch: 20,
  /** At most one sweep per process in this window when it piggybacks on fallback checks. */
  throttleMs: 120_000,
} as const;

export function sweepEligible(
  row: { verified: boolean; processedAt: Date | null; lastDeliveryAt: Date; attempts: number },
  now: Date,
): boolean {
  return row.verified && row.processedAt === null && row.attempts < WEBHOOK_SWEEP.maxAttempts && now.getTime() - row.lastDeliveryAt.getTime() >= WEBHOOK_SWEEP.minAgeMs;
}
