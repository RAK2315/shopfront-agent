import "server-only";
import type { CartItem, PayPalCart, ResolutionOption, ValidationIssue } from "@paypal/agentic-commerce-spec";
import { payPalCartWritableSchema } from "@paypal/agentic-commerce-spec/dist/generated/zod.gen.js";
import { centsToValue, newId, payeeRoute, refundHandoffLink, ShopError, valueToCents, type CheckoutStatus } from "@shopfront/core";
import { and, eq, inArray, schema, sql } from "@shopfront/db";
import { isPayPalApiError, type PayPalOrder } from "@shopfront/paypal";
import { appUrl, env } from "./env";
import { recordEvent } from "./events";
import { applyCheckoutEvent, buyerDetails, returnStock, settleAuthorizationCapture, takeStock } from "./payments";
import { isTestRun } from "./run-context";
import { services } from "./services";
import { openCheckout } from "./shop";
import { newOrderToken } from "./tokens";

// PayPal Cart API v1, merchant side (D-097, D-098), built to PayPal's published schema (@paypal/agentic-commerce-spec).
// Every Shopfront store answers POST/GET/PUT /merchant-cart and POST /merchant-cart/{id}/checkout. The rules stay ours:
//  - prices and totals come only from the database (D-002); an agent-sent item price is never used, a differing one is
//    reported as PRICING_ERROR / PRICE_MISMATCH;
//  - validation issues and their resolution options are computed by deterministic code, never by a model;
//  - a valid cart opens an Orders v2 order (intent AUTHORIZE) through the same openCheckout as MCP, so payee routing,
//    timers, webhooks, the live wire and reconciliation all apply; the hold is captured when the seller ships.

type Store = typeof schema.sellers.$inferSelect;
type CartRow = typeof schema.carts.$inferSelect;
type Writable = Record<string, unknown> & { items?: CartItem[]; shipping_address?: Record<string, string>; customer?: { name?: { given_name?: string; surname?: string } }; coupons?: unknown[] };
type Validation = "VALID" | "INVALID" | "REQUIRES_ADDITIONAL_INFORMATION";

const MAX_QTY = 10;
const MAX_LINES = 20;

/** A Cart API HTTP error, in the spec's `Error` / `BusinessError` shape. */
export class CartHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: { name: string; message: string; debug_id?: string; details?: Array<{ field?: string; issue?: string; description?: string }>; business_context?: ValidationIssue },
  ) {
    super(body.message);
  }
}

const money = (cents: number) => ({ currency_code: "USD", value: centsToValue(cents) });
const opt = (action: ResolutionOption["action"], label: string, metadata?: ResolutionOption["metadata"]): ResolutionOption => ({ action, label, ...(metadata ? { metadata } : {}) });

interface Evaluation {
  validation: Validation;
  issues: ValidationIssue[];
  lines: Array<{ variant_id: string; quantity: number }>;
  items: CartItem[];
  subtotalCents: number;
  shippingCents: number;
  priceInjected: boolean;
}

