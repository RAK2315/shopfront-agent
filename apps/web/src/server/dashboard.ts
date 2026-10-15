import "server-only";
import { z } from "zod";
import { centsToValue, confirmationOf, ShopError, type CheckoutStatus } from "@shopfront/core";
import { and, eq, gte, inArray, lt, schema, sql } from "@shopfront/db";
import { recordEvent } from "./events";
import { services } from "./services";

// Seller dashboard (Phase 5, AG Studio). Read-only data for the widgets, plus two seller-only edits
// (internal note, ship-by) and the saved layout. Models change views and widgets only, never orders or money.

const PAID: CheckoutStatus[] = ["paid", "shipped", "partially_refunded", "refunded", "reversed"];
const day = (d: Date) => d.toISOString().slice(0, 10);

export async function dashboardData(sellerId: string) {
  const { db } = services();
  const since = new Date(Date.now() - 90 * 86_400_000);
  const checkouts = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, sellerId), inArray(schema.checkouts.status, PAID), gte(schema.checkouts.createdAt, since)));
  const ids = checkouts.map((c) => c.id);
  const [items, caps, refunds, ships, products] = await Promise.all([
    ids.length ? db.select().from(schema.checkoutItems).where(inArray(schema.checkoutItems.checkoutId, ids)) : [],
    ids.length ? db.select().from(schema.captures).where(inArray(schema.captures.checkoutId, ids)) : [],
    ids.length ? db.select().from(schema.refundRequests).where(inArray(schema.refundRequests.checkoutId, ids)) : [],
    ids.length ? db.select().from(schema.shipments).where(inArray(schema.shipments.checkoutId, ids)) : [],
    db.select({ variantId: schema.variants.id, product: schema.products.title }).from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).where(eq(schema.products.sellerId, sellerId)),
  ]);
  const productOf = new Map(products.map((p) => [p.variantId, p.product]));

  const orders = checkouts.map((c) => {
    const lines = items.filter((i) => i.checkoutId === c.id);
    const cap = caps.find((k) => k.checkoutId === c.id);
    return {
      order: c.id,
      date: day(c.createdAt),
      status: c.status,
      product: lines.map((l) => productOf.get(l.variantId) ?? l.titleSnapshot).join(", "),
      items: lines.reduce((n, l) => n + l.quantity, 0),
      total_usd: c.totalCents / 100,
      refunded_usd: (cap?.refundedCents ?? 0) / 100,
      buyer_country: c.buyerCountry ?? "",
      confirmed_via: confirmationOf({ ...c, status: c.status as CheckoutStatus }) ?? "",
      shipped: ships.some((s) => s.checkoutId === c.id) ? "yes" : "no",
      ship_by: c.shipBy ?? "",
      note: c.internalNote ?? "",
      paypal_order: c.paypalOrderId ?? "",
    };
  });
  const lines = items.map((l) => {
    const c = checkouts.find((k) => k.id === l.checkoutId)!;
    return { order: l.checkoutId, date: day(c.createdAt), product: productOf.get(l.variantId) ?? l.titleSnapshot, sku: l.sku, quantity: l.quantity, revenue_usd: l.lineTotalCents / 100 };
  });
  const refundRows = refunds.map((r) => {
    const first = items.find((i) => i.checkoutId === r.checkoutId);
    return {
      refund: r.id,
      order: r.checkoutId,
      date: day(r.createdAt),
      product: first ? (productOf.get(first.variantId) ?? first.titleSnapshot) : "",
      reason: r.reasonCode,
      decision: r.decision,
      status: r.status,
      amount_usd: r.amountCents / 100,
    };
  });
  return { orders, lines, refunds: refundRows };
}

export const LedgerEdit = z.strictObject({
  note: z.string().max(500).optional(),
  ship_by: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
});

/** Seller-only fields; nothing here touches money or order status. */
export async function editLedger(sellerId: string, checkoutId: string, edit: z.infer<typeof LedgerEdit>) {
  const { db } = services();
  const set: Partial<typeof schema.checkouts.$inferInsert> = {};
  if (edit.note !== undefined) set.internalNote = edit.note || null;
  if (edit.ship_by !== undefined) set.shipBy = edit.ship_by || null;
  const r = await db.update(schema.checkouts).set(set).where(and(eq(schema.checkouts.id, checkoutId), eq(schema.checkouts.sellerId, sellerId))).returning({ id: schema.checkouts.id });
  if (!r.length) throw new ShopError("NOT_FOUND", "Order not found.");
}

