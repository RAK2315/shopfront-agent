import "server-only";
import { confirmationOf, type CheckoutStatus, type Confirmation } from "@shopfront/core";
import { and, desc, eq, inArray, schema } from "@shopfront/db";
import { isTestRun } from "./run-context";
import { services } from "./services";

export interface SellerOrder {
  id: string;
  status: CheckoutStatus;
  confirmation: Confirmation;
  totalCents: number;
  items: string;
  buyerCountry: string | null;
  createdAt: string;
  paypalOrderId: string | null;
  captureId: string | null;
  refundedCents: number;
  shipment: { carrier: string; trackingNumber: string; source: string } | null;
  message: { subject: string; body: string; kind: string } | null;
}

export interface QueuedRefund {
  id: string;
  checkoutId: string;
  items: string;
  amountCents: number;
  reasonCode: string;
  details: string | null;
  ai: { reason_code?: string; summary?: string; confidence?: number; source?: string } | null;
  explanation: string;
  status: string;
  decision: string;
  paypalRefundId: string | null;
  createdAt: string;
}

const RULE_TEXT: Record<string, string> = {
  reason_not_always_review: "This reason is always reviewed by you",
  within_window: "Outside the automatic refund window",
  under_auto_cap: "Above your automatic refund limit",
  reason_auto_eligible: "Not an automatic refund reason",
  buyer_auto_refund_limit: "Buyer reached the automatic refund limit",
};

/** Test and script orders (D-070) are hidden here too, unless the request is itself a test run (AT-4, AT-5). */
export async function sellerOrders(sellerId: string) {
  const { db } = services();
  const includeTest = await isTestRun();
  const rows = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, sellerId), includeTest ? undefined : eq(schema.checkouts.isTest, false), inArray(schema.checkouts.status, ["paid", "shipped", "partially_refunded", "refunded", "reversed", "capture_pending"])))
    .orderBy(desc(schema.checkouts.createdAt))
    .limit(40);
  const ids = rows.map((r) => r.id);
  if (!ids.length) return { orders: [] as SellerOrder[], refunds: [] as QueuedRefund[] };
  const [items, caps, ships, msgs, refunds] = await Promise.all([
    db.select().from(schema.checkoutItems).where(inArray(schema.checkoutItems.checkoutId, ids)),
    db.select().from(schema.captures).where(inArray(schema.captures.checkoutId, ids)),
    db.select().from(schema.shipments).where(inArray(schema.shipments.checkoutId, ids)),
    db.select().from(schema.messages).where(inArray(schema.messages.checkoutId, ids)).orderBy(desc(schema.messages.createdAt)),
    db.select().from(schema.refundRequests).where(inArray(schema.refundRequests.checkoutId, ids)).orderBy(desc(schema.refundRequests.createdAt)),
  ]);
  const itemText = (id: string) =>
    items
      .filter((i) => i.checkoutId === id)
      .map((i) => `${i.quantity} × ${i.titleSnapshot}`)
      .join(", ");
  const orders: SellerOrder[] = rows.map((c) => {
    const cap = caps.find((k) => k.checkoutId === c.id);
    const ship = ships.find((s) => s.checkoutId === c.id);
    const m = msgs.find((x) => x.checkoutId === c.id);
    const status = c.status as CheckoutStatus;
    return {
      id: c.id,
      status,
      confirmation: confirmationOf({ ...c, status }),
      totalCents: c.totalCents,
      items: itemText(c.id),
      buyerCountry: c.buyerCountry,
      createdAt: c.createdAt.toISOString(),
      paypalOrderId: c.paypalOrderId,
      captureId: cap?.paypalCaptureId ?? null,
      refundedCents: cap?.refundedCents ?? 0,
      shipment: ship ? { carrier: ship.carrier, trackingNumber: ship.trackingNumber, source: ship.source } : null,
      message: m ? { subject: m.subject, body: m.body, kind: m.kind } : null,
    };
  });
  const queued: QueuedRefund[] = refunds.map((r) => {
    const failing = (r.decisionTrace as Array<{ rule: string; passed: boolean }>).find((t) => !t.passed);
    return {
      id: r.id,
      checkoutId: r.checkoutId,
      items: itemText(r.checkoutId),
      amountCents: r.amountCents,
      reasonCode: r.reasonCode,
      details: r.details,
      ai: (r.aiReasonSuggestion as QueuedRefund["ai"]) ?? null,
      explanation: r.decision === "auto_approve" ? "Within your policy: refunded automatically" : failing ? (RULE_TEXT[failing.rule] ?? failing.rule) : "Needs your review",
      status: r.status,
      decision: r.decision,
      paypalRefundId: r.paypalRefundId,
      createdAt: r.createdAt.toISOString(),
    };
  });
  return { orders, refunds: queued };
}
