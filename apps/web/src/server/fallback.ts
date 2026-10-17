import "server-only";
import { FALLBACK_DELAYS_MS, fallbackAction, needsFallbackCheck, type CheckoutStatus } from "@shopfront/core";
import { and, eq, inArray, isNull, or, schema, sql } from "@shopfront/db";
import { firstCapture } from "@shopfront/paypal";
import { recordEvent } from "./events";
import { applyCheckoutEvent, captureCheckout, settleFromOrder } from "./payments";
import { services } from "./services";

// Per-checkout fallback timers (D-025). No polling loop: each open checkout gets a few one-shot checks,
// and a check asks PayPal only if no verified webhook has confirmed the payment yet. Timers live on
// globalThis because instrumentation.ts and the route handlers are separate bundles in one process.
const g = globalThis as unknown as { __shopTimers?: Map<string, Map<number, NodeJS.Timeout>> };
const timers = (g.__shopTimers ??= new Map());

const MAX_TIMER_MS = 2 ** 31 - 1; // setTimeout overflows above ~24.8 days
const SAME_SLOT_MS = 15_000; // checks due within 15 s of each other are merged

export type ArmReason = "created" | "pay_page" | "paid" | "boot" | "expiry";

/** Arm one-shot checks at now + each delay. Safe to call often: near-duplicate slots are merged. */
export function scheduleFallbackChecks(checkoutId: string, reason: ArmReason, delays: readonly number[] = FALLBACK_DELAYS_MS) {
  let slots = timers.get(checkoutId);
  if (!slots) timers.set(checkoutId, (slots = new Map()));
  for (const d of delays) {
    const due = Date.now() + Math.max(0, d);
    if ([...slots.keys()].some((t) => Math.abs(t - due) < SAME_SLOT_MS)) continue;
    const t = setTimeout(() => {
      slots!.delete(due);
      if (slots!.size === 0) timers.delete(checkoutId);
      runFallbackCheck(checkoutId, reason).catch((e) => console.error("fallback check failed", checkoutId, e));
    }, Math.min(Math.max(0, d), MAX_TIMER_MS));
    t.unref?.();
    slots.set(due, t);
  }
}

/** Arm a check for the moment a never-approved checkout expires. */
export function scheduleExpiryCheck(checkoutId: string, expiresAt: Date) {
  scheduleFallbackChecks(checkoutId, "expiry", [expiresAt.getTime() - Date.now() + 5_000]);
}

export function pendingChecks(checkoutId: string): number {
  return timers.get(checkoutId)?.size ?? 0;
}

/** One fallback check. Reads our row first; only calls PayPal when the answer could change something. */
export async function runFallbackCheck(checkoutId: string, reason: ArmReason | "manual" = "manual") {
  const { db, paypal } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c?.paypalOrderId) return { kind: "skipped" as const };
  const status = c.status as CheckoutStatus;
  if (!needsFallbackCheck({ ...c, status })) return { kind: "skipped" as const };

  const { data: order, debugId } = await paypal.getOrder(c.paypalOrderId, { context: { checkoutId } });
  const cap = firstCapture(order);
  const action = fallbackAction({ ...c, status }, { status: order.status, hasCapture: Boolean(cap) }, new Date());

  switch (action.kind) {
    case "settle": {
      await settleFromOrder(checkoutId, order, "poll", { debugId, trigger: `fallback:${reason}` });
      if (cap?.status === "COMPLETED") {
        // Only claim a poll confirmation if no verified webhook beat us to it.
        const confirmed = await db
          .update(schema.checkouts)
          .set({ pollConfirmedAt: new Date() })
          .where(and(eq(schema.checkouts.id, checkoutId), isNull(schema.checkouts.webhookConfirmedAt), isNull(schema.checkouts.pollConfirmedAt)))
          .returning({ id: schema.checkouts.id });
        if (confirmed.length && ["paid", "shipped", "partially_refunded"].includes(status)) {
          await recordEvent(db, {
            actor: "poller",
            kind: "poll_confirmed",
            checkoutId,
            sellerId: c.sellerId,
            summary: "No webhook yet · PayPal confirms the capture is COMPLETED (via poll)",
            data: { orderId: order.id, captureId: cap.id, debugId, trigger: reason },
          });
        }
      }
      break;
    }
    case "capture": {
      await recordEvent(db, {
        actor: "poller",
        kind: "poll_found_approved",
        checkoutId,
        sellerId: c.sellerId,
        summary: "Buyer approved but no capture arrived · capturing now",
        data: { orderId: order.id, debugId, trigger: reason },
      });
      const out = await captureCheckout(checkoutId, "fallback_check");
      if (out.ok) {
        await db
          .update(schema.checkouts)
          .set({ pollConfirmedAt: new Date() })
          .where(and(eq(schema.checkouts.id, checkoutId), isNull(schema.checkouts.webhookConfirmedAt)));
      }
      break;
    }
    case "expire": {
      const r = await applyCheckoutEvent(checkoutId, "CANCELLED", "system");
      if (r?.result.kind === "changed") {
        await recordEvent(db, {
          actor: "poller",
          kind: "checkout_expired",
          checkoutId,
          sellerId: c.sellerId,
          summary: `Checkout expired · PayPal order still ${order.status}, never approved · nothing charged`,
          data: { orderId: order.id, debugId, trigger: reason },
        });
      }
      break;
    }
    case "wait":
      scheduleExpiryCheck(checkoutId, c.expiresAt);
      break;
  }
  return { kind: action.kind, orderStatus: order.status };
}

/**
 * On boot (instrumentation.ts): re-arm checks for every checkout that could still change, so a restart
 * never loses an order. One indexed query; nothing runs if there is nothing open.
 */
export async function rearmOpenCheckouts() {
  const { db } = services();
  const recent = sql`${schema.checkouts.createdAt} > now() - interval '3 days'`;
  const rows = await db
    .select({ id: schema.checkouts.id, status: schema.checkouts.status, expiresAt: schema.checkouts.expiresAt, sellerId: schema.checkouts.sellerId })
    .from(schema.checkouts)
    .where(
      and(
        recent,
        or(
          inArray(schema.checkouts.status, ["created", "approved", "capture_pending"]),
          and(
            inArray(schema.checkouts.status, ["paid", "shipped", "partially_refunded"]),
            isNull(schema.checkouts.webhookConfirmedAt),
            isNull(schema.checkouts.pollConfirmedAt),
          ),
        ),
      ),
    )
    .limit(200);
  const now = Date.now();
  rows.forEach((r, i) => {
    const stagger = i * 1_500; // spread PayPal GETs out after a restart
    const expired = r.status === "created" && r.expiresAt.getTime() <= now;
    scheduleFallbackChecks(r.id, "boot", expired ? [5_000 + stagger] : FALLBACK_DELAYS_MS.map((d) => d + stagger));
    if (!expired && r.status === "created") scheduleExpiryCheck(r.id, r.expiresAt);
  });
  // Operational, not a shop event: flagged so it stays off every public view (owner, D-076). Test runs, AT-2 and the
  // database still see it.
  if (rows.length) {
    await recordEvent(db, {
      actor: "server",
      kind: "fallback_rearmed",
      summary: `Restarted · fallback checks re-armed for ${rows.length} open checkout${rows.length === 1 ? "" : "s"}`,
      data: { checkoutIds: rows.map((r) => r.id) },
      isTest: true,
    });
  }
  return rows.length;
}
