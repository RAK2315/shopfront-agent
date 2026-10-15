// PRICING ENGINE (D-002). Pure function over DB rows. The only place totals are computed.
// Inputs are variant ids + quantities; prices come exclusively from `variants` loaded from our DB.
import { centsToValue, sumCents, type Currency } from './money';
import { ShopError } from './errors';

export interface PricedVariant {
  id: string;
  productId: string;
  sellerId: string;
  sku: string;
  title: string; // product title snapshot
  options: Record<string, string>;
  priceCents: number;
  currency: Currency;
  stock: number;
  active: boolean;
  productStatus: 'draft' | 'approved' | 'archived';
}

export interface SellerPricing {
  id: string;
  brandName: string;
  flatShippingCents: number;
  currency: Currency;
}

export interface QuoteLine {
  variantId: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CheckoutQuote {
  sellerId: string;
  currency: Currency;
  lines: QuoteLine[];
  itemTotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
}

export const MAX_QTY_PER_LINE = 10;
export const MAX_LINES = 10;

export function quoteCheckout(
  items: ReadonlyArray<{ variant_id: string; quantity: number }>,
  variants: ReadonlyMap<string, PricedVariant>,
  sellers: ReadonlyMap<string, SellerPricing>,
): CheckoutQuote {
  if (items.length === 0) throw new ShopError('VALIDATION_ERROR', 'At least one item is required.');

  // Merge duplicate variant lines so "2 × A" and "1 × A" become "3 × A".
  const merged = new Map<string, number>();
  for (const it of items) merged.set(it.variant_id, (merged.get(it.variant_id) ?? 0) + it.quantity);
  if (merged.size > MAX_LINES) throw new ShopError('VALIDATION_ERROR', `At most ${MAX_LINES} different items.`);

  const lines: QuoteLine[] = [];
  let sellerId: string | undefined;
  let currency: Currency | undefined;

  for (const [variantId, quantity] of merged) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) {
      throw new ShopError('VALIDATION_ERROR', `Quantity for ${variantId} must be 1-${MAX_QTY_PER_LINE}.`, { variant_id: variantId });
    }
    const v = variants.get(variantId);
    if (!v || !v.active || v.productStatus !== 'approved') {
      throw new ShopError('NOT_FOUND', `Variant ${variantId} is not available.`, { variant_id: variantId });
    }
    if (sellerId && v.sellerId !== sellerId) {
      throw new ShopError('MULTI_SELLER', 'All items in one checkout must come from the same seller.');
    }
    if (currency && v.currency !== currency) {
      throw new ShopError('VALIDATION_ERROR', 'Mixed currencies are not supported.');
    }
    if (v.stock < quantity) {
      throw new ShopError('OUT_OF_STOCK', `Only ${Math.max(v.stock, 0)} left of ${v.title}.`, {
        variant_id: variantId,
        available: Math.max(v.stock, 0),
      });
    }
    sellerId = v.sellerId;
    currency = v.currency;
    lines.push({
      variantId,
      sku: v.sku,
      title: v.title,
      options: v.options,
      quantity,
      unitPriceCents: v.priceCents,
      lineTotalCents: v.priceCents * quantity,
    });
  }

  const seller = sellers.get(sellerId!);
  if (!seller) throw new ShopError('NOT_FOUND', 'Seller not found.');
  if (seller.currency !== currency) throw new ShopError('VALIDATION_ERROR', 'Seller currency mismatch.');

  const itemTotalCents = sumCents(lines.map((l) => l.lineTotalCents));
  const shippingCents = seller.flatShippingCents;
  const taxCents = 0; // sandbox demo: no tax engine (stated in README)
  return {
    sellerId: seller.id,
    currency: currency!,
    lines,
    itemTotalCents,
    shippingCents,
    taxCents,
    totalCents: itemTotalCents + shippingCents + taxCents,
  };
}

/** Full refund = everything still refundable. Partial = item lines only (shipping is not refunded). */
export function refundAmountForItems(
  purchased: ReadonlyArray<Pick<QuoteLine, 'variantId' | 'quantity' | 'unitPriceCents'>>,
  requested: ReadonlyArray<{ variant_id: string; quantity: number }> | undefined,
  remainingRefundableCents: number,
): number {
  if (!requested || requested.length === 0) return remainingRefundableCents;
  let cents = 0;
  for (const r of requested) {
    const line = purchased.find((p) => p.variantId === r.variant_id);
    if (!line) throw new ShopError('VALIDATION_ERROR', `Item ${r.variant_id} is not in this order.`);
    if (r.quantity > line.quantity) throw new ShopError('VALIDATION_ERROR', `Cannot refund more than ${line.quantity} of ${r.variant_id}.`);
    cents += line.unitPriceCents * r.quantity;
  }
  return Math.min(cents, remainingRefundableCents);
}

// ---------- PayPal Orders v2 payload ----------
// Built only from a CheckoutQuote. Verify field names with the PayPal AI Toolkit before Phase 1 sign-off.

export interface OrderPayloadOptions {
  checkoutId: string;
  brandName: string;
  returnUrl: string;
  cancelUrl: string;
}

export function buildPayPalOrderRequest(q: CheckoutQuote, o: OrderPayloadOptions) {
  const amt = (cents: number) => ({ currency_code: q.currency, value: centsToValue(cents) });
  return {
    intent: 'CAPTURE' as const,
    purchase_units: [
      {
        reference_id: o.checkoutId,
        custom_id: o.checkoutId,
        amount: {
          ...amt(q.totalCents),
          breakdown: {
            item_total: amt(q.itemTotalCents),
            shipping: amt(q.shippingCents),
            tax_total: amt(q.taxCents),
          },
        },
        items: q.lines.map((l) => ({
          name: truncate(l.title, 127),
          description: truncate(optionsLabel(l.options), 127) || undefined,
          sku: l.sku,
          quantity: String(l.quantity),
          unit_amount: amt(l.unitPriceCents),
          category: 'PHYSICAL_GOODS' as const,
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: truncate(o.brandName, 127),
          shipping_preference: 'GET_FROM_FILE' as const,
          user_action: 'PAY_NOW' as const,
          return_url: o.returnUrl,
          cancel_url: o.cancelUrl,
        },
      },
    },
  };
}

export function optionsLabel(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}