/** Validate a writable cart for one store. Pure database reads; no model, no PayPal call. */
async function evaluate(store: Store, req: Writable): Promise<Evaluation> {
  const { db } = services();
  const issues: ValidationIssue[] = [];
  const requested = req.items ?? [];
  if (!requested.length) issues.push({ code: "DATA_ERROR", type: "MISSING_FIELD", message: "items is empty", user_message: "Add at least one item.", field: "items", context: { specific_issue: "REQUIRED_FIELD_MISSING", field_name: "items" }, resolution_options: [opt("MODIFY_CART", "Add an item")] });
  if (requested.length > MAX_LINES) issues.push({ code: "BUSINESS_RULE_ERROR", type: "BUSINESS_RULE", message: `more than ${MAX_LINES} lines`, user_message: `A cart can hold up to ${MAX_LINES} different items.`, context: { specific_issue: "CART_LIMIT_EXCEEDED" }, resolution_options: [opt("MODIFY_CART", "Remove some items")] });

  // Merge repeated variants; the id is variant_id (item_id is deprecated in v1 but accepted).
  const merged = new Map<string, { quantity: number; price?: CartItem["price"] }>();
  for (const it of requested.slice(0, MAX_LINES)) {
    const id = it.variant_id ?? it.item_id;
    if (!id) {
      issues.push({ code: "DATA_ERROR", type: "INVALID_DATA", message: "item without variant_id", user_message: "One item has no product id.", context: { specific_issue: "INVALID_ITEM_DATA", field_name: "variant_id" }, resolution_options: [opt("MODIFY_CART", "Send variant_id for every item")] });
      continue;
    }
    const prev = merged.get(id);
    merged.set(id, { quantity: (prev?.quantity ?? 0) + it.quantity, price: it.price ?? prev?.price });
  }
  const ids = [...merged.keys()];
  const rows = ids.length
    ? await db
        .select({ v: schema.variants, p: schema.products })
        .from(schema.variants)
        .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
        .where(inArray(schema.variants.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.v.id, r]));

  const lines: Evaluation["lines"] = [];
  const items: CartItem[] = [];
  let subtotalCents = 0;
  let priceInjected = false;
  for (const [id, want] of merged) {
    const r = byId.get(id);
    // Another store's variant is "not found" here: a store-bound token can't reach other stores' listings.
    if (!r || r.p.sellerId !== store.id || r.p.status !== "approved" || !r.v.active) {
      issues.push({ code: "DATA_ERROR", type: "INVALID_DATA", message: `variant ${id} not found in store ${store.handle}`, user_message: "One item isn't sold by this shop.", item_id: id, context: { specific_issue: "ITEM_NOT_FOUND", provided_value: id }, resolution_options: [opt("REMOVE_ITEM", "Remove this item")] });
      continue;
    }
    const name = Object.keys(r.v.options).length ? `${r.p.title} (${Object.values(r.v.options).join(", ")})` : r.p.title;
    items.push({ variant_id: id, item_id: r.p.id, quantity: want.quantity, name, price: money(r.v.priceCents), item_url: appUrl(`/s/${store.handle}/${r.p.id}`) });
    let ok = true;
    if (!Number.isInteger(want.quantity) || want.quantity < 1 || want.quantity > MAX_QTY) {
      ok = false;
      issues.push({ code: "BUSINESS_RULE_ERROR", type: "BUSINESS_RULE", message: `quantity ${want.quantity} outside 1-${MAX_QTY}`, user_message: `You can buy 1 to ${MAX_QTY} of ${r.p.title}.`, item_id: id, context: { specific_issue: "MAXIMUM_QUANTITY_EXCEEDED", total_quantity: want.quantity, maximum_amount: String(MAX_QTY) }, resolution_options: [opt("MODIFY_CART", `Set the quantity to ${MAX_QTY} or fewer`, { auto_applicable: true })] });
    }
    if (r.v.stock <= 0) {
      ok = false;
      const alt = await alternatives(store.id, r.p.id, id);
      issues.push({
        code: "INVENTORY_ISSUE",
        type: "BUSINESS_RULE",
        message: `variant ${id} out of stock`,
        user_message: `${r.p.title} is sold out.`,
        item_id: id,
        context: { specific_issue: "ITEM_OUT_OF_STOCK", variant_id: id, available_quantity: 0, requested_quantity: want.quantity, suggested_alternatives: alt },
        resolution_options: [opt("REMOVE_ITEM", "Remove this item"), ...(alt.length ? [opt("SUGGEST_ALTERNATIVE", `Choose ${alt.length === 1 ? "the suggested alternative" : "a suggested alternative"}`)] : []), opt("WAIT_FOR_RESTOCK", "Wait for a restock")],
      });
    } else if (r.v.stock < want.quantity) {
      ok = false;
      issues.push({ code: "INVENTORY_ISSUE", type: "BUSINESS_RULE", message: `only ${r.v.stock} of ${id} in stock`, user_message: `Only ${r.v.stock} of ${r.p.title} left.`, item_id: id, context: { specific_issue: "INSUFFICIENT_INVENTORY", variant_id: id, available_quantity: r.v.stock, requested_quantity: want.quantity }, resolution_options: [opt("MODIFY_CART", `Reduce to ${r.v.stock}`, { auto_applicable: true }), opt("REMOVE_ITEM", "Remove this item")] });
    }
    // D-002: the shop's price is the price. An agent that sends another one is told, never obeyed.
    if (want.price) {
      if (want.price.currency_code !== "USD") {
        ok = false;
        issues.push({ code: "PRICING_ERROR", type: "INVALID_DATA", message: `currency ${want.price.currency_code} not supported`, user_message: "This shop sells in USD.", item_id: id, context: { specific_issue: "CURRENCY_NOT_SUPPORTED", supported_currencies: ["USD"], found_currencies: [want.price.currency_code] }, resolution_options: [opt("USE_DIFFERENT_CURRENCY", "Use USD")] });
      } else if (safeCents(want.price.value) !== r.v.priceCents) {
        ok = false;
        priceInjected = true;
        issues.push({
          code: "PRICING_ERROR",
          type: "INVALID_DATA",
          message: `sent price ${want.price.value} differs from the shop's price ${centsToValue(r.v.priceCents)}`,
          user_message: `${r.p.title} costs $${centsToValue(r.v.priceCents)}.`,
          item_id: id,
          context: { specific_issue: "PRICE_MISMATCH", item_id: id, original_price: want.price.value, current_price: centsToValue(r.v.priceCents), currency_code: "USD" },
          resolution_options: [opt("ACCEPT_NEW_PRICE", `Accept the shop's price, $${centsToValue(r.v.priceCents)}`, { cost_impact: centsToValue(r.v.priceCents - (safeCents(want.price.value) ?? 0)) }), opt("REMOVE_ITEM", "Remove this item")],
        });
      }
    }
    subtotalCents += r.v.priceCents * Math.min(Math.max(want.quantity, 0), MAX_QTY);
    if (ok) lines.push({ variant_id: id, quantity: want.quantity });
  }

  if (req.coupons?.length) issues.push({ code: "PRICING_ERROR", type: "BUSINESS_RULE", message: "coupons are not offered", user_message: "This shop doesn't offer coupons.", context: { specific_issue: "DISCOUNT_CUSTOMER_INELIGIBLE" }, resolution_options: [opt("REMOVE_COUPON", "Remove the coupon")] });

  const addr = req.shipping_address;
  if (!addr) {
    issues.push({ code: "SHIPPING_ERROR", type: "MISSING_FIELD", message: "shipping_address is required", user_message: "Where should this ship?", field: "shipping_address", context: { specific_issue: "MISSING_SHIPPING_ADDRESS" }, resolution_options: [opt("UPDATE_ADDRESS", "Add a shipping address"), opt("PROVIDE_MISSING_FIELD", "Provide shipping_address")] });
  } else if (!store.shipsTo.includes(addr.country_code ?? "")) {
    issues.push({ code: "SHIPPING_ERROR", type: "BUSINESS_RULE", message: `does not ship to ${addr.country_code}`, user_message: `${store.displayName} ships to ${store.shipsTo.join(", ")} only.`, field: "shipping_address.country_code", context: { specific_issue: "INTERNATIONAL_SHIPPING_RESTRICTED", destination_country: addr.country_code, supported_countries: store.shipsTo }, resolution_options: [opt("UPDATE_ADDRESS", "Ship to a supported country")] });
  } else {
    const missing = ["address_line_1", "admin_area_2", "postal_code"].filter((f) => !addr[f]?.trim());
    if (missing.length) issues.push({ code: "SHIPPING_ERROR", type: "MISSING_FIELD", message: `shipping_address missing ${missing.join(", ")}`, user_message: "The shipping address is incomplete.", field: "shipping_address", context: { specific_issue: "SHIPPING_ADDRESS_INVALID", validation_failures: missing }, resolution_options: [opt("UPDATE_ADDRESS", "Complete the address")] });
  }

  // D-084: a shop with no verified PayPal (and not the platform demo) can't take payments.
  if (payeeRoute(store).kind === "not_ready") issues.push({ code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: "merchant PayPal account not verified", user_message: `${store.displayName} can't take payments yet.`, context: { specific_issue: "MERCHANT_ACCOUNT_ISSUE" }, resolution_options: [opt("CONTACT_SUPPORT", "Ask the shop to connect PayPal")] });

  const blocking = issues.some((i) => i.type !== "MISSING_FIELD");
  const validation: Validation = blocking ? "INVALID" : issues.length ? "REQUIRES_ADDITIONAL_INFORMATION" : "VALID";
  return { validation, issues, lines, items, subtotalCents, shippingCents: items.length ? store.flatShippingCents : 0, priceInjected };
}

