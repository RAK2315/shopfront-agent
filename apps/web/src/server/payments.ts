import "server-only";
import { transition, type CheckoutEvent, type CheckoutStatus, valueToCents, newId } from "@shopfront/core";
import { eq, schema, sql } from "@shopfront/db";
import { firstCapture, PayPalApiError, type PayPalCapture, type PayPalOrder } from "@shopfront/paypal";
import { recordEvent } from "./events";
import { services } from "./services";

type Checkout = typeof schema.checkouts.$inferSelect;

/**
 * Applies a lifecycle event to a checkout through the state machine (monotonic; duplicates are no-ops).
 * Every path that learns about payment state — capture response, webhook, fallback check — goes through here.
 */
export async function applyCheckoutEvent(
  checkoutId: string,
  event: CheckoutEvent,
  via: "capture_response" | "webhook" | "poll" | "seller" | "system",
  extra: Partial<Pick<Checkout, "buyerEmail" | "buyerCountry" | "shippingAddress">> = {},
) {
  const { db } = services();
  return db.transaction(async (tx) => {
    const [c] = await tx.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId)).for("update");
    if (!c) return null;
    const r = transition(c.status as CheckoutStatus, event);
    if (r.kind === "changed") {
      await tx
        .update(schema.checkouts)
        .set({
          status: r.to,
          confirmedVia: r.to === "paid" && !c.confirmedVia ? via : c.confirmedVia,
          updatedAt: new Date(),
          ...extra,
        })
        .where(eq(schema.checkouts.id, checkoutId));
    } else if (Object.keys(extra).length) {
      await tx.update(schema.checkouts).set({ ...extra, updatedAt: new Date() }).where(eq(schema.checkouts.id, checkoutId));
    }
    return { checkout: c, result: r };
  });
}

function buyerDetails(order: PayPalOrder) {
  const shipping = order.purchase_units?.[0]?.shipping;
  return {
    buyerEmail: order.payer?.email_address ?? null,
    buyerCountry: (shipping?.address?.country_code as string | undefined) ?? order.payer?.address?.country_code ?? null,
    shippingAddress: shipping?.address ? { name: shipping.name?.full_name ?? "", ...shipping.address } : null,
  };
}

/** Insert the capture once (unique paypal_capture_id) and decrement stock exactly once. */
async function recordCapture(checkoutId: string, cap: PayPalCapture) {
  const { db } = services();
  const inserted = await db
    .insert(schema.captures)
    .values({
      id: newId("capture"),
      checkoutId,
      paypalCaptureId: cap.id,
      amountCents: valueToCents(cap.amount.value),
      status: cap.status,
      capturedAt: cap.create_time ? new Date(cap.create_time) : new Date(),
    })
    .onConflictDoUpdate({ target: schema.captures.paypalCaptureId, set: { status: cap.status } })
    .returning({ id: schema.captures.id, xmax: sql<string>`xmax` });
  const isNew = inserted[0]?.xmax === "0";
  if (isNew && cap.status === "COMPLETED") {
    await db.execute(sql`
      update ${schema.variants} v set stock = greatest(v.stock - ci.quantity, 0)
      from ${schema.checkoutItems} ci
      where ci.checkout_id = ${checkoutId} and ci.variant_id = v.id`);
  }
  return isNew;
}

export type CaptureOutcome =
  | { ok: true; status: CheckoutStatus; captureId: string; captureStatus: string }
  | { ok: false; reason: "declined" | "not_approved" | "already_final" | "not_found" | "error"; message: string; debugId?: string };

