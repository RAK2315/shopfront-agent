import "server-only";
import { z } from "zod";
import { centsToValue, confirmationOf, ShopError, type CheckoutStatus } from "@shopfront/core";
import { and, eq, gte, inArray, lt, schema, sql } from "@shopfront/db";
import { recordEvent } from "./events";
import { includeTestRowsFor } from "./run-context";
import { services } from "./services";

// Seller dashboard (Phase 5, AG Studio). Read-only data for the widgets, plus two seller-only edits
// (internal note, ship-by) and the saved layout. Models change views and widgets only, never orders or money.
// Test and script orders (D-070) are left out of every figure unless the request is itself a test run (AT-5).

const PAID: CheckoutStatus[] = ["paid", "shipped", "partially_refunded", "refunded", "reversed"];
const day = (d: Date) => d.toISOString().slice(0, 10);

/** Where an order came from, in words a seller reads (Phase AG). */
export const CHANNEL: Record<string, string> = { web_agent: "Shopfront agent", mcp_external: "MCP agent", cart_api: "Cart API", storefront: "Storefront" };
/** An attempt's outcome, from its checkout status. */
function outcomeOf(status: string) {
  if (["paid", "shipped", "partially_refunded"].includes(status)) return "paid";
  if (status === "authorized") return "authorized";
  if (["refunded", "reversed"].includes(status)) return "refunded";
  if (status === "capture_denied") return "declined";
  if (status === "cancelled") return "cancelled";
  return "awaiting buyer";
}

export async function dashboardData(sellerId: string) {
  const { db } = services();
  const since = new Date(Date.now() - 90 * 86_400_000);
  const includeTest = await includeTestRowsFor(sellerId);
  const checkouts = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, sellerId), includeTest ? undefined : eq(schema.checkouts.isTest, false), inArray(schema.checkouts.status, [...PAID, "authorized"]), gte(schema.checkouts.createdAt, since)));
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
      // Phase AG: where it came from and where the money went. Authorized Cart API orders count once captured.
      channel: CHANNEL[c.source] ?? c.source,
      agent: c.mcpClientName ?? "",
      captured_usd: (cap?.amountCents ?? 0) / 100,
      paid_to: c.payeeMerchantId || c.payeeEmail ? "seller's PayPal" : "platform account",
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
  // Phase AG: every checkout attempt (any outcome) for the Agents page, the listings with stock, and Cart API carts.
  const [attemptRows, listingRows, cartRows] = await Promise.all([
    db
      .select()
      .from(schema.checkouts)
      .where(and(eq(schema.checkouts.sellerId, sellerId), includeTest ? undefined : eq(schema.checkouts.isTest, false), gte(schema.checkouts.createdAt, since))),
    db
      .select({ v: schema.variants, p: schema.products })
      .from(schema.variants)
      .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .where(and(eq(schema.products.sellerId, sellerId), inArray(schema.products.status, ["approved", "draft"]))),
    db
      .select()
      .from(schema.carts)
      .where(and(eq(schema.carts.sellerId, sellerId), includeTest ? undefined : eq(schema.carts.isTest, false), gte(schema.carts.createdAt, since))),
  ]);
  const attempts = attemptRows.map((c) => ({
    order: c.id,
    date: day(c.createdAt),
    channel: CHANNEL[c.source] ?? c.source,
    agent: c.mcpClientName ?? (c.source === "storefront" ? "buyer" : "unnamed agent"),
    outcome: outcomeOf(c.status),
    status: c.status,
    total_usd: c.totalCents / 100,
  }));
  const listings = listingRows.map(({ v, p }) => ({
    listing: p.title,
    variant: Object.values(v.options).join(" · ") || "one size",
    sku: v.sku,
    status: p.status === "approved" ? "live" : "draft",
    price_usd: v.priceCents / 100,
    stock: v.stock,
    low_stock: v.stock <= 3 ? "low" : "ok",
  }));
  const carts = cartRows.map((c) => ({
    cart: c.id,
    date: day(c.createdAt),
    agent: c.client,
    status: c.status,
    validation: c.validationStatus,
    issue: ((c.issues as Array<{ context?: { specific_issue?: string }; code?: string }>)[0]?.context?.specific_issue ?? (c.issues as Array<{ code?: string }>)[0]?.code ?? "") as string,
    order: c.checkoutId ?? "",
  }));
  return { orders, lines, refunds: refundRows, attempts, listings, carts };
}

