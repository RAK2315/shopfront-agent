// Default seller report (AG Studio state, Phase AG): five pages. Saved layouts override it per seller; bumping
// PRESET_VERSION resets every saved layout to this one. Grid: 24 columns, 16 px rows. Field ids are
// "<source>.<field>" from sources.ts; "calendar::day" is the shared calendar.
export const PRESET_VERSION = "shopfront-report-v3";

/** Studio state has no page names; the host owns them (our tab strip). */
export const PAGES = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "payments", label: "Payments & reconciliation" },
  { id: "inventory", label: "Inventory" },
  { id: "agents", label: "Agents & Cart API" },
] as const;

type Agg = "sum" | "avg" | "count" | "countd";
const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number) => ({ xTrack, yTrack, xSpan, ySpan });
const m = (id: string, aggregation: Agg) => ({ id, aggregation });
// Quiet titles, prominent numbers: the console register (DESIGN.md).
const title = (text: string) => ({ title: { enabled: true, text, typography: { fontSize: 13, fontWeight: "bold" as const } } });
const legend = { style: { theme: { common: { legend: { enabled: true } } } } };

/** A KPI tile: quiet title, large value, optional sparkline along `sparklineX` (Studio's Enterprise sparkline). */
const kpi = (text: string, value: { id: string; aggregation?: Agg }, sparklineX?: string) => ({
  type: "value",
  dataMapping: { value: [value], ...(sparklineX && { sparklineX: [{ id: sparklineX }] }) },
  format: { ...title(text), style: { typography: { fontSize: 28, fontWeight: "bold" as const } } },
});
const custom = (type: string) => ({ type, dataMapping: {} });

const overview = {
  id: "overview",
  widgets: {
    revenue: kpi("Revenue", m("orders.total_usd", "sum"), "calendar::day"),
    orders: kpi("Paid orders", m("orders.order", "count"), "calendar::day"),
    avgOrder: kpi("Average order", m("orders.total_usd", "avg")),
    refundRate: kpi("Refund rate", { id: "refundRate" }),
    // No default period: a relative period saved in state fails to apply on load in Studio 3.0 (boilerplate note).
    period: { type: "date-filter", dataMapping: { value: [{ id: "orders.date" }] }, format: { ...title("Period"), style: { filterType: "relative" } } },
    overTime: {
      type: "combo-chart-grouped-column-line",
      dataMapping: { categoryKey: [{ id: "calendar::day" }], valueKey: [m("orders.total_usd", "sum")], secondaryValueKey: [m("orders.order", "count")] },
      format: { ...title("Revenue (columns) and orders (line) by day"), ...legend },
    },
    channelMix: {
      type: "donut-chart",
      dataMapping: { categoryKey: [{ id: "orders.channel" }], valueKey: [m("orders.total_usd", "sum")] },
      format: { ...title("Revenue by channel"), style: { custom: { pieDataLabel: { enabled: true }, totalLabel: { enabled: true } } } },
    },
    wire: custom("shopfront-timeline"),
    byProduct: {
      type: "bar-chart-grouped",
      dataMapping: { categoryKey: [{ id: "lines.product" }], valueKey: [m("lines.revenue_usd", "sum")] },
      sort: [{ field: m("lines.revenue_usd", "sum"), direction: "desc" }],
      format: title("Revenue by product"),
    },
  },
  widgetLayout: {
    revenue: at(0, 0, 6, 8),
    orders: at(6, 0, 6, 8),
    avgOrder: at(12, 0, 6, 8),
    refundRate: at(18, 0, 6, 8),
    period: at(0, 8, 24, 7),
    overTime: at(0, 15, 16, 19),
    channelMix: at(16, 15, 8, 19),
    byProduct: at(0, 34, 14, 22),
    wire: at(14, 34, 10, 22),
  },
};

