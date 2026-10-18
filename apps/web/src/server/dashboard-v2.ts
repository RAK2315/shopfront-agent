import "server-only";
import { centsToValue, confirmationOf, ShopError, type CheckoutStatus } from "@shopfront/core";
import { and, asc, desc, eq, gte, inArray, schema } from "@shopfront/db";
import { imageUrl } from "./images";
import { includeTestRowsFor } from "./run-context";
import { services } from "./services";

// Dashboard v2 (walkthrough #3, D-089): the data behind the KPI cards, the orders grid, its drill-down and the
// listings grid. Read-only; the only writes are the seller-only ledger edits and listing edits elsewhere.

const PAID: CheckoutStatus[] = ["paid", "shipped", "partially_refunded", "refunded", "reversed"];
const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export interface OrderRow {
  order: string;
  at: string;
  date: string;
  status: CheckoutStatus;
  product: string;
  thumb: string | null;
  items: number;
  total: number;
  refunded: number;
  shipped: "yes" | "no";
  tracking: string;
  ship_by: string;
  note: string;
  paypal: string;
  capture: string;
  confirmed_via: string;
  buyer_country: string;
  is_test: boolean;
}

export async function ordersGrid(sellerId: string): Promise<OrderRow[]> {
  const { db } = services();
  const includeTest = await includeTestRowsFor(sellerId);
  const checkouts = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, sellerId), includeTest ? undefined : eq(schema.checkouts.isTest, false), inArray(schema.checkouts.status, PAID), gte(schema.checkouts.createdAt, new Date(Date.now() - 90 * DAY))))
    .orderBy(desc(schema.checkouts.createdAt))
    .limit(300);
  const ids = checkouts.map((c) => c.id);
  if (!ids.length) return [];
  const [items, caps, ships, imgs] = await Promise.all([
    db.select().from(schema.checkoutItems).where(inArray(schema.checkoutItems.checkoutId, ids)),
    db.select().from(schema.captures).where(inArray(schema.captures.checkoutId, ids)),
    db.select().from(schema.shipments).where(inArray(schema.shipments.checkoutId, ids)),
    db
      .select({ variantId: schema.variants.id, product: schema.products.title, sha: schema.productImages.imageSha256, pos: schema.productImages.position })
      .from(schema.variants)
      .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .leftJoin(schema.productImages, eq(schema.productImages.productId, schema.products.id))
      .where(eq(schema.products.sellerId, sellerId))
      .orderBy(asc(schema.productImages.position)),
  ]);
  const productOf = new Map<string, { title: string; sha: string | null }>();
  for (const r of imgs) if (!productOf.has(r.variantId)) productOf.set(r.variantId, { title: r.product, sha: r.sha });
  return checkouts.map((c) => {
    const lines = items.filter((i) => i.checkoutId === c.id);
    const cap = caps.find((k) => k.checkoutId === c.id);
    const ship = ships.find((s) => s.checkoutId === c.id);
    const first = lines[0] ? productOf.get(lines[0].variantId) : undefined;
    const status = c.status as CheckoutStatus;
    return {
      order: c.id,
      at: c.createdAt.toISOString(),
      date: isoDay(c.createdAt),
      status,
      product: lines.map((l) => productOf.get(l.variantId)?.title ?? l.titleSnapshot).join(", "),
      thumb: first?.sha ? imageUrl(first.sha) : null,
      items: lines.reduce((n, l) => n + l.quantity, 0),
      total: c.totalCents / 100,
      refunded: (cap?.refundedCents ?? 0) / 100,
      shipped: ship ? "yes" : "no",
      tracking: ship ? `${ship.carrier} ${ship.trackingNumber}` : "",
      ship_by: c.shipBy ?? "",
      note: c.internalNote ?? "",
      paypal: c.paypalOrderId ?? "",
      capture: cap?.paypalCaptureId ?? "",
      confirmed_via: confirmationOf({ ...c, status }) ?? "",
      buyer_country: c.buyerCountry ?? "",
      is_test: c.isTest,
    };
  });
}

export interface Kpis {
  days: Array<{ date: string; revenue: number; orders: number; refunds: number }>;
  revenue: { now: number; prev: number };
  orders: { now: number; prev: number };
  aov: { now: number; prev: number };
  refundRate: { now: number; prev: number };
}

/** Last 7 days vs the 7 before, plus a 14-day daily series for the sparklines. Computed from the same rows. */
export function kpisFrom(rows: OrderRow[], now = new Date()): Kpis {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 13 * DAY);
  const days = Array.from({ length: 14 }, (_, i) => ({ date: isoDay(new Date(start.getTime() + i * DAY)), revenue: 0, orders: 0, refunds: 0 }));
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const r of rows) {
    const i = idx.get(r.date);
    if (i === undefined) continue;
    days[i]!.revenue += r.total;
    days[i]!.orders += 1;
    days[i]!.refunds += r.refunded;
  }
  const sum = (from: number, to: number, k: "revenue" | "orders" | "refunds") => days.slice(from, to).reduce((n, d) => n + d[k], 0);
  const rev = { now: sum(7, 14, "revenue"), prev: sum(0, 7, "revenue") };
  const ord = { now: sum(7, 14, "orders"), prev: sum(0, 7, "orders") };
  const ref = { now: sum(7, 14, "refunds"), prev: sum(0, 7, "refunds") };
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    days: days.map((d) => ({ ...d, revenue: round(d.revenue), refunds: round(d.refunds) })),
    revenue: { now: round(rev.now), prev: round(rev.prev) },
    orders: ord,
    aov: { now: ord.now ? round(rev.now / ord.now) : 0, prev: ord.prev ? round(rev.prev / ord.prev) : 0 },
    refundRate: { now: rev.now ? round((ref.now / rev.now) * 100) : 0, prev: rev.prev ? round((ref.prev / rev.prev) * 100) : 0 },
  };
}

