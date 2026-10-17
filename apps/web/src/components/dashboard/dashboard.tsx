"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgStudio, createWidgets } from "ag-studio-react";
import { AgStudioAiModule, AgStudioLicenseManager, AgStudioModuleRegistry, createAiHarness, directLlmRunner, type AgAiParamsBuilder, type AgAiToolContext, type AgStudioApi } from "ag-studio";
import type { ShopEvent } from "@/server/events";
import { shopfrontLlmAdapter } from "@/components/studio/llm-adapter";
import { PRESET_VERSION, presetState, spikeAlertWidget } from "./preset";
import { makeStudioTheme } from "./theme";
import { LedgerWidget, RefundQueueWidget, TimelineWidget, useLiveEvents } from "./widgets";

AgStudioModuleRegistry.registerModules([AgStudioAiModule]);
if (process.env.NEXT_PUBLIC_AG_LICENSE_KEY) AgStudioLicenseManager.setLicenseKey(process.env.NEXT_PUBLIC_AG_LICENSE_KEY);

type Sources = { orders: Record<string, unknown>[]; lines: Record<string, unknown>[]; refunds: Record<string, unknown>[] };

const custom = (id: string, label: string, comp: unknown, width: number, height: number, description: string) => ({
  id,
  label,
  comp,
  form: (p: { createDefaults: (o: unknown) => unknown }) => p.createDefaults({ dataMappingItems: [] }),
  defaultSize: { width, height },
  minSize: { width: 280, height: 200 },
  ai: { label, description },
});

// Shopfront's widgets beside Studio's own (D-023): the live wire, the refund queue and the editable ledger.
const widgets = (defaults: { menu: Array<{ label: string; widgetIds: readonly string[] }> }) =>
  createWidgets({
    additionalTypes: [
      custom("shopfront-timeline", "Live agent timeline", TimelineWidget, 420, 520, "Live feed of agent, MCP, PayPal and webhook events with real request ids."),
      custom("shopfront-refunds", "Refund queue", RefundQueueWidget, 340, 420, "Refund requests waiting for the seller, with one-tap approve or decline."),
      custom("shopfront-ledger", "Order ledger", LedgerWidget, 900, 420, "All paid orders grouped by product, with editable note and ship-by date."),
    ],
    menu: [{ label: "Shopfront", widgetIds: ["shopfront-timeline", "shopfront-refunds", "shopfront-ledger"] }, ...defaults.menu],
  } as never);

// Field definitions: readable names and money as USD (data comes from dashboardData()).
const usd = { format: "currencyFormat", formatOptions: { format: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }) } };
const text = (id: string, name: string) => ({ id, name, format: "textFormat" });
const ORDER_FIELDS = [
  text("order", "Order"),
  { id: "date", name: "Date", format: "dateFormat" },
  text("status", "Status"),
  text("product", "Product"),
  { id: "items", name: "Items", format: "integerFormat" },
  { id: "total_usd", name: "Total", ...usd },
  { id: "refunded_usd", name: "Refunded", ...usd },
  text("buyer_country", "Buyer country"),
  text("confirmed_via", "Confirmed via"),
  text("shipped", "Shipped"),
  text("ship_by", "Ship by"),
  text("note", "Note"),
  text("paypal_order", "PayPal order"),
];
const LINE_FIELDS = [
  text("order", "Order"),
  { id: "date", name: "Date", format: "dateFormat" },
  text("product", "Product"),
  text("sku", "SKU"),
  { id: "quantity", name: "Quantity", format: "integerFormat" },
  { id: "revenue_usd", name: "Revenue", ...usd },
];
const REFUND_FIELDS = [
  text("refund", "Refund request"),
  text("order", "Order"),
  { id: "date", name: "Date", format: "dateFormat" },
  text("product", "Product"),
  text("reason", "Reason"),
  text("decision", "Decision"),
  text("status", "Status"),
  { id: "amount_usd", name: "Amount", ...usd },
];