function safeCents(v: string | undefined): number | undefined {
  try {
    return v === undefined ? undefined : valueToCents(v);
  } catch {
    return undefined;
  }
}

/** In-stock variants to offer instead: the same product first, then other listings of this store. */
async function alternatives(sellerId: string, productId: string, notVariant: string) {
  const { db } = services();
  const rows = await db.execute<{ id: string }>(sql`
    select v.id from ${schema.variants} v join ${schema.products} p on p.id = v.product_id
    where p.seller_id = ${sellerId} and p.status = 'approved' and v.active and v.stock > 0 and v.id <> ${notVariant}
    order by (p.id = ${productId}) desc, v.price_cents asc limit 2`);
  return rows.rows.map((r) => r.id);
}

function parseWritable(body: unknown): Writable {
  const r = payPalCartWritableSchema.safeParse(body);
  if (!r.success)
    throw new CartHttpError(400, {
      name: "INVALID_REQUEST",
      message: "The cart doesn't match PayPal's Cart API v1 schema.",
      details: r.error.issues.slice(0, 10).map((i) => ({ field: i.path.join("."), issue: "INVALID_PARAMETER_SYNTAX", description: i.message })),
    });
  return r.data as Writable;
}

/** What we keep of a request: everything the spec lets the agent write, minus the payment method (ids only). */
function stored(req: Writable): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...req };
  delete rest.payment_method;
  return rest;
}