const orders = {
  id: "orders",
  widgets: {
    status: { type: "button-filter", dataMapping: { value: [{ id: "orders.status" }] }, format: { ...title("Status"), style: { dimensions: { height: 28, minWidth: 48 } } } },
    channel: { type: "button-filter", dataMapping: { value: [{ id: "orders.channel" }] }, format: { ...title("Channel"), style: { dimensions: { height: 28, minWidth: 48 } } } },
    grid: {
      type: "grid",
      dataMapping: {
        cols: [
          { id: "orders.date" },
          { id: "orders.order" },
          { id: "orders.product" },
          { id: "orders.status" },
          { id: "orders.channel" },
          { id: "orders.paid_to" },
          { id: "orders.buyer_country" },
          m("orders.total_usd", "sum"),
          m("orders.captured_usd", "sum"),
          m("orders.refunded_usd", "sum"),
        ],
      },
      sort: [{ field: { id: "orders.date" }, direction: "desc" }],
      format: title("Orders, newest first (filter with the buttons above)"),
    },
    ledger: custom("shopfront-ledger"),
  },
  widgetLayout: {
    status: at(0, 0, 14, 6),
    channel: at(14, 0, 10, 6),
    grid: at(0, 6, 24, 22),
    ledger: at(0, 28, 24, 24),
  },
};

const payments = {
  id: "payments",
  widgets: {
    reconcile: custom("shopfront-reconcile"),
    captured: kpi("Captured", m("orders.captured_usd", "sum")),
    refunded: kpi("Refunded", m("orders.refunded_usd", "sum")),
    refundGauge: {
      type: "radial-gauge",
      dataMapping: { value: [{ id: "refundRate" }] },
      format: { ...title("Refund rate · share of order value"), style: { scaleLabel: { min: 0, max: 1 }, label: { typography: { fontSize: 28, fontWeight: "bold" as const } } } },
    },
    reasons: {
      type: "donut-chart",
      dataMapping: { categoryKey: [{ id: "refunds.reason" }], valueKey: [m("refunds.amount_usd", "sum")] },
      format: { ...title("Refunds by reason"), style: { custom: { pieDataLabel: { enabled: true }, totalLabel: { enabled: true } } } },
    },
    paidTo: {
      type: "column-chart-stacked",
      dataMapping: { categoryKey: [{ id: "orders.channel" }], valueKey: [m("orders.total_usd", "sum")], legendKey: [{ id: "orders.paid_to" }] },
      format: { ...title("Where the money went, by channel"), ...legend },
    },
    queue: custom("shopfront-refunds"),
    refundGrid: {
      type: "grid",
      dataMapping: { cols: [{ id: "refunds.date" }, { id: "refunds.refund" }, { id: "refunds.product" }, { id: "refunds.reason" }, { id: "refunds.decision" }, { id: "refunds.status" }, m("refunds.amount_usd", "sum")] },
      sort: [{ field: { id: "refunds.date" }, direction: "desc" }],
      format: title("Refund requests"),
    },
  },
  widgetLayout: {
    reconcile: at(0, 0, 9, 21),
    captured: at(9, 0, 5, 8),
    refunded: at(14, 0, 5, 8),
    refundGauge: at(19, 0, 5, 21),
    reasons: at(9, 8, 10, 13),
    paidTo: at(0, 21, 12, 20),
    queue: at(12, 21, 12, 20),
    refundGrid: at(0, 41, 24, 20),
  },
};

