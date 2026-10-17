import "server-only";
import {
  buildPayPalOrderRequest,
  centsToValue,
  money,
  newId,
  quoteCheckout,
  ShopError,
  STATUS_LABEL,
  type CheckoutStatus,
  type PricedVariant,
  type SellerPricing,
} from "@shopfront/core";
import { and, asc, eq, inArray, schema, sql } from "@shopfront/db";
import { approveLink, isPayPalApiError } from "@shopfront/paypal";
import type { CallContext, ShopPort } from "@shopfront/mcp";
import { appUrl } from "./env";
import { recordEvent } from "./events";
import { scheduleExpiryCheck, scheduleFallbackChecks } from "./fallback";
import { requestRefund } from "./refunds";
import { services } from "./services";
import { isTestRun } from "./run-context";
import { hashToken, newOrderToken, tokenMatchesHash, verifyOrderToken } from "./tokens";

const CHECKOUT_TTL_MS = 3 * 60 * 60 * 1000; // PayPal orders that are never approved lapse after ~3h

function imageUrl(sha: string | null | undefined) {
  return sha ? appUrl(`/img/${sha}`) : null;
}

async function firstImages(productIds: string[]) {
  const { db } = services();
  if (productIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ productId: schema.productImages.productId, sha: schema.productImages.imageSha256 })
    .from(schema.productImages)
    .where(inArray(schema.productImages.productId, productIds))
    .orderBy(asc(schema.productImages.position));
  const m = new Map<string, string>();
  for (const r of rows) if (!m.has(r.productId)) m.set(r.productId, r.sha);
  return m;
}

