import "server-only";
import { newId, valueToCents } from "@shopfront/core";
import { eq, schema, sql } from "@shopfront/db";
import type { PayPalCapture, PayPalOrder } from "@shopfront/paypal";
import { env } from "./env";
import { recordEvent } from "./events";
import { applyCheckoutEvent, captureCheckout } from "./payments";
import { services } from "./services";

interface WebhookEvent {
  id: string;
  event_type: string;
  resource_type?: string;
  summary?: string;
  resource: Record<string, unknown>;
}

export type IngestResult = { status: "duplicate" | "stored"; verified: boolean; eventId: string; eventType: string };

/**
 * Step 1 (synchronous, before we answer PayPal): verify the signature with PayPal and store the event once,
 * keyed by PayPal's event id. All event types are subscribed; we filter here (owner decision, D-039).
 */
export async function ingestWebhook(rawBody: string, headers: Headers): Promise<IngestResult> {
  const { db, paypal } = services();
  const event = JSON.parse(rawBody) as WebhookEvent;
  if (!event?.id || !event.event_type) throw new Error("Not a PayPal webhook event");

  const [existing] = await db.select().from(schema.webhookEvents).where(eq(schema.webhookEvents.eventId, event.id));
  if (existing) return { status: "duplicate", verified: existing.verified, eventId: event.id, eventType: event.event_type };

  const e = env();
  let verified = false;
  const h = {
    authAlgo: headers.get("paypal-auth-algo") ?? "",
    certUrl: headers.get("paypal-cert-url") ?? "",
    transmissionId: headers.get("paypal-transmission-id") ?? "",
    transmissionSig: headers.get("paypal-transmission-sig") ?? "",
    transmissionTime: headers.get("paypal-transmission-time") ?? "",
  };
  if (e.PAYPAL_WEBHOOK_ID && h.transmissionSig) {
    try {
      verified = await paypal.verifyWebhookSignature(h, rawBody, e.PAYPAL_WEBHOOK_ID, `verify-${event.id}`);
    } catch {
      verified = false;
    }
  }
  if (!verified && e.DEV_ALLOW_UNVERIFIED_WEBHOOKS && process.env.NODE_ENV !== "production") verified = true;

  const resourceId = typeof event.resource?.id === "string" ? event.resource.id : null;
  const inserted = await db
    .insert(schema.webhookEvents)
    .values({ eventId: event.id, eventType: event.event_type, resourceId, verified, payload: event as never })
    .onConflictDoNothing()
    .returning({ eventId: schema.webhookEvents.eventId });
  if (inserted.length === 0) return { status: "duplicate", verified, eventId: event.id, eventType: event.event_type };
  return { status: "stored", verified, eventId: event.id, eventType: event.event_type };
}

/** Step 2 (after responding 200): act on a stored, verified event exactly once. */
export async function processWebhook(eventId: string): Promise<void> {
  const { db } = services();
  const claimed = await db
    .update(schema.webhookEvents)
    .set({ attempts: sql`${schema.webhookEvents.attempts} + 1` })
    .where(sql`${schema.webhookEvents.eventId} = ${eventId} and ${schema.webhookEvents.processedAt} is null`)
    .returning();
  const row = claimed[0];
  if (!row) return;
  const event = row.payload as unknown as WebhookEvent;

  if (!row.verified) {
    await recordEvent(db, { actor: "webhook", kind: "webhook_rejected", summary: `${event.event_type} rejected — signature not verified`, data: { eventId } });
    await markProcessed(eventId, "unverified");
    return;
  }

  try {
    const handled = await route(event);
    await markProcessed(eventId, handled ? null : "ignored");
  } catch (err) {
    await db
      .update(schema.webhookEvents)
      .set({ error: err instanceof Error ? err.message.slice(0, 500) : String(err) })
      .where(eq(schema.webhookEvents.eventId, eventId));
    throw err;
  }
}

async function markProcessed(eventId: string, note: string | null) {
  const { db } = services();
  await db.update(schema.webhookEvents).set({ processedAt: new Date(), error: note }).where(eq(schema.webhookEvents.eventId, eventId));
}

async function checkoutByOrderId(orderId: string | undefined) {
  if (!orderId) return null;
  const { db } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.paypalOrderId, orderId));
  return c ?? null;
}

async function route(event: WebhookEvent): Promise<boolean> {
  const { db } = services();
  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      const order = event.resource as unknown as PayPalOrder;
      const c = await checkoutByOrderId(order.id);
      if (!c) return false;
      await applyCheckoutEvent(c.id, "APPROVED", "webhook");
      await recordEvent(db, { actor: "webhook", kind: "order_approved", checkoutId: c.id, sellerId: c.sellerId, summary: "CHECKOUT.ORDER.APPROVED · signature verified", data: { eventId: event.id, orderId: order.id } });
      // Safety net: if the buyer closed the tab after approving, capture from here (idempotent request id).
      await captureCheckout(c.id, "webhook_approved");
      return true;
    }
    case "PAYMENT.CAPTURE.COMPLETED":
    case "PAYMENT.CAPTURE.PENDING":
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED": {
      const cap = event.resource as unknown as PayPalCapture;
      const c = await checkoutByOrderId(cap.supplementary_data?.related_ids?.order_id);
      if (!c) return false;
      await db
        .insert(schema.captures)
        .values({ id: newId("capture"), checkoutId: c.id, paypalCaptureId: cap.id, amountCents: valueToCents(cap.amount.value), status: cap.status, capturedAt: cap.create_time ? new Date(cap.create_time) : new Date() })
        .onConflictDoUpdate({ target: schema.captures.paypalCaptureId, set: { status: cap.status } });
      const ev = event.event_type === "PAYMENT.CAPTURE.COMPLETED" ? "CAPTURE_COMPLETED" : event.event_type === "PAYMENT.CAPTURE.PENDING" ? "CAPTURE_PENDING" : "CAPTURE_DENIED";
      const r = await applyCheckoutEvent(c.id, ev, "webhook");
      if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
        await db.update(schema.checkouts).set({ webhookConfirmedAt: new Date() }).where(eq(schema.checkouts.id, c.id));
      }
      await recordEvent(db, {
        actor: "webhook",
        kind: "capture_webhook",
        checkoutId: c.id,
        sellerId: c.sellerId,
        summary: `${event.event_type} · signature verified · ${r?.result.kind === "changed" ? `status → ${r.result.to}` : "confirms existing state"}`,
        data: { eventId: event.id, captureId: cap.id, orderId: cap.supplementary_data?.related_ids?.order_id },
      });
      return true;
    }
    case "PAYMENT.CAPTURE.REFUNDED":
    case "PAYMENT.CAPTURE.REVERSED": {
      // Full reconciliation lands with refunds in Phase 4; for now record the evidence on the timeline.
      await recordEvent(db, { actor: "webhook", kind: "refund_webhook", summary: `${event.event_type} received · signature verified`, data: { eventId: event.id } });
      return true;
    }
    default:
      return false;
  }
}
