import "server-only";
import { valueToCents } from "@shopfront/core";
import { and, eq, gt, schema, sql } from "@shopfront/db";
import { applyCheckoutEvent } from "./payments";
import { recordSellerRefund } from "./refunds";
import { services } from "./services";

// Phase 9 (D-083): the fallback for a refund handed off to a routed seller. The verified PAYMENT.CAPTURE.REFUNDED
// webhook usually closes it (13 s in Spike M); if that never arrives, these one-shot checks GET the order from PayPal
// and read its refunds. No polling loop (D-022): a few timers per open handoff, re-armed on boot.

export const HANDOFF_CHECK_DELAYS_MS = [2 * 60_000, 10 * 60_000, 60 * 60_000, 6 * 60 * 60_000] as const;

const g = globalThis as unknown as { __handoffTimers?: Map<string, NodeJS.Timeout[]> };
const timers = (g.__handoffTimers ??= new Map());

export function scheduleHandoffChecks(refundRequestId: string, delays: readonly number[] = HANDOFF_CHECK_DELAYS_MS) {
  for (const t of timers.get(refundRequestId) ?? []) clearTimeout(t);
  timers.set(
    refundRequestId,
    delays.map((d) => {
      const t = setTimeout(() => void runHandoffCheck(refundRequestId).catch((e) => console.error("[handoff] check failed", refundRequestId, e)), d);
      t.unref?.();
      return t;
    }),
  );
}

/** GET the order from PayPal; record any refund it lists that we haven't seen (the seller's, made in their PayPal). */
export async function runHandoffCheck(refundRequestId: string) {
  const { db, paypal } = services();
  const [r] = await db
    .select({ status: schema.refundRequests.status, checkoutId: schema.refundRequests.checkoutId, orderId: schema.checkouts.paypalOrderId, captureRowId: schema.refundRequests.captureId })
    .from(schema.refundRequests)
    .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
    .where(eq(schema.refundRequests.id, refundRequestId));
  if (!r || r.status !== "handoff" || !r.orderId) return { kind: "skipped" as const, status: r?.status };
  const { data: order } = await paypal.getOrder(r.orderId, { context: { checkoutId: r.checkoutId } });
  const payments = order.purchase_units?.[0]?.payments;
  const refunds = (payments?.refunds ?? []).filter((x) => x.status === "COMPLETED");
  const cap = payments?.captures?.[0];
  if (!refunds.length || !cap) return { kind: "waiting" as const };
  const refundedCents = refunds.reduce((n, x) => n + valueToCents(x.amount?.value ?? "0"), 0);
  await db
    .update(schema.captures)
    .set({ status: cap.status, refundedCents: sql`greatest(${schema.captures.refundedCents}, ${refundedCents})` })
    .where(eq(schema.captures.id, r.captureRowId!));
  await applyCheckoutEvent(r.checkoutId, cap.status === "REFUNDED" ? "REFUND_FULL" : "REFUND_PARTIAL", "poll");
  let recorded = 0;
  for (const x of refunds) if (await recordSellerRefund(r.checkoutId, { id: x.id, amountCents: valueToCents(x.amount?.value ?? "0") }, "poll")) recorded++;
  return { kind: "checked" as const, refunds: refunds.length, recorded };
}

/** On boot: re-arm checks for handoffs from the last 3 days. */
export async function rearmHandoffs() {
  const { db } = services();
  const rows = await db
    .select({ id: schema.refundRequests.id })
    .from(schema.refundRequests)
    .where(and(eq(schema.refundRequests.status, "handoff"), gt(schema.refundRequests.handoffAt, new Date(Date.now() - 3 * 86_400_000))))
    .limit(100);
  rows.forEach((x, i) => scheduleHandoffChecks(x.id, [5_000 + i * 1_500, ...HANDOFF_CHECK_DELAYS_MS.slice(1)]));
  return rows.length;
}
