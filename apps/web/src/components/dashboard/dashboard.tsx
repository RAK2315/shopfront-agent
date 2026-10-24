"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sparkles, Undo2, X } from "lucide-react";
import { AgStudio, createWidgets } from "ag-studio-react";
import {
  AgStudioAiModule,
  AgStudioModuleRegistry,
  createAiHarness,
  directLlmRunner,
  type AgAiParamsBuilder,
  type AgAiTelemetryEvent,
  type AgAiToolContext,
  type AgStudioApi,
} from "ag-studio";
import type { ShopEvent } from "@/server/events";
import type { LicenseSimulation } from "@/lib/ag-license";
import { cn } from "@/lib/cn";
import { diffReport, type ReportLike } from "@/lib/report-diff";
import { Button } from "@/components/ui/button";
import { shopfrontLlmAdapter } from "@/components/studio/llm-adapter";
import { PAGES, PRESET_VERSION, presetState, spikeAlertWidget } from "./preset";
import { buildSources, SOURCE_FIELDS, type Sources } from "./sources";
import { checkStudioLicense } from "./studio-license";
import { StudioFallback } from "./studio-fallback";
import { makeStudioTheme } from "./theme";
import { CartFunnelWidget, LedgerWidget, ReconcileWidget, RefundQueueWidget, TimelineWidget, useLiveEvents } from "./widgets";

AgStudioModuleRegistry.registerModules([AgStudioAiModule]);

const custom = (id: string, label: string, comp: unknown, width: number, height: number, description: string) => ({
  id,
  label,
  comp,
  form: (p: { createDefaults: (o: unknown) => unknown }) => p.createDefaults({ dataMappingItems: [] }),
  defaultSize: { width, height },
  minSize: { width: 280, height: 200 },
  ai: { label, description },
});

// Shopfront's widgets beside Studio's own (D-023, Phase AG): each reads our own APIs and updates live.
const widgets = (defaults: { menu: Array<{ label: string; widgetIds: readonly string[] }> }) =>
  createWidgets({
    additionalTypes: [
      custom("shopfront-timeline", "Live agent timeline", TimelineWidget, 420, 520, "Live feed of agent, MCP, PayPal and webhook events with real request ids."),
      custom("shopfront-refunds", "Refund queue", RefundQueueWidget, 340, 420, "Refund requests waiting for the seller, with one-tap approve or decline."),
      custom("shopfront-ledger", "Order ledger", LedgerWidget, 900, 420, "All paid orders grouped by product, with editable note and ship-by date."),
      custom("shopfront-reconcile", "PayPal reconciliation", ReconcileWidget, 360, 420, "Whether every PayPal capture matches an order, with the sources checked and any mismatch."),
      custom("shopfront-cart-funnel", "Cart API funnel", CartFunnelWidget, 360, 420, "PayPal Cart API v1 carts built by agents: valid, approved, authorized, captured on ship."),
    ],
    menu: [{ label: "Shopfront", widgetIds: ["shopfront-timeline", "shopfront-refunds", "shopfront-ledger", "shopfront-reconcile", "shopfront-cart-funnel"] }, ...defaults.menu],
  } as never);

/** The report tab: AG Studio only with a valid licence (D-100); otherwise the Community overview and a notice. */
export function StudioReport(props: { initialData: Sources; savedState: unknown; licenseSim: LicenseSimulation }) {
  const [license] = useState(() => checkStudioLicense(props.licenseSim));
  if (!license.ok) return <StudioFallback reason={license.reason} />;
  return <SellerReport initialData={props.initialData} savedState={props.savedState} />;
}

const pageLabel = (id: string) => PAGES.find((p) => p.id === id)?.label ?? id;
type Strip = { changes: string[]; ai: boolean; undo: () => void; at: number } | null;
type ToolLog = { id: string; name: string; args: unknown; ok: boolean; result?: string };