export async function saveDashboardState(sellerId: string, state: unknown) {
  const json = JSON.stringify(state);
  if (json.length > 400_000) throw new ShopError("VALIDATION_ERROR", "Layout too large.");
  await services().db.update(schema.sellers).set({ dashboardState: state }).where(eq(schema.sellers.id, sellerId));
}

// ---------- read-only insight tools (D-007: today from our DB, history from PayPal; every figure labelled) ----------

export async function dbSalesSummary(sellerId: string, fromIso: string, toIso: string) {
  const { db } = services();
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const rows = await db.execute<{ product: string; orders: number; units: number; revenue_cents: number }>(sql`
    select coalesce(p.title, ci.title_snapshot) product, count(distinct c.id)::int orders, sum(ci.quantity)::int units, sum(ci.line_total_cents)::int revenue_cents
    from ${schema.checkouts} c join ${schema.checkoutItems} ci on ci.checkout_id = c.id
    left join ${schema.variants} v on v.id = ci.variant_id left join ${schema.products} p on p.id = v.product_id
    where c.seller_id = ${sellerId} and c.status in ('paid','shipped','partially_refunded','refunded') and c.created_at >= ${from} and c.created_at < ${to}
    group by 1 order by revenue_cents desc`);
  const refunds = await db
    .select({ n: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${schema.refundRequests.amountCents}),0)::int` })
    .from(schema.refundRequests)
    .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
    .where(and(eq(schema.checkouts.sellerId, sellerId), eq(schema.refundRequests.status, "executed"), gte(schema.refundRequests.createdAt, from), lt(schema.refundRequests.createdAt, to)));
  const total = rows.rows.reduce((n, r) => n + Number(r.revenue_cents), 0);
  return {
    source: "db",
    from: fromIso,
    to: toIso,
    revenue_usd: centsToValue(total),
    orders: rows.rows.reduce((n, r) => n + Number(r.orders), 0),
    refunds: { count: refunds[0]?.n ?? 0, amount_usd: centsToValue(refunds[0]?.cents ?? 0) },
    by_product: rows.rows.map((r) => ({ product: r.product, orders: Number(r.orders), units: Number(r.units), revenue_usd: centsToValue(Number(r.revenue_cents)) })),
  };
}

/** PayPal Transaction Search (G6). Lags up to ~3 h (D-007), so the answer labels these figures `paypal`. */
export async function paypalTransactions(fromIso: string, toIso: string) {
  const { paypal } = services();
  const { data, debugId } = await paypal.listTransactions(fromIso, toIso);
  const tx = (data.transaction_details ?? []).map((t) => t.transaction_info);
  const sales = tx.filter((t) => t.transaction_event_code === "T0006" || t.transaction_event_code === "T0003" || Number(t.transaction_amount?.value ?? 0) > 0);
  const refunds = tx.filter((t) => t.transaction_event_code === "T1107");
  const sum = (xs: typeof tx) => xs.reduce((n, t) => n + Math.round(Number(t.transaction_amount?.value ?? 0) * 100), 0);
  return {
    source: "paypal",
    from: fromIso,
    to: toIso,
    note: "PayPal Transaction Search can lag by up to about 3 hours.",
    sales: { count: sales.length, gross_usd: centsToValue(sum(sales)) },
    refunds: { count: refunds.length, amount_usd: centsToValue(Math.abs(sum(refunds))) },
    debug_id: debugId,
  };
}

/** Anomaly rule (deterministic): 4+ executed refunds in 10 minutes for one seller → one alert event. */
export async function checkRefundSpike(sellerId: string) {
  const { db } = services();
  const [{ n } = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.refundRequests)
    .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
    .where(and(eq(schema.checkouts.sellerId, sellerId), eq(schema.refundRequests.status, "executed"), gte(schema.refundRequests.executedAt, new Date(Date.now() - 10 * 60_000))));
  if (n < 4) return null;
  const [recent] = await db.select({ id: schema.events.id }).from(schema.events).where(and(eq(schema.events.sellerId, sellerId), eq(schema.events.kind, "refund_spike"), gte(schema.events.createdAt, new Date(Date.now() - 10 * 60_000))));
  if (recent) return null;
  return recordEvent(db, {
    actor: "server",
    kind: "refund_spike",
    sellerId,
    summary: `Refund spike · ${n} refunds in the last 10 minutes`,
    data: { count: n, windowMinutes: 10, threshold: 4 },
  });
}