/** Shop Manager tool (read-only): what needs the seller now. */
export async function ordersNeedingAction(sellerId: string) {
  const { db } = services();
  const includeTest = await includeTestRowsFor(sellerId);
  const rows = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, sellerId), includeTest ? undefined : eq(schema.checkouts.isTest, false), inArray(schema.checkouts.status, ["paid", "authorized"])));
  const ships = rows.length ? await db.select({ id: schema.shipments.checkoutId }).from(schema.shipments).where(inArray(schema.shipments.checkoutId, rows.map((r) => r.id))) : [];
  const shipped = new Set(ships.map((s) => s.id));
  const pending = await db
    .select({ id: schema.refundRequests.id, order: schema.refundRequests.checkoutId, amount: schema.refundRequests.amountCents })
    .from(schema.refundRequests)
    .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
    .where(and(eq(schema.checkouts.sellerId, sellerId), eq(schema.refundRequests.status, "pending")));
  const now = Date.now();
  const toShip = rows.filter((r) => !shipped.has(r.id));
  const holds = toShip.filter((r) => r.status === "authorized");
  const urgent = holds.filter((r) => r.authorizedAt && now - r.authorizedAt.getTime() > 2 * 86_400_000);
  return {
    summary_line: `[db] ${toShip.length} order${toShip.length === 1 ? "" : "s"} to ship (${holds.length} of them Cart API holds, charged on ship${urgent.length ? `; ${urgent.length} past day 2 of PayPal's 3-day honor period` : ""}); ${pending.length} refund request${pending.length === 1 ? "" : "s"} waiting for you.`,
    to_ship: toShip.slice(0, 20).map((r) => ({ order: r.id, status: r.status, total: centsToValue(r.totalCents), ship_by: r.shipBy ?? null })),
    refunds_waiting: pending.slice(0, 20).map((p) => ({ refund: p.id, order: p.order, amount: centsToValue(p.amount) })),
  };
}

/** Shop Manager tool (read-only): listings by stock. */
export async function stockLevels(sellerId: string) {
  const { db } = services();
  const rows = await db
    .select({ title: schema.products.title, options: schema.variants.options, stock: schema.variants.stock })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(and(eq(schema.products.sellerId, sellerId), eq(schema.products.status, "approved"), eq(schema.variants.active, true)));
  const low = rows.filter((r) => r.stock <= 3);
  return {
    summary_line: `[db] ${rows.length} live variant${rows.length === 1 ? "" : "s"}; ${low.length ? `low stock (3 or fewer): ${low.map((r) => `${r.title}${Object.keys(r.options).length ? ` (${Object.values(r.options).join(", ")})` : ""} ${r.stock}`).join("; ")}` : "none low on stock"}.`,
    variants: rows.map((r) => ({ listing: r.title, variant: Object.values(r.options).join(" · "), stock: r.stock })),
  };
}