export const shop: ShopPort = {
  async searchProducts(input) {
    const { db } = services();
    const terms = input.query
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1)
      .slice(0, 8);
    const haystack = sql`lower(${schema.products.title} || ' ' || ${schema.products.description} || ' ' || ${schema.products.category} || ' ' || ${schema.products.attributes}::text)`;
    const score = terms.length
      ? sql<number>`(${sql.join(
          terms.map((t) => sql`(case when ${haystack} like ${"%" + t + "%"} then 1 else 0 end)`),
          sql` + `,
        )})`
      : sql<number>`0`;

    const rows = await db
      .select({
        productId: schema.products.id,
        title: schema.products.title,
        description: schema.products.description,
        handle: schema.sellers.handle,
        sellerName: schema.sellers.displayName,
        minPrice: sql<number>`min(${schema.variants.priceCents})`,
        stock: sql<number>`coalesce(sum(${schema.variants.stock}), 0)`,
        score: sql<number>`max(${score})`,
      })
      .from(schema.products)
      .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
      .innerJoin(schema.variants, and(eq(schema.variants.productId, schema.products.id), eq(schema.variants.active, true)))
      .where(
        and(
          eq(schema.products.status, "approved"),
          // The isolated judge seller (test_only, D-073) is reachable only by name, never from global search.
          input.seller_handle ? eq(schema.sellers.handle, input.seller_handle) : eq(schema.sellers.testOnly, false),
          input.category ? sql`lower(${schema.products.category}) = ${input.category.toLowerCase()}` : undefined,
        ),
      )
      .groupBy(schema.products.id, schema.sellers.handle, schema.sellers.displayName)
      .orderBy(sql`max(${score}) desc`, asc(schema.products.title));

    let results = rows.filter((r) => (terms.length === 0 || Number(r.score) > 0));
    if (input.max_price_usd !== undefined) results = results.filter((r) => Number(r.minPrice) <= Math.round(input.max_price_usd! * 100));
    if (input.in_stock_only) results = results.filter((r) => Number(r.stock) > 0);
    const page = results.slice(0, input.limit);
    const imgs = await firstImages(page.map((r) => r.productId));
    return {
      total: results.length,
      results: page.map((r) => ({
        product_id: r.productId,
        title: r.title,
        summary: r.description.slice(0, 180),
        price_from: money(Number(r.minPrice)),
        image_url: imageUrl(imgs.get(r.productId)),
        product_url: appUrl(`/s/${r.handle}/${r.productId}`),
        seller: { handle: r.handle, display_name: r.sellerName },
        in_stock: Number(r.stock) > 0,
      })),
    };
  },

  async getProduct(input) {
    const { db } = services();
    const [p] = await db
      .select({ product: schema.products, seller: schema.sellers })
      .from(schema.products)
      .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
      .where(and(eq(schema.products.id, input.product_id), eq(schema.products.status, "approved")));
    if (!p) throw new ShopError("NOT_FOUND", `Product ${input.product_id} not found.`);
    const vs = await db
      .select()
      .from(schema.variants)
      .where(and(eq(schema.variants.productId, p.product.id), eq(schema.variants.active, true)))
      .orderBy(asc(schema.variants.priceCents));
    const imgs = await db
      .select({ sha: schema.productImages.imageSha256 })
      .from(schema.productImages)
      .where(eq(schema.productImages.productId, p.product.id))
      .orderBy(asc(schema.productImages.position));
    const pol = p.seller.refundPolicy;
    return {
      product_id: p.product.id,
      title: p.product.title,
      description: p.product.description,
      attributes: p.product.attributes,
      images: imgs.map((i) => imageUrl(i.sha)!),
      seller: { handle: p.seller.handle, display_name: p.seller.displayName },
      variants: vs.map((v) => ({
        variant_id: v.id,
        options: v.options,
        price: money(v.priceCents),
        available: v.stock > 0,
        max_quantity: Math.max(0, Math.min(10, v.stock)),
      })),
      shipping: { flat: money(p.seller.flatShippingCents), ships_to: p.seller.shipsTo },
      return_policy_summary: `Refunds within ${pol.window_days} days. Up to ${centsToValue(pol.auto_refund_max_cents)} USD is refunded automatically for wrong size, damage or items not as described; other requests are reviewed by the seller.`,
    };
  },

  async createCheckout(input, ctx) {
    const { db, paypal } = services();

    // Idempotency: the same client_request_id with the same items returns the same checkout and token. The token is
    // re-derived from the key, so only the caller holding the key gets it back; a key reused for other items is refused.
    if (input.client_request_id) {
      const [existing] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.clientRequestId, input.client_request_id));
      if (existing) {
        const token = newOrderToken(existing.id, input.client_request_id);
        const lines = await db.select().from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, existing.id));
        if (!tokenMatchesHash(token, existing.orderTokenHash) || itemsKey(lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }))) !== itemsKey(input.items))
          throw new ShopError("CONFLICT", "This client_request_id was already used for a different checkout. Generate a new random UUID for each new checkout.");
        if (existing.paypalOrderId) return checkoutView(existing.id, token);
      }
    }

    const variantIds = [...new Set(input.items.map((i) => i.variant_id))];
    const rows = await db
      .select({ v: schema.variants, p: schema.products, s: schema.sellers })
      .from(schema.variants)
      .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
      .where(inArray(schema.variants.id, variantIds));

    const variants = new Map<string, PricedVariant>(
      rows.map(({ v, p }) => [
        v.id,
        {
          id: v.id,
          productId: p.id,
          sellerId: p.sellerId,
          sku: v.sku,
          title: p.title,
          options: v.options,
          priceCents: v.priceCents,
          currency: v.currency as "USD",
          stock: v.stock,
          active: v.active,
          productStatus: p.status,
        },
      ]),
    );
    const sellers = new Map<string, SellerPricing>(
      rows.map(({ s }) => [s.id, { id: s.id, brandName: s.displayName, flatShippingCents: s.flatShippingCents, currency: s.currency as "USD" }]),
    );

    // PRICING ENGINE: totals come from the DB rows above, never from the caller (D-002).
    const quote = quoteCheckout(input.items, variants, sellers);
    const checkoutId = newId("checkout");
    const token = newOrderToken(checkoutId, input.client_request_id ?? null);
    const seller = sellers.get(quote.sellerId)!;

    await db.transaction(async (tx) => {
      await tx.insert(schema.checkouts).values({
        id: checkoutId,
        sellerId: quote.sellerId,
        orderTokenHash: hashToken(token),
        clientRequestId: input.client_request_id ?? null,
        source: ctx.clientName === "shopfront-web-agent" ? "web_agent" : "mcp_external",
        mcpClientName: ctx.clientName ?? null,
        // Every order for a test_only seller (the judge demo, D-073) is a test by design, header or not.
        isTest: (await isTestRun()) || rows.some(({ s }) => s.id === quote.sellerId && s.testOnly),
        status: "created",
        itemTotalCents: quote.itemTotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        totalCents: quote.totalCents,
        currency: quote.currency,
        expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      });
      await tx.insert(schema.checkoutItems).values(
        quote.lines.map((l) => ({
          checkoutId,
          variantId: l.variantId,
          sku: l.sku,
          titleSnapshot: l.title,
          optionsSnapshot: l.options,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineTotalCents: l.lineTotalCents,
        })),
      );
    });

    await recordEvent(db, {
      actor: "mcp",
      kind: "create_checkout",
      checkoutId,
      sellerId: quote.sellerId,
      summary: `create_checkout · ${quote.lines.map((l) => `${l.quantity} × ${l.title}`).join(", ")} · server total $${centsToValue(quote.totalCents)}`,
      data: { mcpRequestId: ctx.requestId, client: ctx.clientName, totalCents: quote.totalCents },
    });

    const body = buildPayPalOrderRequest(quote, {
      checkoutId,
      brandName: seller.brandName,
      // The return URL carries the creator's token: /pay/return never issues one (REVIEW-1 #2).
      returnUrl: appUrl(`/pay/return?checkout=${checkoutId}&t=${token}`),
      cancelUrl: appUrl(`/pay/${checkoutId}?t=${token}&cancelled=1`),
    });
    const requestId = `checkout-${checkoutId}`;
    try {
      const { data: order, debugId } = await paypal.createOrder(body, requestId, { context: { checkoutId } });
      await db
        .update(schema.checkouts)
        .set({ paypalOrderId: order.id, approveUrl: approveLink(order) ?? null, updatedAt: new Date() })
        .where(eq(schema.checkouts.id, checkoutId));
      await recordEvent(db, {
        actor: "paypal",
        kind: "order_created",
        checkoutId,
        sellerId: quote.sellerId,
        summary: `Order created (${order.status})`,
        data: { orderId: order.id, debugId, paypalRequestId: requestId },
      });
      scheduleFallbackChecks(checkoutId, "created");
      scheduleExpiryCheck(checkoutId, new Date(Date.now() + CHECKOUT_TTL_MS));
    } catch (e) {
      await db.update(schema.checkouts).set({ status: "cancelled", updatedAt: new Date() }).where(eq(schema.checkouts.id, checkoutId));
      const debugId = isPayPalApiError(e) ? e.debugId : undefined;
      await recordEvent(db, {
        actor: "paypal",
        kind: "order_failed",
        checkoutId,
        sellerId: quote.sellerId,
        summary: `PayPal order creation failed${isPayPalApiError(e) ? ` (${e.issue})` : ""}`,
        data: { debugId, paypalRequestId: requestId },
      });
      throw new ShopError("UPSTREAM_ERROR", "PayPal could not create the order. Please try again.", { debug_id: debugId });
    }
    return checkoutView(checkoutId, token);
  },

  async getCheckoutStatus(input) {
    if (!(await verifyOrderToken(input.checkout_id, input.order_token))) throw new ShopError("FORBIDDEN", "Invalid order token.");
    const { db } = services();
    const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, input.checkout_id));
    if (!c) throw new ShopError("NOT_FOUND", "Checkout not found.");
    const [cap] = await db.select().from(schema.captures).where(eq(schema.captures.checkoutId, c.id));
    const [ship] = await db.select().from(schema.shipments).where(eq(schema.shipments.checkoutId, c.id));
    const refunds = await db.select().from(schema.refundRequests).where(eq(schema.refundRequests.checkoutId, c.id));
    const msgs = await db
      .select()
      .from(schema.messages)
      .where(and(eq(schema.messages.checkoutId, c.id), eq(schema.messages.status, "published")));
    const lastMsg = msgs.at(-1);
    return {
      checkout_id: c.id,
      status: c.status,
      status_label: STATUS_LABEL[c.status as CheckoutStatus],
      paid_at: cap?.capturedAt.toISOString() ?? null,
      confirmed_via: c.confirmedVia,
      totals: totals(c),
      tracking: ship ? { carrier: ship.carrier, tracking_number: ship.trackingNumber } : null,
      refunds: refunds.map((r) => ({ id: r.id, status: r.status, amount: centsToValue(r.amountCents) })),
      seller_message: lastMsg ? { subject: lastMsg.subject, body: lastMsg.body } : null,
    };
  },

  async requestRefund(input) {
    return requestRefund(input);
  },
};