export interface HistoryItem {
  at: string;
  actor: string;
  kind: string;
  summary: string;
  ids: Array<{ label: string; value: string }>;
}

/** One order's full PayPal story for the drill-down: our timeline events plus the raw PayPal calls. */
export async function orderHistory(sellerId: string, checkoutId: string): Promise<{ events: HistoryItem[]; calls: Array<{ at: string; method: string; path: string; status: number; debugId: string | null; requestId: string | null; ms: number }> }> {
  const { db } = services();
  const [c] = await db.select({ sellerId: schema.checkouts.sellerId }).from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c || c.sellerId !== sellerId) throw new ShopError("NOT_FOUND", "Order not found.");
  const [events, calls] = await Promise.all([
    db.select().from(schema.events).where(eq(schema.events.checkoutId, checkoutId)).orderBy(asc(schema.events.id)).limit(60),
    db.select().from(schema.paypalCalls).where(eq(schema.paypalCalls.checkoutId, checkoutId)).orderBy(asc(schema.paypalCalls.id)).limit(40),
  ]);
  const ID_KEYS: Record<string, string> = { orderId: "Order", captureId: "Capture", refundId: "Refund", debugId: "Debug", paypalRequestId: "Request-Id", eventId: "Event", trackingNumber: "Tracking" };
  return {
    events: events.map((e) => ({
      at: e.createdAt.toISOString(),
      actor: e.actor,
      kind: e.kind,
      summary: e.summary,
      ids: Object.entries(e.data ?? {})
        .filter(([k, v]) => k in ID_KEYS && typeof v === "string" && v)
        .map(([k, v]) => ({ label: ID_KEYS[k]!, value: String(v) })),
    })),
    calls: calls.map((k) => ({ at: k.createdAt.toISOString(), method: k.method, path: k.path, status: k.status, debugId: k.debugId, requestId: k.paypalRequestId, ms: k.durationMs })),
  };
}

export interface ListingRow {
  product: string;
  variant: string;
  title: string;
  option: string;
  description: string;
  category: string;
  thumb: string | null;
  price: number;
  stock: number;
  catalog_id: string;
  sync: string;
  sync_debug: string;
  sold_14d: number[];
}

/** The seller's live listings, one row per variant, with the last PayPal catalog sync and 14 days of units sold. */
export async function listingsGrid(sellerId: string): Promise<ListingRow[]> {
  const { db } = services();
  const includeTest = await includeTestRowsFor(sellerId);
  const products = await db.select().from(schema.products).where(and(eq(schema.products.sellerId, sellerId), eq(schema.products.status, "approved"))).orderBy(asc(schema.products.createdAt));
  if (!products.length) return [];
  const pids = products.map((p) => p.id);
  const since = new Date(Date.now() - 13 * DAY);
  const [variants, imgs, syncs, sold] = await Promise.all([
    db.select().from(schema.variants).where(inArray(schema.variants.productId, pids)),
    db.select().from(schema.productImages).where(inArray(schema.productImages.productId, pids)).orderBy(asc(schema.productImages.position)),
    db.select().from(schema.events).where(and(eq(schema.events.sellerId, sellerId), inArray(schema.events.kind, ["catalog_synced", "catalog_sync_failed"]))).orderBy(desc(schema.events.id)).limit(200),
    db
      .select({ variantId: schema.checkoutItems.variantId, qty: schema.checkoutItems.quantity, at: schema.checkouts.createdAt })
      .from(schema.checkoutItems)
      .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.checkoutItems.checkoutId))
      .where(and(eq(schema.checkouts.sellerId, sellerId), inArray(schema.checkouts.status, PAID), gte(schema.checkouts.createdAt, since), includeTest ? undefined : eq(schema.checkouts.isTest, false))),
  ]);
  const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) - 13 * DAY).getTime();
  return variants
    .filter((v) => v.active)
    .map((v) => {
      const p = products.find((x) => x.id === v.productId)!;
      const img = imgs.find((i) => i.productId === p.id);
      const sync = syncs.find((e) => (e.data as { productId?: string }).productId === p.id);
      const series = Array.from({ length: 14 }, () => 0);
      for (const s of sold) if (s.variantId === v.id) series[Math.min(13, Math.max(0, Math.floor((s.at.getTime() - start) / DAY)))]! += s.qty;
      return {
        product: p.id,
        variant: v.id,
        title: p.title,
        option: Object.values(v.options as Record<string, string>).join(" · "),
        description: p.description,
        category: p.category,
        thumb: img ? imageUrl(img.imageSha256) : null,
        price: v.priceCents / 100,
        stock: v.stock,
        catalog_id: p.paypalCatalogId ?? "",
        sync: sync ? (sync.kind === "catalog_synced" ? "synced" : "failed") : p.paypalCatalogId ? "synced" : "not mirrored",
        sync_debug: String((sync?.data as { debugId?: string } | undefined)?.debugId ?? ""),
        sold_14d: series,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export const money = (n: number) => `$${centsToValue(Math.round(n * 100))}`;