const INSIGHTS_INSTRUCTIONS = [
  "You are Shopfront's insights agent for a one-person shop. You answer questions about sales and refunds and you build dashboard views.",
  "For any sales or refund question, call BOTH db_sales_summary (real-time, our database) and paypal_transactions (PayPal Transaction Search, can lag about 3 hours) for the same range, then answer with figures from each, labelled in brackets: [db] or [paypal]. If they differ, say PayPal lags and today's sales may not be there yet.",
  "Dates: today is " + new Date().toISOString().slice(0, 10) + "; 'this week' means the last 7 days.",
  "Questions (what sold, how much, how many, which product, did anything...) are sales questions, not dashboard requests: call both tools and answer in text with the figures. Never answer a question only by adding a chart.",
  "Requests to show, chart, plot, add or track something are dashboard requests: never answer them with text or a table.",
  "For a chart or a single number, call add_chart (it builds a fully configured widget with its own date filter). For anything else about the layout, delegate to the page agent. Then reply in one sentence naming the title of what was added. Never write a widget type id (such as column-chart-grouped) in a reply to the seller.",
  "Quote the date range the tools return; never guess the year.",
  "If you delegate, brief the page agent like this: widget type (for example column-chart-grouped), the data source and fields, the aggregation, an optional date filter on that widget only (a widget filter, never a page filter, so other widgets are unaffected), and a title. Example: 'Add a column-chart-grouped titled Refunds by product this week: category refunds.product, value sum of refunds.amount_usd, widget filter refunds.date to the last 7 days.'. Data sources: lines(product, date, quantity, revenue_usd), orders(order, date, status, total_usd, refunded_usd, buyer_country), refunds(refund, date, product, reason, decision, status, amount_usd).",
  "You can only change views and widgets. You cannot change orders, prices or refunds, and you never claim to.",
  "Be brief.",
].join("\n");

