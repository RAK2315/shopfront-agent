// The AG Studio report's data model (Phase AG): one table per row type from dashboardData(), the joins between
// them, a shared calendar and the report's measures. Pattern credited to PayPal's AG Grid hackathon boilerplate
// (paypaldev/hackathon-paypal-ag-grid-boilerplate, app/dashboard/studio/data.ts).
import type { AgDataSourcesDefinition, AgExpressionFieldDefinition, AgRelationDefinition } from "ag-studio";

export type Row = Record<string, unknown>;
export type Sources = { orders: Row[]; lines: Row[]; refunds: Row[]; attempts: Row[]; listings: Row[]; carts: Row[] };

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd = (id: string, name: string) => ({ id, name, format: "currencyFormat", formatOptions: { format: usdFormat } });
const text = (id: string, name: string, hide?: boolean) => ({ id, name, format: "textFormat", ...(hide && { hide }) });
const int = (id: string, name: string, hide?: boolean) => ({ id, name, format: "integerFormat", ...(hide && { hide }) });
const date = (id: string, name: string) => ({ id, name, format: "dateFormat" });

export const ORDER_FIELDS = [
  text("order", "Order"),
  date("date", "Order date"),
  text("status", "Order status"),
  text("product", "Products in order"),
  int("items", "Items"),
  usd("total_usd", "Order total"),
  usd("captured_usd", "Captured"),
  usd("refunded_usd", "Refunded"),
  text("channel", "Channel"),
  text("agent", "Agent", true),
  text("paid_to", "Paid to"),
  text("buyer_country", "Buyer country"),
  text("confirmed_via", "Confirmed via"),
  text("shipped", "Shipped"),
  text("ship_by", "Ship by"),
  text("note", "Note"),
  text("paypal_order", "PayPal order id"),
];
export const LINE_FIELDS = [text("order", "Line order", true), date("date", "Line date"), text("product", "Product"), text("sku", "SKU"), int("quantity", "Units sold"), usd("revenue_usd", "Line revenue")];
export const REFUND_FIELDS = [
  text("refund", "Refund request"),
  text("order", "Refunded order", true),
  date("date", "Refund date"),
  text("product", "Refunded product"),
  text("reason", "Refund reason"),
  text("decision", "Decision"),
  text("status", "Refund status"),
  usd("amount_usd", "Refund amount"),
];
export const ATTEMPT_FIELDS = [
  text("order", "Checkout"),
  date("date", "Checkout date"),
  text("channel", "Checkout channel"),
  text("agent", "Buying agent"),
  text("outcome", "Outcome"),
  text("status", "Checkout status", true),
  usd("total_usd", "Checkout total"),
  int("converted", "Converted", true),
  int("attempt", "Attempt", true),
];
export const LISTING_FIELDS = [text("listing", "Listing"), text("variant", "Variant"), text("sku", "Listing SKU"), text("status", "Listing status"), usd("price_usd", "Price"), int("stock", "Stock"), text("low_stock", "Stock level")];
export const CART_FIELDS = [text("cart", "Cart"), date("date", "Cart date"), text("agent", "Cart agent"), text("status", "Cart status"), text("validation", "Cart validation"), text("issue", "First issue"), text("order", "Cart checkout", true)];

const CALENDAR = "calendar";
const manyToOne = (id: string, source: string, target: string): AgRelationDefinition => {
  const [st, sf] = source.split(".") as [string, string];
  const [tt, tf] = target.split(".") as [string, string];
  return { id, source: { tableId: st, fieldId: sf }, target: { tableId: tt, fieldId: tf }, type: "many-to-one" };
};
const onCalendar = (tableId: string): AgRelationDefinition => ({ id: `${tableId}-date-calendar`, source: { tableId, fieldId: "date" }, target: { calendarId: CALENDAR } }) as AgRelationDefinition;
const ratio = (id: string, name: string, description: string, num: string, den: string): AgExpressionFieldDefinition =>
  ({ id, name, description, format: "percentageFormat", isMeasure: true, expression: { operator: "divide", inputs: [{ id: num, aggregation: "sum" }, { id: den, aggregation: "sum" }] } }) as AgExpressionFieldDefinition;

export function buildSources(data: Sources): AgDataSourcesDefinition {
  const today = new Date().toISOString().slice(0, 10);
  const dates = [...data.orders, ...data.attempts, ...data.carts].map((r) => r.date as string).filter(Boolean).sort();
  return {
    description:
      "One shop's last 90 days on Shopfront: orders paid through PayPal (sandbox), their lines and refunds, every checkout attempt by channel and buying agent, Cart API carts, and the listings with stock. Money is USD.",
    sources: [
      { id: "orders", name: "Orders", description: "Paid orders (and Cart API holds authorized at checkout, captured on ship). Refunded is what PayPal returned.", data: data.orders, fields: ORDER_FIELDS },
      { id: "lines", name: "Order lines", description: "One row per product in an order.", data: data.lines, fields: LINE_FIELDS },
      { id: "refunds", name: "Refunds", description: "Refund requests and what happened to them.", data: data.refunds, fields: REFUND_FIELDS },
      { id: "attempts", name: "Checkout attempts", description: "Every checkout opened, by channel and buying agent, with its outcome (paid, authorized, refunded, awaiting buyer, cancelled, declined).", data: data.attempts, fields: ATTEMPT_FIELDS },
      { id: "listings", name: "Listings", description: "Each listing variant with price and stock; stock level is low at 3 or fewer.", data: data.listings, fields: LISTING_FIELDS },
      { id: "carts", name: "Cart API carts", description: "Carts that AI agents built through PayPal's Cart API v1 contract, with their validation status.", data: data.carts, fields: CART_FIELDS },
    ],
    relationships: [
      manyToOne("line-order", "lines.order", "orders.order"),
      manyToOne("refund-order", "refunds.order", "orders.order"),
      onCalendar("orders"),
      onCalendar("lines"),
      onCalendar("refunds"),
      onCalendar("attempts"),
      onCalendar("carts"),
    ],
    calendars: [{ id: CALENDAR, label: "Calendar", range: { from: { type: "date", value: dates[0] ?? today }, to: { type: "date", value: today } }, fragments: ["year", "quarter", "month", "week", "day", "dayOfWeek"] }],
    expressions: [
      ratio("refundRate", "Refund rate", "Refunded / order total.", "orders.refunded_usd", "orders.total_usd"),
      ratio("conversionRate", "Conversion rate", "Checkouts that were paid or authorized / all checkout attempts.", "attempts.converted", "attempts.attempt"),
    ],
  } as AgDataSourcesDefinition;
}

/** Field ids per source, for the deterministic add_chart tool. */
export const SOURCE_FIELDS: Record<string, string[]> = {
  orders: ORDER_FIELDS.map((f) => f.id),
  lines: LINE_FIELDS.map((f) => f.id),
  refunds: REFUND_FIELDS.map((f) => f.id),
  attempts: ATTEMPT_FIELDS.map((f) => f.id),
  listings: LISTING_FIELDS.map((f) => f.id),
  carts: CART_FIELDS.map((f) => f.id),
};
