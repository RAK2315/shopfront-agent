// Reconciliation with PayPal (D-095). Compares the captures PayPal reports (Transaction Search, verified webhooks,
// GET fallbacks) with our orders. Pure: the server gathers the inputs, this decides what is a mismatch.
// Found necessary on 2026-10-18 when two captured payments were left on cancelled orders (D-094).
import type { CheckoutStatus } from './checkout-state';

/** Order statuses in which a capture is expected: money moved and our books say so. */
export const PAID_STATUSES: ReadonlySet<CheckoutStatus> = new Set(['paid', 'shipped', 'partially_refunded', 'refunded', 'reversed']);
/** Capture statuses that mean money moved (a refund or reversal later still means it was captured). */
export const MONEY_CAPTURE_STATUSES: ReadonlySet<string> = new Set(['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED']);

/** Our side: one row per capture we recorded, joined with its order. */
export interface LedgerCapture {
  captureId: string;
  checkoutId: string;
  sellerId: string;
  orderStatus: CheckoutStatus;
  captureStatus: string;
  amountCents: number;
  orderTotalCents: number;
  isTest: boolean;
}

/** PayPal's side: a capture PayPal reports. */
export interface PayPalSeen {
  captureId: string;
  amountCents?: number;
  /** transaction_search | webhook | get */
  source: string;
  /** Who PayPal says was paid, when it says (webhooks and GETs do; Transaction Search is the platform account's own). */
  payeeMerchantId?: string;
}

export type MismatchKind = 'capture_without_paid_order' | 'paid_order_without_capture' | 'amount_mismatch';

export interface Mismatch {
  kind: MismatchKind;
  captureId?: string;
  checkoutId?: string;
  sellerId?: string;
  orderStatus?: CheckoutStatus;
  amountCents?: number;
  payeeMerchantId?: string;
  isTest?: boolean;
  detail: string;
}

export interface LedgerInput {
  ours: LedgerCapture[];
  /** Orders in a paid status that have no capture row at all. */
  paidWithoutCaptureRow: Array<{ checkoutId: string; sellerId: string; orderStatus: CheckoutStatus; totalCents: number; isTest: boolean }>;
  paypal: PayPalSeen[];
  /** Our captures PayPal was asked about directly (GET) and does not know or reports without money: id → PayPal's answer. */
  unknownAtPayPal: Record<string, string>;
  /** Captures with no order by design, each with its documented reason (e.g. a spike run outside the app). */
  explained: Record<string, string>;
}

export interface LedgerResult {
  matched: number;
  /** Matched captures per seller, for the seller's own badge. */
  matchedBySeller: Record<string, number>;
  mismatches: Mismatch[];
  explained: Array<{ captureId: string; reason: string; amountCents?: number; sellerId?: string; payeeMerchantId?: string }>;
}

export function reconcileLedger(input: LedgerInput): LedgerResult {
  const mismatches: Mismatch[] = [];
  const explained: LedgerResult['explained'] = [];
  const ours = new Map(input.ours.map((c) => [c.captureId, c]));

  // 1. A capture PayPal reports that no paid order of ours accounts for.
  const reported = new Map<string, PayPalSeen>();
  for (const p of input.paypal) if (!reported.has(p.captureId) || p.payeeMerchantId) reported.set(p.captureId, { ...reported.get(p.captureId), ...p });
  for (const p of reported.values()) {
    if (ours.has(p.captureId)) continue; // judged below, with the order
    if (input.explained[p.captureId]) {
      explained.push({ captureId: p.captureId, reason: input.explained[p.captureId]!, amountCents: p.amountCents, payeeMerchantId: p.payeeMerchantId });
      continue;
    }
    mismatches.push({ kind: 'capture_without_paid_order', captureId: p.captureId, amountCents: p.amountCents, payeeMerchantId: p.payeeMerchantId, detail: `PayPal reports this capture (${p.source}) but we have no order for it` });
  }

  let matched = 0;
  const matchedBySeller: Record<string, number> = {};
  for (const c of input.ours) {
    const money = MONEY_CAPTURE_STATUSES.has(c.captureStatus);
    const base = { captureId: c.captureId, checkoutId: c.checkoutId, sellerId: c.sellerId, orderStatus: c.orderStatus, amountCents: c.amountCents, isTest: c.isTest };
    if (input.explained[c.captureId]) {
      explained.push({ captureId: c.captureId, reason: input.explained[c.captureId]!, amountCents: c.amountCents, sellerId: c.sellerId });
      continue;
    }
    if (money && !PAID_STATUSES.has(c.orderStatus)) {
      mismatches.push({ ...base, kind: 'capture_without_paid_order', detail: `PayPal captured $${(c.amountCents / 100).toFixed(2)} but the order is ${c.orderStatus.replace(/_/g, ' ')}` });
      continue;
    }
    if (!money && PAID_STATUSES.has(c.orderStatus)) {
      mismatches.push({ ...base, kind: 'paid_order_without_capture', detail: `The order is ${c.orderStatus.replace(/_/g, ' ')} but its capture is ${c.captureStatus}` });
      continue;
    }
    if (input.unknownAtPayPal[c.captureId] && PAID_STATUSES.has(c.orderStatus)) {
      mismatches.push({ ...base, kind: 'paid_order_without_capture', detail: `The order is ${c.orderStatus.replace(/_/g, ' ')} but PayPal answers ${input.unknownAtPayPal[c.captureId]} for its capture` });
      continue;
    }
    const pp = reported.get(c.captureId)?.amountCents;
    if (money && (c.amountCents !== c.orderTotalCents || (pp !== undefined && pp !== c.amountCents))) {
      mismatches.push({ ...base, kind: 'amount_mismatch', detail: `Order total $${(c.orderTotalCents / 100).toFixed(2)}, our capture $${(c.amountCents / 100).toFixed(2)}${pp !== undefined ? `, PayPal $${(pp / 100).toFixed(2)}` : ''}` });
      continue;
    }
    if (money) {
      matched++;
      matchedBySeller[c.sellerId] = (matchedBySeller[c.sellerId] ?? 0) + 1;
    }
  }

  // 2. A paid order with no capture recorded at all.
  for (const o of input.paidWithoutCaptureRow) {
    mismatches.push({ kind: 'paid_order_without_capture', checkoutId: o.checkoutId, sellerId: o.sellerId, orderStatus: o.orderStatus, amountCents: o.totalCents, isTest: o.isTest, detail: `The order is ${o.orderStatus.replace(/_/g, ' ')} but no PayPal capture is recorded` });
  }
  return { matched, matchedBySeller, mismatches, explained };
}

/** A stable key per mismatch, so a run can tell which mismatches are new since the previous one. */
export function mismatchKey(m: Pick<Mismatch, 'kind' | 'captureId' | 'checkoutId'>): string {
  return `${m.kind}:${m.captureId ?? ''}:${m.checkoutId ?? ''}`;
}

export const MISMATCH_LABEL: Record<MismatchKind, string> = {
  capture_without_paid_order: 'Captured, but no paid order',
  paid_order_without_capture: 'Paid order, but no capture',
  amount_mismatch: 'Amounts differ',
};