function SellerReport({ initialData, savedState }: { initialData: Sources; savedState: unknown }) {
  const reduce = useReducedMotion();
  const [data, setData] = useState(initialData);
  const apiRef = useRef<AgStudioApi | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [alert, setAlert] = useState<string | null>(null);
  const initial = (savedState ?? presetState) as { selectedPageId?: string; pages: Array<{ id: string }> };
  const [page, setPage] = useState(initial.selectedPageId ?? "overview");
  const [pageIds, setPageIds] = useState(() => initial.pages.map((p) => p.id));
  // Edit mode by default on wide screens (Studio shows its AI assistant only there); phones open in view mode.
  const [editing, setEditing] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);
  // Review fix #5: every durable change is listed above the report, tagged AI when an agent made it, with Undo.
  const [strip, setStrip] = useState<Strip>(null);
  const last = useRef<ReportLike>(initial as ReportLike);
  const aiRun = useRef<{ before: ReportLike; history: Set<string> } | null>(null);

  const sources = useMemo(() => buildSources(data), [data]);
  const theme = useMemo(() => makeStudioTheme(), []);

  const persist = useCallback((state?: unknown) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const s = state ?? apiRef.current?.getState();
      if (s) void fetch("/api/seller/dashboard/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: { preset: PRESET_VERSION, state: s } }) });
    }, 1200);
  }, []);
  // Our own programmatic changes (add_chart, the refund-spike alert): Studio does not report setState calls.
  const applyState = useCallback(
    (state: unknown) => {
      apiRef.current?.setState(state as never);
      if (!aiRun.current) last.current = state as ReportLike;
      persist();
    },
    [persist],
  );

  // Studio's undo history is the signal for a real change: each one adds a labelled entry (setState included, as
  // "Edit"); Studio's own normalising of a freshly loaded state adds none.
  const seen = useRef<Set<string>>(new Set());
  const markSeen = useCallback((api: AgStudioApi) => {
    const fresh = api.getHistory().undo.filter((h) => !seen.current.has(h.id));
    for (const h of fresh) seen.current.add(h.id);
    return fresh;
  }, []);
  const restore = useCallback(
    (before: ReportLike, fromEntry?: string) => {
      const api = apiRef.current;
      if (!api) return;
      if (fromEntry) api.undo(fromEntry);
      // Safety net: if widgets are still not the ones before the change, put the snapshot back.
      const ids = (r: ReportLike) => JSON.stringify((r.pages ?? []).map((p) => [p.id, Object.keys(p.widgets ?? {}).sort()]));
      if (ids(api.getState() as ReportLike) !== ids(before)) api.setState(structuredClone(before) as never);
      last.current = api.getState() as ReportLike;
      persist();
      setStrip(null);
    },
    [persist],
  );

  // Agent runs (telemetry, synchronous): snapshot before the top-level run; list what it changed when it ends.
  const observer = useMemo(
    () => ({
      onEvent(e: AgAiTelemetryEvent) {
        const api = apiRef.current;
        if (!api) return;
        // Tool calls with their arguments and results, for the acceptance tests (figures are re-checked there).
        const w = window as unknown as { __shopManagerLog?: ToolLog[] };
        if (e.type === "tool_execution_started") (w.__shopManagerLog ??= []).push({ id: e.toolCallId, name: e.name, args: e.args, ok: false });
        if (e.type === "tool_execution_finished") {
          const t = w.__shopManagerLog?.find((x) => x.id === e.toolCallId);
          if (t) Object.assign(t, { ok: e.ok, result: e.result?.slice(0, 4000) });
        }
        if (e.trace.parentRunId) return;
        if (e.type === "run_started") {
          markSeen(api);
          aiRun.current = { before: structuredClone(api.getState()) as ReportLike, history: new Set(api.getHistory().undo.map((h) => h.id)) };
        } else if (e.type === "run_finished" && aiRun.current) {
          const { before, history } = aiRun.current;
          aiRun.current = null;
          const now = api.getState() as ReportLike;
          last.current = now;
          const fresh = markSeen(api);
          const changes = diffReport(before, now, pageLabel).filter((c) => !c.includes(": changed “") || fresh.length);
          if (!changes.length || !fresh.length) return;
          const first = api.getHistory().undo.find((h) => !history.has(h.id));
          setStrip({ changes, ai: true, at: Date.now(), undo: () => restore(before, first?.id) });
        }
      },
    }),
    [restore, markSeen],
  );

  // Live: refetch the data sources when an order or refund changes; the refund-spike rule adds its alert widget.
  const refetch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onEvent = useCallback(
    (e: ShopEvent) => {
      if (e.kind === "refund_spike" && Date.now() - new Date(e.createdAt).getTime() < 10 * 60_000) {
        const api = apiRef.current;
        const d = e.data as { count: number; windowMinutes: number };
        if (api) {
          const state = structuredClone(api.getState()) as typeof presetState;
          const pg = state.pages.find((p) => p.id === "overview") ?? state.pages[0]!;
          const id = `refund-spike-${e.id}`;
          if (!(pg.widgets as Record<string, unknown>)[id]) {
            (pg.widgets as Record<string, unknown>)[id] = spikeAlertWidget(d.count, d.windowMinutes);
            for (const l of Object.values(pg.widgetLayout) as Array<{ yTrack: number }>) l.yTrack += 8;
            (pg.widgetLayout as Record<string, unknown>)[id] = { xTrack: 0, yTrack: 0, xSpan: 24, ySpan: 8 };
            applyState(state);
            setAlert(`${d.count} refunds in ${d.windowMinutes} minutes`);
          }
        }
      }
      if (e.checkoutId || e.kind.startsWith("refund") || e.kind.startsWith("cart")) {
        clearTimeout(refetch.current);
        refetch.current = setTimeout(async () => {
          const r = await fetch("/api/seller/dashboard/data", { cache: "no-store" });
          if (r.ok) setData((await r.json()) as Sources);
        }, 600);
      }
    },
    [applyState],
  );
  useLiveEvents(onEvent);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  // Narrowing below 1024 px (a rotated tablet, a resized window) switches to view mode, which fits a phone.
  useEffect(() => {
    let wide = window.innerWidth >= 1024;
    const onResize = () => {
      const now = window.innerWidth >= 1024;
      if (wide && !now) setEditing(false);
      wide = now;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const goTo = (id: string) => {
    const api = apiRef.current;
    if (!api) return;
    setPage(id);
    api.setState({ ...api.getState(), selectedPageId: id } as never);
  };

  const tabs = [...PAGES.map((p) => p.id), ...pageIds.filter((id) => !PAGES.some((p) => p.id === id))].filter((id) => pageIds.includes(id));
  return (
    <div className="flex h-full min-w-0 flex-col gap-2" data-testid="dashboard" data-mode={editing ? "edit" : "view"} data-page={page}>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <nav aria-label="Report pages" className="min-w-0 flex-1 overflow-x-auto">
          <ul className="flex w-max gap-1 rounded-md bg-surface-2 p-1 text-sm font-medium">
            {tabs.map((id, i) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => goTo(id)}
                  aria-current={page === id ? "page" : undefined}
                  className={cn("whitespace-nowrap rounded-sm px-3 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-clay", page === id ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
                  data-testid={`report-page-${id}`}
                >
                  {PAGES.find((p) => p.id === id)?.label ?? `Page ${i + 1}`}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)} aria-pressed={editing} data-testid="toggle-layout" className="shrink-0">
          {editing ? "Preview" : "Edit layout"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {strip ? (
          <motion.div
            key={strip.at}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="flex shrink-0 flex-wrap items-start justify-between gap-3 rounded-md border border-clay/30 bg-clay-soft/60 px-3 py-2"
            data-testid="change-strip"
            data-source={strip.ai ? "ai" : "you"}
          >
            <div className="grid min-w-0 gap-0.5">
              <p className="text-sm font-semibold text-ink">
                {strip.ai ? (
                  <span className="mr-1.5 inline-flex items-center gap-1 rounded-sm bg-clay px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white" data-testid="change-ai-tag">
                    <Sparkles aria-hidden className="size-3" /> AI
                  </span>
                ) : null}
                {strip.ai ? "The Shop Manager changed the report" : "You changed the report"}
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-2">
                {strip.changes.slice(0, 6).map((c) => (
                  <li key={c} data-testid="change-item">
                    {c}
                  </li>
                ))}
                {strip.changes.length > 6 && <li>and {strip.changes.length - 6} more</li>}
              </ul>
              {strip.ai && <p className="text-xs text-muted">Views only: the Shop Manager has no tool that changes orders, money or stock.</p>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={strip.undo} data-testid="change-undo">
                <Undo2 aria-hidden className="size-3.5" /> Undo {strip.changes.length > 1 ? "all" : ""}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStrip(null)} aria-label="Dismiss">
                <X aria-hidden className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {alert && (
        <p role="alert" className="sr-only">
          Refund spike: {alert}
        </p>
      )}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <AgStudio
          data={sources as never}
          mode={editing ? "edit" : "view"}
          theme={theme as never}
          widgets={widgets as never}
          layout={{ widgetBorderEnabled: true } as never}
          initialState={initial as never}
          onApiReady={(e: { api: AgStudioApi }) => {
            apiRef.current = e.api;
            // Handles for acceptance tests: read the report state; apply a layout change the way the UI does.
            (window as unknown as { __shopfrontStudio?: AgStudioApi }).__shopfrontStudio = e.api;
            (window as unknown as { __shopfrontApplyState?: (s: unknown) => void }).__shopfrontApplyState = (st) => applyState(st);
          }}
          onStudioReady={(e: { api: AgStudioApi }) => {
            last.current = e.api.getState() as ReportLike;
            markSeen(e.api);
          }}
          onStateUpdated={(e: { state?: unknown }) => {
            const s = e.state as (ReportLike & { selectedPageId?: string }) | undefined;
            persist(s);
            if (!s) return;
            if (s.selectedPageId) setPage(s.selectedPageId);
            setPageIds((s.pages ?? []).map((p) => (p as { id: string }).id));
            if (aiRun.current) return; // an agent run is listed as one change when it ends
            const api = apiRef.current;
            const fresh = api ? markSeen(api) : [];
            const before = last.current;
            last.current = s;
            if (!fresh.length) return; // normalising, undo or redo: not a new change
            // Widgets added or removed, layout and filters, by name; Studio's own label when that is all there is.
            const structural = diffReport(before, s, pageLabel).filter((c) => !c.includes(": changed “"));
            const changes = structural.length ? structural : [...new Set(fresh.map((h) => h.label))];
            setStrip({ changes, ai: false, at: Date.now(), undo: () => restore(before, fresh[0]!.id) });
          }}
          ai={(params: { api: AgStudioApi }) =>
            createAiHarness(params.api, ({ tools, builtIn }) => {
              const manager = directLlmRunner({
                id: "shop-manager",
                name: "Shop Manager",
                description: "Answers questions about this shop's sales, orders, refunds, stock, agents and PayPal reconciliation, and lays out report views. Read-only.",
                instructions: () => managerInstructions(),
                tools: (ctx) => [
                  ...READ_TOOLS.map((t) =>
                    ctx.api.defineAiTool({
                      name: t.name,
                      description: t.description,
                      params: (s: AgAiParamsBuilder) => (t.range ? s.object({ from: s.string({ description: "ISO 8601 start" }), to: s.string({ description: "ISO 8601 end" }) }) : s.object({})),
                      execute: async (args: Record<string, string>, c: AgAiToolContext) => insight(c, t.name, t.range ? args : undefined),
                    } as never),
                  ),
                  ctx.api.defineAiTool({
                    name: "add_chart",
                    description: `Add a fully configured chart or KPI to the report page being viewed. Sources and fields: ${Object.entries(SOURCE_FIELDS)
                      .map(([k, v]) => `${k}(${v.join(", ")})`)
                      .join("; ")}.`,
                    params: (s: AgAiParamsBuilder) =>
                      s.object({
                        title: s.string({ description: "Widget title, e.g. Refunds by reason · last 7 days" }),
                        chart: s.enum(CHART_TYPES, { description: "column-chart-grouped, bar-chart-grouped, line-chart or donut-chart; value for a single KPI number" }),
                        source: s.enum(SOURCE_IDS),
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
                agents: [manager, run(builtIn.page), run(builtIn.widget), run(builtIn.data)],
                primary: "shop-manager",
                observers: [observer],
                promptStarters: [
                  { label: "What needs my attention?", prompt: "What needs my attention right now?" },
                  { label: "What sold this week?", prompt: "What sold this week?" },
                  { label: "Reconciled with PayPal?", prompt: "Are my payments reconciled with PayPal?" },
                  { label: "Refunds by reason", prompt: "Show refunds by reason" },
                ],
              } as never;
            }) as never
          }
          style={{ height: "100%", width: "100%" }}
        />
      </div>
    </div>
  );
}

// ───────────── The Shop Manager agent (Phase AG): read-only shop tools + views; no tool can move money ─────────────
const READ_TOOLS = [
  {
    name: "sales_summary",
    range: true,
    description: "Sales and refunds for a date range of up to 31 days (ISO 8601), from two sources at once: the Shopfront database (real time, [db]) and PayPal Transaction Search (can lag about 3 hours, [paypal]). Returns both summary lines.",
  },
  { name: "agent_activity", range: true, description: "Checkouts and orders by channel (Shopfront agent, MCP agent, Cart API, storefront) and by buying agent, for a date range of up to 31 days. Source label: db." },
  { name: "orders_needing_action", range: false, description: "What needs the seller now: paid orders to ship (including Cart API holds that are charged on ship) and refund requests waiting. Source label: db." },
  { name: "stock_levels", range: false, description: "Live listing variants and which are low on stock (3 or fewer). Source label: db." },
  { name: "reconciliation_status", range: false, description: "Whether every PayPal capture matches an order (the latest reconciliation with PayPal), with any mismatches. Source label: paypal." },
] as const;

function managerInstructions() {
  return [
    "You are the Shop Manager for a one-person shop on Shopfront. You read the shop's numbers and lay out report views. You are read-only.",
    "You cannot refund, ship, cancel, capture, change prices or change stock: none of your tools can, and you never claim to have done it. If asked, reply in one or two sentences that you can't do that from the dashboard, and say where the seller does it: refunds in the Refund queue on the Payments & reconciliation page, shipping and cancelling on the Orders page of the Studio. Do not call any tool for such a request.",
    "Every figure you give comes from a tool. Each tool returns summary_line: copy every summary line you used into your answer word for word (they start with [db] or [paypal]), then add at most one short sentence.",
    "Which tool: sales, revenue, what sold, refunds over a period → sales_summary (it returns a [db] line and a [paypal] line; quote both; if they differ, PayPal lags about 3 hours). What needs attention, to ship, waiting → orders_needing_action. Stock, inventory, running low → stock_levels. Reconciled, PayPal match, mismatches → reconciliation_status. Agents, channels, Cart API, who bought → agent_activity.",
    "Dates: today is " + new Date().toISOString().slice(0, 10) + "; 'this week' means the last 7 days, 'this month' the last 30 days. Quote the dates the tools return; never guess the year.",
    "Questions are answered in text with figures, never only with a chart. Requests to show, chart, plot, add or track something are view requests: call add_chart (it builds a fully configured widget) and reply in one sentence naming its title. For anything else about the layout, delegate to the page agent with the widget type, data source and fields, aggregation and title. Never write a widget type id in a reply to the seller.",
    "Be brief.",
  ].join("\n");
}

const CHART_TYPES = ["column-chart-grouped", "bar-chart-grouped", "line-chart", "donut-chart", "value"] as const;
const SOURCE_IDS = ["orders", "lines", "refunds", "attempts", "listings", "carts"] as const;
type ChartArgs = { title: string; chart: (typeof CHART_TYPES)[number]; source: (typeof SOURCE_IDS)[number]; category?: string; value: string; aggregation: "sum" | "count" | "avg"; last_days?: number };
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
 * Deterministic widget builder: the model picks fields from a closed list; this code writes a complete widget (data
 * mapping, an optional widget-level date filter) at the top of the page being viewed.
 */
function addChart(api: AgStudioApi, a: ChartArgs, c: AgAiToolContext, apply: (state: unknown) => void) {
  const fields = SOURCE_FIELDS[a.source] ?? [];
  const bad = [a.value, a.chart === "value" ? undefined : a.category].filter((f): f is string => f !== undefined && !fields.includes(f));
  if (a.chart !== "value" && !a.category) bad.push("(category missing)");
  if (bad.length) return c.error(`Unknown field(s) for ${a.source}: ${bad.join(", ")}. Use: ${fields.join(", ")}.`) as never;
  const state = structuredClone(api.getState()) as unknown as ReportState;
  const page = state.pages.find((p) => p.id === state.selectedPageId) ?? state.pages[0]!;
  const id = `ai-${a.source}-${Date.now().toString(36)}`;
  const value = [{ id: `${a.source}.${a.value}`, aggregation: a.aggregation }];
  const format = { title: { enabled: true, text: a.title, typography: { fontSize: 13, fontWeight: "bold" } } };
  page.widgets[id] =
    a.chart === "value" ? { type: "value", dataMapping: { value }, format } : { type: a.chart, dataMapping: { categoryKey: [{ id: `${a.source}.${a.category}` }], valueKey: value }, format };
  const height = a.chart === "value" ? 8 : 20;
  for (const l of Object.values(page.widgetLayout)) l.yTrack += height;
  page.widgetLayout[id] = { xTrack: 0, yTrack: 0, xSpan: a.chart === "value" ? 6 : 12, ySpan: height };
  if (a.last_days && a.last_days > 0 && fields.includes("date")) {
    page.filter = { ...page.filter, widget: { ...(page.filter?.widget ?? {}), [id]: [{ field: { id: `${a.source}.date` }, model: { operator: "inRelativeRange", value: { type: "last", unit: "day", value: Math.round(a.last_days) } } }] } };
  }
  apply(state);
  return c.success(`Added widget ${id} ("${a.title}") at the top of the ${pageLabel(page.id)} page.`, { widgetId: id }) as never;
}

async function callInsight(tool: string, args?: Record<string, string>) {
  const r = await fetch("/api/seller/insights", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool, args: args ?? {} }) });
  return { ok: r.ok, out: (await r.json().catch(() => ({}))) as { summary_line?: string; error?: { message?: string } } & Record<string, unknown> };
}

async function insight(c: AgAiToolContext, tool: string, args?: Record<string, string>) {
  if (tool === "sales_summary") {
    // Both sources in one call, so an answer about sales always carries the [db] and the [paypal] figure (D-007).
    const [d, p] = await Promise.all([callInsight("db_sales_summary", args), callInsight("paypal_transactions", args)]);
    if (!d.ok) return c.error(d.out.error?.message ?? "Tool failed.") as never;
    const paypal = p.ok ? p.out.summary_line : `[paypal] unavailable: ${p.out.error?.message ?? "PayPal did not answer"}`;
    const out = { summary_line: [d.out.summary_line, paypal].filter(Boolean).join("\n"), db: d.out, paypal: p.out };
    return c.success(JSON.stringify(out), out) as never;
  }
  const { ok, out } = await callInsight(tool, args);
  return (ok ? c.success(JSON.stringify(out), out) : c.error(out.error?.message ?? "Tool failed.")) as never;
}
