// REFUND POLICY ENGINE (D-002). Pure and deterministic. The LLM may *suggest* a reason code;
// only this function decides. Every rule evaluated is recorded in `trace` for the decision UI.
import type { RefundPolicy, RefundReasonCode } from './contracts';

export type RefundDecision = 'auto_approve' | 'needs_seller' | 'deny';

export interface RefundCaptureState {
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  capturedCents: number;
  refundedCents: number;
  capturedAt: Date;
}

export interface RefundDecisionInput {
  reasonCode: RefundReasonCode;
  /** Server-computed (refundAmountForItems), never from user/model text. */
  requestedCents: number;
  capture: RefundCaptureState | null;
  buyerAutoRefundsLast30d: number;
  policy: RefundPolicy;
  now: Date;
}

export interface TraceStep {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface RefundDecisionResult {
  decision: RefundDecision;
  amountCents: number;
  trace: TraceStep[];
  explanation: string;
}

const DAY_MS = 86_400_000;

export function decideRefund(input: RefundDecisionInput): RefundDecisionResult {
  const { capture, policy } = input;
  const trace: TraceStep[] = [];
  const step = (rule: string, passed: boolean, detail: string) => {
    trace.push({ rule, passed, detail });
    return passed;
  };
  const finish = (decision: RefundDecision, amountCents: number, explanation: string): RefundDecisionResult => ({
    decision,
    amountCents,
    trace,
    explanation,
  });

  // Hard gates → deny
  const refundableStatus = capture?.status === 'COMPLETED' || capture?.status === 'PARTIALLY_REFUNDED';
  if (!step('capture_completed', !!capture && refundableStatus, capture ? `capture status ${capture.status}` : 'no capture')) {
    return finish('deny', 0, 'This order has no completed payment to refund.');
  }
  const remaining = capture!.capturedCents - capture!.refundedCents;
  if (!step('refundable_balance', remaining > 0, `remaining ${remaining}c`)) {
    return finish('deny', 0, 'This order has already been fully refunded.');
  }
  if (!step('positive_request', input.requestedCents > 0, `requested ${input.requestedCents}c`)) {
    return finish('deny', 0, 'Nothing to refund for the selected items.');
  }
  const amountCents = Math.min(input.requestedCents, remaining);
  step('amount_capped_to_remaining', true, `amount ${amountCents}c`);

  // Soft gates → needs_seller (the seller can still approve with one tap)
  if (!step('reason_not_always_review', !policy.always_review_reasons.includes(input.reasonCode), `reason ${input.reasonCode}`)) {
    return finish('needs_seller', amountCents, `"${input.reasonCode}" refunds are always reviewed by the seller.`);
  }
  const ageDays = Math.floor((input.now.getTime() - capture!.capturedAt.getTime()) / DAY_MS);
  if (!step('within_window', ageDays <= policy.window_days, `${ageDays}d since payment, window ${policy.window_days}d`)) {
    return finish('needs_seller', amountCents, `Outside the ${policy.window_days}-day automatic refund window.`);
  }
  if (!step('under_auto_cap', amountCents <= policy.auto_refund_max_cents, `${amountCents}c vs cap ${policy.auto_refund_max_cents}c`)) {
    return finish('needs_seller', amountCents, 'Above the automatic refund limit; waiting for the seller.');
  }
  if (!step('reason_auto_eligible', policy.auto_reasons.includes(input.reasonCode), `reason ${input.reasonCode}`)) {
    return finish('needs_seller', amountCents, `"${input.reasonCode}" is not an automatic refund reason.`);
  }
  if (
    !step(
      'buyer_auto_refund_limit',
      input.buyerAutoRefundsLast30d < policy.max_auto_refunds_per_buyer_30d,
      `${input.buyerAutoRefundsLast30d} auto refunds in 30d (max ${policy.max_auto_refunds_per_buyer_30d})`,
    )
  ) {
    return finish('needs_seller', amountCents, 'Buyer reached the automatic refund limit; waiting for the seller.');
  }
  return finish('auto_approve', amountCents, 'Within the seller’s refund policy; processing automatically.');
}