function shipToOf(req: Writable) {
  const a = req.shipping_address;
  if (!a) return undefined;
  const n = [req.customer?.name?.given_name, req.customer?.name?.surname].filter(Boolean).join(" ").trim();
  const pick = (k: string) => (a[k]?.trim() ? a[k]!.trim() : undefined);
  return {
    ...(n ? { fullName: n } : {}),
    address: { address_line_1: pick("address_line_1"), address_line_2: pick("address_line_2"), admin_area_2: pick("admin_area_2"), admin_area_1: pick("admin_area_1"), postal_code: pick("postal_code"), country_code: a.country_code! },
  };
}

const linesKey = (lines: Evaluation["lines"], req: Writable) => JSON.stringify([[...lines].sort((a, b) => a.variant_id.localeCompare(b.variant_id)), req.shipping_address ?? null]);

/** Open the Orders v2 order for a valid cart (intent AUTHORIZE). A race lost to stock or payee readiness becomes an issue. */
async function openFor(store: Store, cartId: string, version: number, client: string, req: Writable, ev: Evaluation) {
  try {
    return await openCheckout({
      items: ev.lines,
      clientRequestId: `cart:${cartId}:v${version}`,
      source: "cart_api",
      clientName: client,
      sellerId: store.id,
      intent: "AUTHORIZE",
      shipTo: shipToOf(req),
      returnUrl: () => appUrl(`/cart/approved?cart=${cartId}`),
      cancelUrl: () => appUrl(`/cart/approved?cart=${cartId}&cancelled=1`),
      event: { actor: "cart_api", kind: "cart_checkout_opened", label: "Cart API · checkout opened", data: { cartId, client } },
    });
  } catch (e) {
    if (e instanceof ShopError) {
      ev.validation = "INVALID";
      ev.issues.push(
        e.code === "SELLER_NOT_READY"
          ? { code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: e.message, context: { specific_issue: "MERCHANT_ACCOUNT_ISSUE" }, resolution_options: [opt("CONTACT_SUPPORT", "Ask the shop to connect PayPal")] }
          : e.code === "OUT_OF_STOCK"
            ? { code: "INVENTORY_ISSUE", type: "BUSINESS_RULE", message: e.message, context: { specific_issue: "INSUFFICIENT_INVENTORY" }, resolution_options: [opt("MODIFY_CART", "Change the quantities")] }
            : { code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: e.message, context: { specific_issue: "PAYMENT_PROCESSOR_UNAVAILABLE" }, resolution_options: [opt("RETRY_LATER", "Try again shortly")] },
      );
      return null;
    }
    throw e;
  }
}

async function logCart(store: Store, kind: string, summary: string, cartId: string, checkoutId: string | null, data: Record<string, unknown>) {
  const { db } = services();
  await recordEvent(db, { actor: "cart_api", kind, checkoutId, sellerId: store.id, summary, data: { cartId, ...data } });
}

function summaryOf(method: string, ev: Pick<Evaluation, "validation" | "issues">, client: string) {
  const codes = ev.issues.map((i) => (i.context as { specific_issue?: string } | undefined)?.specific_issue ?? i.code);
  return `Cart API · ${method} · ${ev.validation}${codes.length ? ` · ${codes.join(", ")}` : ""} · agent "${client}"`;
}

/** POST /merchant-cart */
export async function createCart(store: Store, client: string, body: unknown) {
  const { db } = services();
  const req = parseWritable(body);
  const ev = await evaluate(store, req);
  const id = newId("cart");
  const opened = ev.validation === "VALID" ? await openFor(store, id, 1, client, req, ev) : null;
  const [row] = await db
    .insert(schema.carts)
    .values({
      id,
      sellerId: store.id,
      client,
      status: opened ? "CREATED" : "INCOMPLETE",
      validationStatus: ev.validation,
      request: stored(req),
      issues: ev.issues as unknown as Array<Record<string, unknown>>,
      totals: { subtotal: ev.subtotalCents, shipping: ev.shippingCents, key: linesKey(ev.lines, req) },
      checkoutId: opened?.checkoutId ?? null,
      isTest: (await isTestRun()) || store.testOnly,
    })
    .returning();
  await logCart(store, "cart_created", summaryOf("POST /merchant-cart", ev, client), id, opened?.checkoutId ?? null, { issues: ev.issues.length });
  if (ev.priceInjected) await logCart(store, "cart_rejected", "Cart API · agent-sent price ignored · the shop's price stands (D-002)", id, null, { client });
  return { status: opened ? 201 : 200, cart: await view(row!) };
}