/** Server-side capture after the buyer approved in PayPal. Idempotent (PayPal-Request-Id = capture-<checkout>). */
export async function captureCheckout(checkoutId: string, trigger: "pay_page" | "return_url" | "webhook_approved"): Promise<CaptureOutcome> {
  const { db, paypal } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c?.paypalOrderId) return { ok: false, reason: "not_found", message: "Checkout not found." };
  if (["paid", "shipped", "partially_refunded", "refunded"].includes(c.status)) {
    const [cap] = await db.select().from(schema.captures).where(eq(schema.captures.checkoutId, c.id));
    return { ok: true, status: c.status as CheckoutStatus, captureId: cap?.paypalCaptureId ?? "", captureStatus: cap?.status ?? "COMPLETED" };
  }
  if (["cancelled", "capture_denied", "reversed"].includes(c.status)) {
    return { ok: false, reason: "already_final", message: `Checkout is ${c.status}.` };
  }

  // D-009: stock is checked again before money moves.
  const short = await db.execute<{ variant_id: string }>(sql`
    select ci.variant_id from ${schema.checkoutItems} ci join ${schema.variants} v on v.id = ci.variant_id
    where ci.checkout_id = ${checkoutId} and v.stock < ci.quantity`);
  if (short.rows.length) {
    await applyCheckoutEvent(checkoutId, "CANCELLED", "system");
    await recordEvent(db, { actor: "server", kind: "capture_skipped", checkoutId, sellerId: c.sellerId, summary: "Sold out before payment — not captured" });
    return { ok: false, reason: "declined", message: "Sorry, this item sold out before payment completed. You were not charged." };
  }

  const requestId = `capture-${checkoutId}`;
  try {
    const { data: order, debugId } = await paypal.captureOrder(c.paypalOrderId, requestId, { context: { checkoutId } });
    return await settleFromOrder(checkoutId, order, "capture_response", { debugId, requestId, trigger });
  } catch (e) {
    if (e instanceof PayPalApiError) {
      const issue = JSON.stringify(e.details ?? "");
      if (/ORDER_ALREADY_CAPTURED/.test(issue)) {
        const { data: order } = await paypal.getOrder(c.paypalOrderId, { context: { checkoutId } });
        return settleFromOrder(checkoutId, order, "capture_response", { requestId, trigger });
      }
      if (/INSTRUMENT_DECLINED/.test(issue)) {
        await recordEvent(db, { actor: "paypal", kind: "capture_declined", checkoutId, sellerId: c.sellerId, summary: "Instrument declined — buyer asked to choose another method", data: { debugId: e.debugId } });
        return { ok: false, reason: "declined", message: "Your payment method was declined. Please try another one in PayPal.", debugId: e.debugId };
      }
      if (/ORDER_NOT_APPROVED/.test(issue)) return { ok: false, reason: "not_approved", message: "The payment has not been approved yet.", debugId: e.debugId };
      await recordEvent(db, { actor: "paypal", kind: "capture_failed", checkoutId, sellerId: c.sellerId, summary: `Capture failed (${e.issue})`, data: { debugId: e.debugId } });
      return { ok: false, reason: "error", message: "PayPal could not complete the payment.", debugId: e.debugId };
    }
    throw e;
  }
}

/** Reconcile our checkout from a PayPal order (capture response or fallback GET). */
export async function settleFromOrder(
  checkoutId: string,
  order: PayPalOrder,
  via: "capture_response" | "poll",
  meta: { debugId?: string; requestId?: string; trigger?: string } = {},
): Promise<CaptureOutcome> {
  const { db } = services();
  const cap = firstCapture(order);
  const details = buyerDetails(order);
  if (!cap) {
    if (order.status === "APPROVED") await applyCheckoutEvent(checkoutId, "APPROVED", via, details);
    return { ok: false, reason: "not_approved", message: `Order is ${order.status}.` };
  }
  await recordCapture(checkoutId, cap);
  const ev: CheckoutEvent = cap.status === "COMPLETED" ? "CAPTURE_COMPLETED" : cap.status === "PENDING" ? "CAPTURE_PENDING" : "CAPTURE_DENIED";
  const r = await applyCheckoutEvent(checkoutId, ev, via, details);
  if (r?.result.kind === "changed") {
    await recordEvent(db, {
      actor: via === "poll" ? "poller" : "paypal",
      kind: "captured",
      checkoutId,
      sellerId: r.checkout.sellerId,
      summary: cap.status === "COMPLETED" ? `Payment captured — order marked PAID (via ${via === "poll" ? "fallback check" : "capture response"})` : `Capture ${cap.status.toLowerCase()}`,
      data: { orderId: order.id, captureId: cap.id, debugId: meta.debugId, paypalRequestId: meta.requestId, trigger: meta.trigger },
    });
  }
  const [c] = await db.select({ status: schema.checkouts.status }).from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  return { ok: cap.status !== "DECLINED", status: c!.status as CheckoutStatus, captureId: cap.id, captureStatus: cap.status } as CaptureOutcome;
}
