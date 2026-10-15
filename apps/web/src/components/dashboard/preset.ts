// Default seller dashboard (AG Studio report state). Saved layouts override it per seller.
// Grid: 24 columns, 16 px rows. Field ids are "<source>.<field>" from dashboardData().
export const PRESET_VERSION = "shopfront-dashboard-v2";

// Quiet titles, prominent numbers: the console register (DESIGN.md).
const title = (text: string) => ({ title: { enabled: true, text, typography: { fontSize: 13, fontWeight: "bold" as const } } });
const kpi = (text: string) => ({ ...title(text), style: { typography: { fontSize: 30, fontWeight: "bold" as const } } });

// Our preset version is stored beside Studio's state (sellers.dashboard_state = { preset, state }), never inside it:
// Studio's own `version` field is its state-schema version.
export const presetState = {
  selectedPageId: "overview",
  panels: { filters: { collapsed: true }, data: { collapsed: true }, compose: { collapsed: true } },
  pages: [
    {
      id: "overview",
      widgets: {
        revenue: { type: "value", dataMapping: { value: [{ id: "orders.total_usd", aggregation: "sum" }] }, format: kpi("Revenue · 90 days") },
        orders: { type: "value", dataMapping: { value: [{ id: "orders.order", aggregation: "count" }] }, format: kpi("Orders") },
        refunded: { type: "value", dataMapping: { value: [{ id: "orders.refunded_usd", aggregation: "sum" }] }, format: kpi("Refunded") },
        refundRequests: { type: "value", dataMapping: { value: [{ id: "refunds.refund", aggregation: "count" }] }, format: kpi("Refund requests") },
        timeline: { type: "shopfront-timeline", dataMapping: {} },
        byProduct: {
          type: "column-chart-grouped",
          dataMapping: { categoryKey: [{ id: "lines.product" }], valueKey: [{ id: "lines.revenue_usd", aggregation: "sum" }] },
          format: title("Revenue by product"),
        },
        refundQueue: { type: "shopfront-refunds", dataMapping: {} },
        ledger: { type: "shopfront-ledger", dataMapping: {} },
      },
      widgetLayout: {
        revenue: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 7 },
        orders: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 7 },
        refunded: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 7 },
        refundRequests: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 7 },
        timeline: { xTrack: 0, yTrack: 7, xSpan: 9, ySpan: 26 },
        byProduct: { xTrack: 9, yTrack: 7, xSpan: 8, ySpan: 26 },
        refundQueue: { xTrack: 17, yTrack: 7, xSpan: 7, ySpan: 26 },
        ledger: { xTrack: 0, yTrack: 33, xSpan: 24, ySpan: 24 },
      },
    },
  ],
};

/** The refund-spike alert (deterministic rule, D-052): a text widget with the explanation, pinned to the top. */
export function spikeAlertWidget(count: number, windowMinutes: number) {
  return {
    type: "text",
    dataMapping: {},
    format: {
      title: { text: "Refund spike" },
      style: {
        text: `${count} refunds in the last ${windowMinutes} minutes, above the alert threshold of 4. Check the products involved in the ledger before approving more; refunds inside your policy keep running automatically.`,
        color: "oklch(0.53 0.17 27)",
      },
    },
  };
}