const inventory = {
  id: "inventory",
  widgets: {
    variants: kpi("Live variants", m("listings.sku", "countd")),
    inStock: kpi("Units in stock", m("listings.stock", "sum")),
    sold: kpi("Units sold · 90 days", m("lines.quantity", "sum")),
    low: kpi("Variants low on stock", m("listings.sku", "countd")),
    stock: {
      type: "bar-chart-stacked",
      dataMapping: { categoryKey: [{ id: "listings.listing" }], valueKey: [m("listings.stock", "sum")], legendKey: [{ id: "listings.variant" }] },
      format: title("Stock by listing and variant"),
    },
    unitsSold: {
      type: "column-chart-grouped",
      dataMapping: { categoryKey: [{ id: "lines.product" }], valueKey: [m("lines.quantity", "sum")] },
      sort: [{ field: m("lines.quantity", "sum"), direction: "desc" }],
      format: title("Units sold by product"),
    },
    listings: {
      type: "grid",
      dataMapping: { cols: [{ id: "listings.listing" }, { id: "listings.variant" }, { id: "listings.sku" }, { id: "listings.status" }, { id: "listings.low_stock" }, m("listings.price_usd", "sum"), m("listings.stock", "sum")] },
      sort: [{ field: m("listings.stock", "sum"), direction: "asc" }],
      format: title("Listings, lowest stock first"),
    },
  },
  widgetLayout: {
    variants: at(0, 0, 6, 8),
    inStock: at(6, 0, 6, 8),
    sold: at(12, 0, 6, 8),
    low: at(18, 0, 6, 8),
    stock: at(0, 8, 12, 22),
    unitsSold: at(12, 8, 12, 22),
    listings: at(0, 30, 24, 20),
  },
  filter: { widget: { low: [{ field: { id: "listings.low_stock" }, model: { operator: "isIn", value: ["low"] } }] } },
};

const agents = {
  id: "agents",
  widgets: {
    funnel: custom("shopfront-cart-funnel"),
    attempts: kpi("Checkout attempts", m("attempts.attempt", "sum"), "calendar::day"),
    conversion: kpi("Conversion", { id: "conversionRate" }),
    carts: kpi("Cart API carts", m("carts.cart", "countd")),
    outcomes: {
      type: "column-chart-stacked",
      dataMapping: { categoryKey: [{ id: "attempts.channel" }], valueKey: [m("attempts.attempt", "sum")], legendKey: [{ id: "attempts.outcome" }] },
      format: { ...title("Checkout outcomes by channel"), ...legend },
    },
    pivot: {
      type: "pivot-grid",
      dataMapping: { rows: [{ id: "attempts.channel" }, { id: "attempts.agent" }], columns: [{ id: "attempts.outcome" }], values: [m("attempts.attempt", "sum")] },
      format: { ...title("Checkouts by agent and outcome"), style: { totalColumns: true, totalColumnsPlacement: "before", grandTotalRow: { enabled: true } } },
    },
  },
  widgetLayout: {
    funnel: at(0, 0, 10, 26),
    attempts: at(10, 0, 5, 8),
    conversion: at(15, 0, 5, 8),
    carts: at(20, 0, 4, 8),
    outcomes: at(10, 8, 14, 18),
    pivot: at(0, 26, 24, 22),
  },
};

// Our preset version is stored beside Studio's state (sellers.dashboard_state = { preset, state }), never inside it:
// Studio's own `version` field is its state-schema version.
export const presetState = {
  selectedPageId: "overview",
  // Panel ids: filters, edit (Compose), data, ai. Compose starts collapsed so the report gets the width.
  panels: { filters: { collapsed: true }, data: { collapsed: true }, edit: { collapsed: true } },
  pages: [overview, orders, payments, inventory, agents],
};

/** The refund-spike alert (deterministic rule, D-052): a text widget with the explanation, pinned to the top. */
export function spikeAlertWidget(count: number, windowMinutes: number) {
  return {
    type: "text",
    dataMapping: {},
    format: {
      title: { enabled: true, text: "Refund spike", typography: { fontSize: 13, fontWeight: "bold" as const } },
      style: {
        text: `${count} refunds in the last ${windowMinutes} minutes, above the alert threshold of 4. Check the products involved in the ledger before approving more; refunds inside your policy keep running automatically.`,
        color: "#b3261e",
        typography: { fontSize: 15 },
      },
    },
  };
}