async function loadCart(store: Store, client: string, cartId: string) {
  const { db } = services();
  if (!/^cart_[a-z0-9]{12}$/.test(cartId)) throw new CartHttpError(400, { name: "INVALID_REQUEST", message: "Cart id format is invalid.", details: [{ field: "cartId", issue: "INVALID_PARAMETER_SYNTAX" }] });
  const [row] = await db.select().from(schema.carts).where(and(eq(schema.carts.id, cartId), eq(schema.carts.sellerId, store.id)));
  // A cart belongs to the agent that built it: another agent (even with a token for the same store) gets 404.
  if (!row || row.client !== client) throw new CartHttpError(404, { name: "RESOURCE_NOT_FOUND", message: "Cart not found." });
  return row;
}

/** GET /merchant-cart/{id} */
export async function getCart(store: Store, client: string, cartId: string) {
  return view(await loadCart(store, client, cartId));
}

/** PUT /merchant-cart/{id}: a full replacement (the spec's rule). A changed cart gets a fresh order. */
export async function updateCart(store: Store, client: string, cartId: string, body: unknown) {
  const { db } = services();
  const row = await loadCart(store, client, cartId);
  if (row.status === "COMPLETED") throw new CartHttpError(422, { name: "UNPROCESSABLE_ENTITY", message: "This cart is already checked out.", details: [{ issue: "CART_LIMIT_EXCEEDED", description: "Create a new cart." }] });
  const req = parseWritable(body);
  const ev = await evaluate(store, req);
  const version = row.version + 1;
  const key = linesKey(ev.lines, req);
  let checkoutId = row.checkoutId;
  const [current] = checkoutId ? await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId)) : [];
  const reusable = ev.validation === "VALID" && current && (row.totals as { key?: string }).key === key && ["created", "approved"].includes(current.status);
  if (!reusable) {
    // The old order is never approved now: cancel it so its timers and the reconciliation see it closed.
    if (current && ["created", "approved"].includes(current.status)) await applyCheckoutEvent(current.id, "CANCELLED", "system");
    checkoutId = null;
    if (ev.validation === "VALID") checkoutId = (await openFor(store, cartId, version, client, req, ev))?.checkoutId ?? null;
  }
  const [next] = await db
    .update(schema.carts)
    .set({
      version,
      status: checkoutId ? "CREATED" : "INCOMPLETE",
      validationStatus: ev.validation,
      request: stored(req),
      issues: ev.issues as unknown as Array<Record<string, unknown>>,
      totals: { subtotal: ev.subtotalCents, shipping: ev.shippingCents, key },
      checkoutId,
      updatedAt: new Date(),
    })
    .where(eq(schema.carts.id, cartId))
    .returning();
  await logCart(store, "cart_updated", summaryOf("PUT /merchant-cart", ev, client), cartId, checkoutId, { version, reusedOrder: Boolean(reusable) });
  if (ev.priceInjected) await logCart(store, "cart_rejected", "Cart API · agent-sent price ignored · the shop's price stands (D-002)", cartId, null, { client });
  return view(next!);
}

function businessError(status: number, issue: ValidationIssue): CartHttpError {
  const specific = (issue.context as { specific_issue?: string } | undefined)?.specific_issue;
  return new CartHttpError(status, { name: "UNPROCESSABLE_ENTITY", message: issue.user_message ?? issue.message, details: [{ ...(issue.field ? { field: issue.field } : {}), issue: specific, description: issue.message }], business_context: issue });
}

/**
 * POST /merchant-cart/{id}/checkout: the buyer approved in PayPal; authorize the order (no money is taken until the
 * seller ships). Idempotent: a repeated call returns the completed cart, and the authorize call carries a fixed
 * PayPal-Request-Id, so PayPal returns the same authorization.
 */