export function SellerDashboard({ initialData, savedState }: { initialData: Sources; savedState: unknown }) {
  const [data, setData] = useState(initialData);
  const apiRef = useRef<AgStudioApi | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [alert, setAlert] = useState<string | null>(null);
  // Edit mode by default on wide screens (Studio shows its AI assistant only there); phones open in view mode,
  // where the dashboard itself fits. The toggle switches either way. (Client-only component: window exists.)
  const [editing, setEditing] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);

  const sources = useMemo(
    () => ({
      sources: [
        { id: "orders", name: "Orders", data: data.orders, fields: ORDER_FIELDS },
        { id: "lines", name: "Order lines", data: data.lines, fields: LINE_FIELDS },
        { id: "refunds", name: "Refunds", data: data.refunds, fields: REFUND_FIELDS },
      ],
    }),
    [data],
  );
  const theme = useMemo(() => makeStudioTheme(), []);

  // One save path for every layout change: Studio's own UI and agents (onStateUpdated) and our programmatic
  // setState calls (add_chart, the refund-spike alert), which Studio does not report.
  const persist = useCallback((state?: unknown) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const s = state ?? apiRef.current?.getState();
      if (s) void fetch("/api/seller/dashboard/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: { preset: PRESET_VERSION, state: s } }) });
    }, 1200);
  }, []);
  const applyState = useCallback(
    (state: unknown) => {
      apiRef.current?.setState(state as never);
      persist();
    },
    [persist],
  );

  // Live: refetch the data sources when an order or refund changes; the refund-spike rule adds its alert widget.
  const refetch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onEvent = useCallback((e: ShopEvent) => {
    if (e.kind === "refund_spike" && Date.now() - new Date(e.createdAt).getTime() < 10 * 60_000) {
      const api = apiRef.current;
      const d = e.data as { count: number; windowMinutes: number };
      if (api) {
        const state = api.getState() as typeof presetState;
        const page = state.pages.find((p) => p.id === state.selectedPageId) ?? state.pages[0]!;
        const id = `refund-spike-${e.id}`;
        if (!(page.widgets as Record<string, unknown>)[id]) {
          (page.widgets as Record<string, unknown>)[id] = spikeAlertWidget(d.count, d.windowMinutes);
          for (const l of Object.values(page.widgetLayout) as Array<{ yTrack: number }>) l.yTrack += 8;
          (page.widgetLayout as Record<string, unknown>)[id] = { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 8 };
          applyState(state);
          setAlert(`${d.count} refunds in ${d.windowMinutes} minutes`);
        }
      }
    }
    if (e.checkoutId || e.kind.startsWith("refund")) {
      clearTimeout(refetch.current);
      refetch.current = setTimeout(async () => {
        const r = await fetch("/api/seller/dashboard/data", { cache: "no-store" });
        if (r.ok) setData((await r.json()) as Sources);
      }, 600);
    }
  }, [applyState]);
  useLiveEvents(onEvent);

  useEffect(() => () => clearTimeout(saveTimer.current), []);


  return (
    <div className="relative h-full w-full" data-testid="dashboard" data-mode={editing ? "edit" : "view"}>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        aria-pressed={editing}
        className="absolute right-3 bottom-3 z-[var(--z-sticky)] inline-flex h-8 items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink shadow-[var(--shadow-float)] hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
        data-testid="toggle-layout"
      >
        {editing ? "Preview" : "Back to editing"}
      </button>
      {alert && (
        <p role="alert" className="sr-only">
          Refund spike: {alert}
        </p>
      )}
      <AgStudio
        data={sources as never}
        mode={editing ? "edit" : "view"}
        theme={theme as never}
        widgets={widgets as never}
        initialState={(savedState ?? presetState) as never}
        onApiReady={(e: { api: AgStudioApi }) => {
          apiRef.current = e.api;
          // Handles for acceptance tests (AT-5): read the report state; apply a layout change the way the UI does.
          (window as unknown as { __shopfrontStudio?: AgStudioApi }).__shopfrontStudio = e.api;
          (window as unknown as { __shopfrontApplyState?: (s: unknown) => void }).__shopfrontApplyState = (st) => applyState(st);
        }}
        onStateUpdated={(e: { state?: unknown }) => persist(e.state)}
        ai={(params: { api: AgStudioApi }) =>
          createAiHarness(params.api, ({ tools, builtIn }) => {
            const insights = directLlmRunner({
              id: "insights",
              name: "Shopfront",
              description: "Answers questions about sales and refunds, and builds dashboard views.",
              instructions: () => INSIGHTS_INSTRUCTIONS,
              tools: (ctx) => [
                ctx.api.defineAiTool({
                  name: "db_sales_summary",
                  description: "Real-time sales and refunds from the Shopfront database for a date range (ISO 8601). Source label: db.",
                  params: (s: AgAiParamsBuilder) => s.object({ from: s.string({ description: "ISO 8601 start" }), to: s.string({ description: "ISO 8601 end" }) }),
                  execute: async (args: { from: string; to: string }, c: AgAiToolContext) => insight(c, "db_sales_summary", args),
                } as never),
                ctx.api.defineAiTool({
                  name: "paypal_transactions",
                  description: "Sales and refunds from PayPal Transaction Search for a date range of up to 31 days (ISO 8601). May lag about 3 hours. Source label: paypal.",
                  params: (s: AgAiParamsBuilder) => s.object({ from: s.string({ description: "ISO 8601 start" }), to: s.string({ description: "ISO 8601 end" }) }),
                  execute: async (args: { from: string; to: string }, c: AgAiToolContext) => insight(c, "paypal_transactions", args),
                } as never),
                ctx.api.defineAiTool({
                  name: "add_chart",
                  description:
                    "Add a fully configured chart or KPI to the dashboard. Sources and fields: orders(order, date, status, product, items, total_usd, refunded_usd, buyer_country), lines(order, date, product, sku, quantity, revenue_usd), refunds(refund, order, date, product, reason, decision, status, amount_usd).",
                  params: (s: AgAiParamsBuilder) =>
                    s.object({
                      title: s.string({ description: "Widget title, e.g. Refunds by product · last 7 days" }),
                      chart: s.enum(CHART_TYPES, { description: "column-chart-grouped, bar-chart-grouped or line-chart; value for a single KPI number" }),
                      source: s.enum(["orders", "lines", "refunds"] as const),
                      category: s.string({ description: "Field to group by (ignored for value)" }).optional(),
                      value: s.string({ description: "Field to measure" }),
                      aggregation: s.enum(["sum", "count", "avg"] as const),
                      last_days: s.number({ description: "Only the last N days (widget filter); omit for all" }).optional(),
                    }),
                  execute: async (a: ChartArgs, c: AgAiToolContext) => addChart(ctx.api, a, c, (st) => applyState(st)),
                } as never),
                ctx.studio.viewReport(),
                tools.delegateTo(["page"]),
              ],
              adapter: shopfrontLlmAdapter,
              maxTurns: 8,
            });
            const run = (def: object) => directLlmRunner(Object.assign({}, def, { adapter: shopfrontLlmAdapter }) as never);
            return {
              agents: [insights, run(builtIn.page), run(builtIn.widget), run(builtIn.data)],
              primary: "insights",
              promptStarters: [
                { label: "What sold this week?", prompt: "What sold this week?" },
                { label: "Refunds by product", prompt: "Show refunds by product this week" },
              ],
            } as never;
          }) as never
        }
        style={{ height: "100%", width: "100%" }}
      />
    </div>
  );
}