function totals(c: typeof schema.checkouts.$inferSelect) {
  return {
    item_total: centsToValue(c.itemTotalCents),
    shipping: centsToValue(c.shippingCents),
    tax: centsToValue(c.taxCents),
    total: centsToValue(c.totalCents),
    currency_code: "USD" as const,
  };
}

/** Order-independent key of a checkout's lines, to tell a true idempotent retry from a reused key. */
function itemsKey(items: Array<{ variant_id: string; quantity: number }>): string {
  const sum = new Map<string, number>();
  for (const i of items) sum.set(i.variant_id, (sum.get(i.variant_id) ?? 0) + i.quantity);
  return [...sum].sort(([a], [b]) => a.localeCompare(b)).map(([v, q]) => `${v}:${q}`).join(",");
}

async function checkoutView(checkoutId: string, token: string) {
  const { db } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c?.paypalOrderId) throw new ShopError("UPSTREAM_ERROR", "Checkout is not ready.");
  const items = await db.select().from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, checkoutId));
  return {
    checkout_id: c.id,
    order_token: token,
    pay_url: appUrl(`/pay/${c.id}?t=${token}`),
    paypal_order_id: c.paypalOrderId,
    line_items: items.map((i) => ({
      title: i.titleSnapshot,
      options: i.optionsSnapshot,
      quantity: i.quantity,
      unit_price: centsToValue(i.unitPriceCents),
      line_total: centsToValue(i.lineTotalCents),
    })),
    totals: totals(c),
    expires_at: c.expiresAt.toISOString(),
    next_step: "Give pay_url to the human buyer. Payment needs their approval in PayPal; you cannot approve it.",
  };
}

export type { CallContext };