export async function checkoutCart(store: Store, client: string, cartId: string, body: unknown) {
  const { db, paypal } = services();
  const row = await loadCart(store, client, cartId);
  if (row.status === "COMPLETED") return view(row);
  const pm = (body as { payment_method?: { type?: string; token?: string; payer_id?: string } } | null)?.payment_method;
  if (row.validationStatus !== "VALID" || !row.checkoutId) {
    const first = (row.issues as unknown as ValidationIssue[])[0];
    throw businessError(422, first ?? { code: "DATA_ERROR", type: "INVALID_DATA", message: "cart is not valid", context: { specific_issue: "INVALID_ITEM_DATA" } });
  }
  if (pm?.type !== "paypal" || !pm.token || !pm.payer_id)
    throw businessError(422, { code: "DATA_ERROR", type: "MISSING_FIELD", message: "payment_method.token and payer_id are required", user_message: "Approve the payment in PayPal first.", field: "payment_method", context: { specific_issue: "MISSING_PAYMENT_METHOD" }, resolution_options: [opt("PROVIDE_MISSING_FIELD", "Send the token and payer_id PayPal returned")] });
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, row.checkoutId));
  if (!c?.paypalOrderId || pm.token !== c.paypalOrderId)
    throw businessError(422, { code: "PAYMENT_ERROR", type: "INVALID_DATA", message: "payment token does not belong to this cart", user_message: "That payment doesn't belong to this cart.", field: "payment_method.token", context: { specific_issue: "PAYMENT_DECLINED", payment_token: pm.token.slice(0, 40) }, resolution_options: [opt("USE_DIFFERENT_PAYMENT", "Use this cart's payment token")] });
  if (c.status === "cancelled")
    throw businessError(422, { code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: "the order for this cart expired or was replaced", context: { specific_issue: "PAYMENT_EXPIRED" }, resolution_options: [opt("MODIFY_CART", "PUT the cart again for a new order")] });

  const { data: order } = await paypal.getOrder(c.paypalOrderId, { context: { checkoutId: c.id } });
  const already = order.purchase_units?.[0]?.payments?.authorizations?.[0];
  if (!already) {
    if (order.status !== "APPROVED")
      throw businessError(422, { code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: `PayPal order is ${order.status}, not APPROVED`, user_message: "The buyer hasn't approved the payment yet.", context: { specific_issue: "MISSING_PAYMENT_METHOD" }, resolution_options: [{ ...opt("REDIRECT_TO_MERCHANT", "Ask the buyer to approve in PayPal"), ...(c.approveUrl ? { url: c.approveUrl } : {}), metadata: { redirect_required: true } }] });
    if (order.payer?.payer_id && order.payer.payer_id !== pm.payer_id)
      throw businessError(422, { code: "PAYMENT_ERROR", type: "INVALID_DATA", message: "payer_id does not match the approving buyer", context: { specific_issue: "PAYMENT_DECLINED" }, resolution_options: [opt("USE_DIFFERENT_PAYMENT", "Send the payer_id PayPal returned")] });
    // D-009: stock is checked again before the hold is placed.
    const short = await db.execute<{ variant_id: string }>(sql`
      select ci.variant_id from ${schema.checkoutItems} ci join ${schema.variants} v on v.id = ci.variant_id
      where ci.checkout_id = ${c.id} and v.stock < ci.quantity`);
    if (short.rows.length)
      throw businessError(422, { code: "INVENTORY_ISSUE", type: "BUSINESS_RULE", message: "sold out before payment", user_message: "An item sold out before payment. You were not charged.", item_id: short.rows[0]!.variant_id, context: { specific_issue: "ITEM_OUT_OF_STOCK", variant_id: short.rows[0]!.variant_id }, resolution_options: [opt("REMOVE_ITEM", "Remove the sold-out item")] });
  }

  const requestId = `authorize-${c.id}`;
  let auth = already;
  let debugId: string | undefined;
  let authorized: PayPalOrder = order;
  if (!auth) {
    try {
      const r = await paypal.authorizeOrder(c.paypalOrderId, requestId, { context: { checkoutId: c.id } });
      authorized = r.data;
      debugId = r.debugId;
      auth = r.data.purchase_units?.[0]?.payments?.authorizations?.[0];
    } catch (e) {
      const d = isPayPalApiError(e) ? e.debugId : undefined;
      await recordEvent(db, { actor: "paypal", kind: "authorize_failed", checkoutId: c.id, sellerId: store.id, summary: `PayPal authorization failed${isPayPalApiError(e) ? ` (${e.issue})` : ""}`, data: { debugId: d, paypalRequestId: requestId, cartId } });
      throw new CartHttpError(422, { name: "UNPROCESSABLE_ENTITY", message: "PayPal declined the authorization. Ask the buyer to choose another way to pay.", debug_id: d, details: [{ issue: "PAYMENT_DECLINED" }] });
    }
  }
  if (!auth || !["CREATED", "PENDING", "CAPTURED", "PARTIALLY_CAPTURED"].includes(auth.status))
    throw new CartHttpError(422, { name: "UNPROCESSABLE_ENTITY", message: `PayPal authorization is ${auth?.status ?? "missing"}.`, details: [{ issue: "PAYMENT_DECLINED" }] });

  // Record the hold once (the row lock in applyCheckoutEvent makes a concurrent repeat a no-op), take the stock once.
  const claimed = await db
    .update(schema.checkouts)
    .set({ paypalAuthorizationId: auth.id, authorizedAt: new Date(), authorizationExpiresAt: auth.expiration_time ? new Date(auth.expiration_time) : null, stockReservedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.checkouts.id, c.id), sql`${schema.checkouts.stockReservedAt} is null`))
    .returning({ id: schema.checkouts.id });
  if (claimed.length) await takeStock(c.id);
  const ap = await applyCheckoutEvent(c.id, "APPROVED", "capture_response", buyerDetails(authorized));
  const az = await applyCheckoutEvent(c.id, "AUTHORIZED", "capture_response", buyerDetails(authorized));
  const [done] = await db.update(schema.carts).set({ status: "COMPLETED", completedAt: new Date(), updatedAt: new Date() }).where(eq(schema.carts.id, cartId)).returning();
  if (az?.result.kind === "changed" || ap?.result.kind === "changed") {
    await recordEvent(db, {
      actor: "paypal",
      kind: "authorized",
      checkoutId: c.id,
      sellerId: store.id,
      summary: `Payment authorized · PayPal holds $${auth.amount?.value ?? centsToValue(c.totalCents)} · captured when the seller ships`,
      data: { orderId: c.paypalOrderId, authorizationId: auth.id, debugId, paypalRequestId: requestId, cartId },
    });
    await logCart(store, "cart_completed", `Cart API · POST /merchant-cart/{id}/checkout · COMPLETED · agent "${client}"`, cartId, c.id, {});
    void import("./telegram-bot").then((m) => m.pingOrderPaid(c.id)).catch((e) => console.error("[telegram] order ping failed", e instanceof Error ? e.message : e));
  }
  return view(done!);
}

