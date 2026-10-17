import "server-only";
import { centsToValue, isVerifyOutage, newId, sweepEligible, valueToCents, WEBHOOK_SWEEP } from "@shopfront/core";
import { and, asc, eq, isNull, lt, schema, sql } from "@shopfront/db";
import { isPayPalApiError, type PayPalCapture, type PayPalOrder, type PayPalRefund, refundCaptureId } from "@shopfront/paypal";
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
 * PayPal's verify endpoint couldn't give a verdict (network, 5xx, 429, our own auth). The route answers 503 so PayPal
 * redelivers, instead of storing a genuine event as unverified and rejecting it (REVIEW-1 #8). Nothing is stored.
 */
export class WebhookVerifyUnavailable extends Error {
  constructor(readonly status: number | undefined, readonly debugId?: string) {
    super(`PayPal webhook verification unavailable (${status ?? "network"})`);
    this.name = "WebhookVerifyUnavailable";
  }
}

/**
 * Step 1 (synchronous, before we answer PayPal): verify the signature with PayPal and store the event once,
 * keyed by PayPal's event id. All event types are subscribed; we filter here (owner decision, D-039).
 */
export async function ingestWebhook(rawBody: string, headers: Headers, o: { forceVerifyOutage?: boolean } = {}): Promise<IngestResult> {
  const { db } = services();
  const event = JSON.parse(rawBody) as WebhookEvent;
  if (!event?.id || !event.event_type) throw new Error("Not a PayPal webhook event");
  const base = { eventId: event.id, eventType: event.event_type };

  // Count every delivery (PayPal retries, Dashboard resends) so "received N×, processed once" is provable.
  const [existing] = await db
    .update(schema.webhookEvents)
    .set({ deliveries: sql`${schema.webhookEvents.deliveries} + 1`, lastDeliveryAt: new Date() })
    .where(eq(schema.webhookEvents.eventId, event.id))
    .returning();
  if (existing?.verified) return { status: "duplicate", verified: true, ...base };

  const verified = await verifySignature(event.id, rawBody, headers, o.forceVerifyOutage);
  if (existing) {
    // A forged copy can claim an event id first. A genuine, verifiable delivery of that id replaces it
    // and is processed; another unverifiable copy changes nothing.
    if (!verified) return { status: "duplicate", verified: false, ...base };
    const upgraded = await db
      .update(schema.webhookEvents)
      .set({ verified: true, payload: event as never, processedAt: null, error: null })
      .where(and(eq(schema.webhookEvents.eventId, event.id), eq(schema.webhookEvents.verified, false)))
      .returning({ eventId: schema.webhookEvents.eventId });
    return { status: upgraded.length ? "stored" : "duplicate", verified: true, ...base };
  }

  const resourceId = typeof event.resource?.id === "string" ? event.resource.id : null;
  const inserted = await db
    .insert(schema.webhookEvents)
    .values({ eventId: event.id, eventType: event.event_type, resourceId, verified, payload: event as never })
    .onConflictDoNothing()
    .returning({ eventId: schema.webhookEvents.eventId });
  return { status: inserted.length ? "stored" : "duplicate", verified, ...base };
}

async function verifySignature(eventId: string, rawBody: string, headers: Headers, forceOutage = false): Promise<boolean> {
  const e = env();
  const h = {
    authAlgo: headers.get("paypal-auth-algo") ?? "",
    certUrl: headers.get("paypal-cert-url") ?? "",
    transmissionId: headers.get("paypal-transmission-id") ?? "",
    transmissionSig: headers.get("paypal-transmission-sig") ?? "",
    transmissionTime: headers.get("paypal-transmission-time") ?? "",
  };
  let verified = false;
  if (e.PAYPAL_WEBHOOK_ID && h.transmissionSig) {
    if (forceOutage) throw new WebhookVerifyUnavailable(503); // signed test hook (faults.ts); no PayPal call
    try {
      // Request id per transmission: a resend of the same event is a new delivery to verify.
      verified = await services().paypal.verifyWebhookSignature(h, rawBody, e.PAYPAL_WEBHOOK_ID, `verify-${eventId}-${h.transmissionId}`.slice(0, 100));
    } catch (err) {
      const status = isPayPalApiError(err) ? err.status : undefined;
      if (isVerifyOutage(status)) throw new WebhookVerifyUnavailable(status, isPayPalApiError(err) ? err.debugId : undefined);
      verified = false; // PayPal judged the delivery invalid (4xx)
    }
  }
  if (!verified && e.DEV_ALLOW_UNVERIFIED_WEBHOOKS && process.env.NODE_ENV !== "production") verified = true;
  return verified;
}

// Events being processed in this process (Render free = one instance), so a sweep never overlaps a delivery's after().
const g = globalThis as unknown as { __webhookInflight?: Set<string>; __webhookSweepAt?: number };
const inflight = (g.__webhookInflight ??= new Set());

/** Step 2 (after responding 200): act on a stored, verified event exactly once. */
export async function processWebhook(eventId: string): Promise<void> {
  if (inflight.has(eventId)) return;
  inflight.add(eventId);
  try {
    await processOnce(eventId);
  } finally {
    inflight.delete(eventId);
  }
}

/**
 * Recovery sweep (REVIEW-1 #8): reprocess verified events that were stored but never processed, because the process
 * died or processing threw after we had answered PayPal 200 (so PayPal won't redeliver). Runs on boot and alongside
 * the fallback checks (throttled), so it adds no polling loop (D-022). One query on a tiny partial index.
 */
export async function sweepUnprocessedWebhooks(reason: "boot" | "fallback"): Promise<string[]> {
  const now = Date.now();
  if (reason === "fallback" && now - (g.__webhookSweepAt ?? 0) < WEBHOOK_SWEEP.throttleMs) return [];
  g.__webhookSweepAt = now;
  const { db } = services();
  const rows = await db
    .select()
    .from(schema.webhookEvents)
    .where(
      and(
        eq(schema.webhookEvents.verified, true),
        isNull(schema.webhookEvents.processedAt),
        lt(schema.webhookEvents.lastDeliveryAt, new Date(now - WEBHOOK_SWEEP.minAgeMs)),
        lt(schema.webhookEvents.attempts, WEBHOOK_SWEEP.maxAttempts),
      ),
    )
    .orderBy(asc(schema.webhookEvents.lastDeliveryAt))
    .limit(WEBHOOK_SWEEP.batch);
  const done: string[] = [];
  for (const r of rows) {
    if (!sweepEligible(r, new Date(now))) continue;
    try {
      await processWebhook(r.eventId);
      done.push(r.eventId);
    } catch (e) {
      console.error("[webhook sweep] processing failed", r.eventId, e);
    }
  }
  if (done.length) {
    // Operational, not a shop event: kept off public views like the boot re-arm row (D-076).
    await recordEvent(db, {
      actor: "server",
      kind: "webhook_swept",
      summary: `Recovered ${done.length} stored webhook${done.length === 1 ? "" : "s"} that had not been processed (${reason})`,
      data: { eventIds: done, reason },
      isTest: true,
    });
  }
  return done;
}

async function processOnce(eventId: string): Promise<void> {
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

async function captureByPayPalId(paypalCaptureId: string) {
  if (!paypalCaptureId) return null;
  const { db } = services();
  const [cap] = await db.select().from(schema.captures).where(eq(schema.captures.paypalCaptureId, paypalCaptureId));
  return cap ?? null;
}

async function route(event: WebhookEvent): Promise<boolean> {
  const { db, paypal } = services();
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
    case "PAYMENT.CAPTURE.REFUNDED": {
      // Covers refunds made anywhere, including by the merchant directly in PayPal (unhappy path #04).
      const refund = event.resource as unknown as PayPalRefund;
      const captureId = refundCaptureId(refund);
      const cap = captureId ? await captureByPayPalId(captureId) : null;
      if (!cap) return false;
      // PayPal's own capture status decides full vs partial (we GET the capture rather than trust arithmetic).
      const { data: live, debugId } = await paypal.getCapture(cap.paypalCaptureId, { context: { checkoutId: cap.checkoutId } });
      const total = refund.seller_payable_breakdown?.total_refunded_amount?.value;
      const refundedCents = total ? valueToCents(total) : cap.refundedCents + valueToCents(refund.amount?.value ?? "0");
      await db
        .update(schema.captures)
        .set({ status: live.status, refundedCents: sql`greatest(${schema.captures.refundedCents}, ${refundedCents})` })
        .where(eq(schema.captures.id, cap.id));
      const r = await applyCheckoutEvent(cap.checkoutId, live.status === "REFUNDED" ? "REFUND_FULL" : "REFUND_PARTIAL", "webhook");
      await recordEvent(db, {
        actor: "webhook",
        kind: "refund_reconciled",
        checkoutId: cap.checkoutId,
        sellerId: r?.checkout.sellerId,
        summary: `PAYMENT.CAPTURE.REFUNDED · signature verified · $${refund.amount?.value ?? "?"} refunded ($${centsToValue(refundedCents)} in total) · ${r?.result.kind === "changed" ? `status → ${r.result.to}` : "confirms existing state"}`,
        data: { eventId: event.id, refundId: refund.id, captureId: cap.paypalCaptureId, debugId },
      });
      return true;
    }
    case "PAYMENT.CAPTURE.REVERSED": {
      // A chargeback or reversal: the resource is the capture itself.
      const resourceId = typeof event.resource?.id === "string" ? event.resource.id : "";
      const cap = await captureByPayPalId(resourceId);
      if (!cap) return false;
      await db.update(schema.captures).set({ status: "REVERSED" }).where(eq(schema.captures.id, cap.id));
      const r = await applyCheckoutEvent(cap.checkoutId, "CAPTURE_REVERSED", "webhook");
      await recordEvent(db, {
        actor: "webhook",
        kind: "capture_reversed",
        checkoutId: cap.checkoutId,
        sellerId: r?.checkout.sellerId,
        summary: `PAYMENT.CAPTURE.REVERSED · signature verified · ${r?.result.kind === "changed" ? `status → ${r.result.to}` : "confirms existing state"}`,
        data: { eventId: event.id, captureId: cap.paypalCaptureId },
      });
      return true;
    }
    default:
      return false;
  }
}