const CHART_TYPES = ["column-chart-grouped", "bar-chart-grouped", "line-chart", "value"] as const;
const SOURCE_FIELDS: Record<string, string[]> = {
  orders: ORDER_FIELDS.map((f) => f.id),
  lines: LINE_FIELDS.map((f) => f.id),
  refunds: REFUND_FIELDS.map((f) => f.id),
};
type ChartArgs = { title: string; chart: (typeof CHART_TYPES)[number]; source: "orders" | "lines" | "refunds"; category?: string; value: string; aggregation: "sum" | "count" | "avg"; last_days?: number };
type ReportState = {
  pages: Array<{
    id: string;
    widgets: Record<string, unknown>;
    widgetLayout: Record<string, { xTrack: number; yTrack: number; xSpan: number; ySpan: number }>;
    filter?: { page?: unknown[]; widget?: Record<string, unknown[]> };
  }>;
  selectedPageId: string;
};

/**
 * Deterministic widget builder for the insights agent: the model chooses fields from a closed list, this code writes
 * a complete widget (data mapping, widget-level date filter) into the report state at the top of the page.
 */
function addChart(api: AgStudioApi, a: ChartArgs, c: AgAiToolContext, apply: (state: unknown) => void) {
  const fields = SOURCE_FIELDS[a.source] ?? [];
  const bad = [a.value, a.chart === "value" ? undefined : a.category].filter((f): f is string => f !== undefined && !fields.includes(f));
  if (a.chart !== "value" && !a.category) bad.push("(category missing)");
  if (bad.length) return c.error(`Unknown field(s) for ${a.source}: ${bad.join(", ")}. Use: ${fields.join(", ")}.`) as never;
  const state = api.getState() as unknown as ReportState;
  const page = state.pages.find((p) => p.id === state.selectedPageId) ?? state.pages[0]!;
  const id = `ai-${a.source}-${Date.now().toString(36)}`;
  const value = [{ id: `${a.source}.${a.value}`, aggregation: a.aggregation }];
  page.widgets[id] =
    a.chart === "value"
      ? { type: "value", dataMapping: { value }, format: { title: { enabled: true, text: a.title, typography: { fontSize: 13, fontWeight: "bold" } } } }
      : { type: a.chart, dataMapping: { categoryKey: [{ id: `${a.source}.${a.category}` }], valueKey: value }, format: { title: { enabled: true, text: a.title, typography: { fontSize: 13, fontWeight: "bold" } } } };
  const height = a.chart === "value" ? 7 : 22;
  for (const l of Object.values(page.widgetLayout)) l.yTrack += height;
  page.widgetLayout[id] = { xTrack: 0, yTrack: 0, xSpan: a.chart === "value" ? 6 : 12, ySpan: height };
  if (a.last_days && a.last_days > 0) {
    page.filter = { ...page.filter, widget: { ...(page.filter?.widget ?? {}), [id]: [{ field: { id: `${a.source}.date` }, model: { operator: "inRelativeRange", value: { type: "last", unit: "day", value: Math.round(a.last_days) } } }] } };
  }
  apply(state);
  return c.success(`Added widget ${id} ("${a.title}") at the top of the dashboard.`, { widgetId: id }) as never;
}

async function insight(c: AgAiToolContext, tool: string, args: { from: string; to: string }) {
  const r = await fetch("/api/seller/insights", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool, args }) });
  const out = await r.json().catch(() => ({}));
  return (r.ok ? c.success(JSON.stringify(out), out) : c.error(out.error?.message ?? "Tool failed.")) as never;
}