/** The spec's PayPalCart for a stored cart, refreshed from its checkout (approval, expiry, completion). */
async function view(row: CartRow): Promise<PayPalCart & { payment_confirmation?: { merchant_order_number?: string; order_review_page?: string } }> {
  const { db } = services();
  const req = row.request as Writable;
  const ev = { issues: row.issues as unknown as ValidationIssue[] };
  const t = row.totals as { subtotal?: number; shipping?: number };
  const [c] = row.checkoutId ? await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, row.checkoutId)) : [];
  const lines = c ? await db.select().from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, c.id)) : [];
  const status = c?.status as CheckoutStatus | undefined;
  let cartStatus = row.status as NonNullable<PayPalCart["status"]>;
  const issues = [...ev.issues];
  if (status === "cancelled" && row.status !== "COMPLETED") {
    cartStatus = "INCOMPLETE";
    issues.push({ code: "PAYMENT_ERROR", type: "BUSINESS_RULE", message: "the PayPal order expired or was cancelled", user_message: "The payment window closed. Nothing was charged.", context: { specific_issue: "PAYMENT_EXPIRED" }, resolution_options: [opt("MODIFY_CART", "PUT the cart again for a new order")] });
  } else if (status === "approved" && row.status === "CREATED") cartStatus = "READY";
  const subtotal = c ? c.itemTotalCents : (t.subtotal ?? 0);
  const shipping = c ? c.shippingCents : (t.shipping ?? 0);
  const tax = c ? c.taxCents : 0;
  const items: CartItem[] = lines.length
    ? lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity, name: l.titleSnapshot, price: money(l.unitPriceCents) }))
    : (req.items ?? []).map((i) => ({ variant_id: i.variant_id ?? i.item_id, quantity: i.quantity, ...(i.name ? { name: i.name } : {}) }));
  const token = c ? newOrderToken(c.id, c.clientRequestId) : undefined;
  return {
    id: row.id,
    status: cartStatus,
    validation_status: cartStatus === "INCOMPLETE" && issues.length && row.validationStatus === "VALID" ? "INVALID" : (row.validationStatus as Validation),
    validation_issues: issues,
    totals: { subtotal: money(subtotal), shipping: money(shipping), tax: money(tax), total: money(c ? c.totalCents : subtotal + shipping) },
    items,
    ...(req.customer ? { customer: req.customer as PayPalCart["customer"] } : {}),
    ...(req.shipping_address ? { shipping_address: req.shipping_address as PayPalCart["shipping_address"] } : {}),
    ...(c?.paypalOrderId && cartStatus !== "INCOMPLETE" ? { payment_method: { type: "paypal" as const, token: c.paypalOrderId, ...(c.approveUrl && row.status !== "COMPLETED" ? { approval_url: c.approveUrl } : {}) } } : {}),
    ...(row.status === "COMPLETED" && c && token ? { payment_confirmation: { merchant_order_number: c.id, order_review_page: appUrl(`/pay/${c.id}?t=${token}`) } } : {}),
  };
}