/** Shop Manager tool (read-only): orders by channel and agent for a date range. */
export async function agentActivity(sellerId: string, fromIso: string, toIso: string) {
  const { db } = services();
  const includeTest = await includeTestRowsFor(sellerId);
  const rows = await db.execute<{ source: string; agent: string | null; attempts: number; paid: number; revenue_cents: number }>(sql`
    select source, mcp_client_name agent, count(*)::int attempts,
           count(*) filter (where status in ('paid','shipped','partially_refunded','refunded','authorized'))::int paid,
           coalesce(sum(total_cents) filter (where status in ('paid','shipped','partially_refunded','refunded','authorized')), 0)::int revenue_cents
    from ${schema.checkouts}
    where seller_id = ${sellerId} and created_at >= ${fromIso} and created_at <= ${toIso} ${includeTest ? sql`` : sql`and not is_test`}
    group by source, mcp_client_name order by 4 desc`);
  const by = rows.rows.map((r) => ({ channel: CHANNEL[r.source] ?? r.source, agent: r.agent ?? "", attempts: r.attempts, orders: r.paid, revenue: centsToValue(r.revenue_cents) }));
  const total = by.reduce((n, r) => n + r.orders, 0);
  return {
    summary_line: `[db] ${total} order${total === 1 ? "" : "s"} from ${by.length} agent/channel pair${by.length === 1 ? "" : "s"} between ${fromIso.slice(0, 10)} and ${toIso.slice(0, 10)}${by[0] ? `; most from ${by[0].channel}${by[0].agent ? ` (${by[0].agent})` : ""}` : ""}.`,
    by_channel_and_agent: by,
  };
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
  const includeTest = await includeTestRowsFor(sellerId);
  const rows = await db.execute<{ product: string; orders: number; units: number; revenue_cents: number }>(sql`
    select coalesce(p.title, ci.title_snapshot) product, count(distinct c.id)::int orders, sum(ci.quantity)::int units, sum(ci.line_total_cents)::int revenue_cents
    from ${schema.checkouts} c join ${schema.checkoutItems} ci on ci.checkout_id = c.id
    left join ${schema.variants} v on v.id = ci.variant_id left join ${schema.products} p on p.id = v.product_id
    where c.seller_id = ${sellerId} and c.status in ('paid','shipped','partially_refunded','refunded') and c.created_at >= ${from} and c.created_at < ${to}
      and (${includeTest} or not c.is_test)
    group by 1 order by revenue_cents desc`);
  const refunds = await db
    .select({ n: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(coalesce(${schema.refundRequests.refundedCents}, ${schema.refundRequests.amountCents})),0)::int` /* what PayPal refunded (D-083) */ })
    .from(schema.refundRequests)
    .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
    .where(
      and(
        eq(schema.checkouts.sellerId, sellerId),
        includeTest ? undefined : eq(schema.checkouts.isTest, false),
        eq(schema.refundRequests.status, "executed"),
        gte(schema.refundRequests.createdAt, from),
        lt(schema.refundRequests.createdAt, to),
      ),
    );
  const total = rows.rows.reduce((n, r) => n + Number(r.revenue_cents), 0);
  const orders = rows.rows.reduce((n, r) => n + Number(r.orders), 0);
  const refundN = refunds[0]?.n ?? 0;
  return {
    source: "db",
    // Written by code, quoted by the agent: the source label never depends on the model's wording (AT-5 #4).
    summary_line: `[db] $${centsToValue(total)} revenue from ${orders} order${orders === 1 ? "" : "s"}; ${refundN} refund${refundN === 1 ? "" : "s"} ($${centsToValue(refunds[0]?.cents ?? 0)}).`,
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
  // Event codes: T00xx = payments received (T0006 = checkout captures); T1107 = payment refunds.
  // Everything else (e.g. T1900, the sandbox's starting-balance funding) is not a sale.
  const sales = tx.filter((t) => /^T00\d\d$/.test(t.transaction_event_code ?? "") && Number(t.transaction_amount?.value ?? 0) > 0);
  const refunds = tx.filter((t) => t.transaction_event_code === "T1107");
  const sum = (xs: typeof tx) => xs.reduce((n, t) => n + Math.round(Number(t.transaction_amount?.value ?? 0) * 100), 0);
  return {
    source: "paypal",
    summary_line: `[paypal] $${centsToValue(sum(sales))} gross from ${sales.length} transaction${sales.length === 1 ? "" : "s"}; ${refunds.length} refund${refunds.length === 1 ? "" : "s"} ($${centsToValue(Math.abs(sum(refunds)))}).`,
    from: fromIso,
    to: toIso,
    note: "PayPal Transaction Search can lag by up to about 3 hours.",
    last_refreshed: data.last_refreshed_datetime ?? null,
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