// ---------- after checkout: capture on ship, release the hold ----------

/** The seller ships an authorized order: capture the hold first (D-098). Called by addTracking. */
export async function captureOnShip(checkoutId: string) {
  const { db, paypal } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c?.paypalAuthorizationId) throw new ShopError("VALIDATION_ERROR", "This order has no PayPal hold to capture.");
  const requestId = `capture-auth-${checkoutId}`;
  try {
    const { data: cap, debugId } = await paypal.captureAuthorization(c.paypalAuthorizationId, requestId, { context: { checkoutId } });
    await settleAuthorizationCapture(checkoutId, cap, { debugId, requestId, authorizationId: c.paypalAuthorizationId });
    return cap;
  } catch (e) {
    if (!isPayPalApiError(e)) throw e;
    await recordEvent(db, { actor: "paypal", kind: "capture_failed", checkoutId, sellerId: c.sellerId, summary: `Capture on ship failed (${e.issue}) · the hold was not captured`, data: { debugId: e.debugId, paypalRequestId: requestId, authorizationId: c.paypalAuthorizationId } });
    throw new ShopError("UPSTREAM_ERROR", `PayPal didn't capture the hold (${e.issue}). If it expired, the buyer needs to pay again.`, { debug_id: e.debugId });
  }
}

/** PayPal no longer holds the money (voided here, by the seller in PayPal, or by the webhook): close the order once. */
export async function releaseHold(checkoutId: string, via: "seller" | "webhook" | "system") {
  const r = await applyCheckoutEvent(checkoutId, "AUTHORIZATION_VOIDED", via === "seller" ? "seller" : via === "webhook" ? "webhook" : "system");
  const changed = r?.result.kind === "changed";
  if (changed && r.checkout.stockReservedAt) await returnStock(checkoutId);
  return { changed };
}

/**
 * The seller cancels an authorized order before shipping. Platform-paid: we void the hold. Direct-paid: PayPal refuses
 * our void (Spike C, C6), so the seller releases it in their own PayPal (a handoff, like refunds, D-083); the
 * PAYMENT.AUTHORIZATION.VOIDED webhook then closes the order.
 */
export async function cancelAuthorized(sellerId: string, checkoutId: string) {
  const { db, paypal } = services();
  const [c] = await db.select().from(schema.checkouts).where(and(eq(schema.checkouts.id, checkoutId), eq(schema.checkouts.sellerId, sellerId)));
  if (!c) throw new ShopError("NOT_FOUND", "Order not found.");
  if (c.status !== "authorized" || !c.paypalAuthorizationId) throw new ShopError("VALIDATION_ERROR", `Order is ${c.status}; only an authorized order can be cancelled this way.`);
  if (c.payeeEmail || c.payeeMerchantId) {
    const link = refundHandoffLink(env().PAYPAL_BASE_URL, c.paypalAuthorizationId);
    await recordEvent(db, { actor: "server", kind: "void_handoff", checkoutId, sellerId, summary: "Hold handed to the seller · release it in your PayPal · 0 void calls from Shopfront", data: { authorizationId: c.paypalAuthorizationId, link } });
    return { outcome: "handoff" as const, link };
  }
  const requestId = `void-${checkoutId}`;
  try {
    const { debugId } = await paypal.voidAuthorization(c.paypalAuthorizationId, requestId, { context: { checkoutId } });
    await releaseHold(checkoutId, "seller");
    await recordEvent(db, { actor: "paypal", kind: "authorization_voided", checkoutId, sellerId, summary: "Hold released · order cancelled before shipping · nothing charged", data: { authorizationId: c.paypalAuthorizationId, debugId, paypalRequestId: requestId } });
    return { outcome: "voided" as const };
  } catch (e) {
    if (!isPayPalApiError(e)) throw e;
    throw new ShopError("UPSTREAM_ERROR", `PayPal didn't release the hold (${e.issue}).`, { debug_id: e.debugId });
  }
}

/** The stores that may hand out short-lived demo tokens to anyone (judges): the seeded demo shops only. */
export const DEMO_TOKEN_STORES = ["juniper_clay", "fern_and_loom", "judge_demo"] as const;

export async function storeByHandle(handle: string) {
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.handle, handle));
  return s ?? null;
}
