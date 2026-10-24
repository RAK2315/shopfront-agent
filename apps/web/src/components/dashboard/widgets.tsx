"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type CellValueChangedEvent, type ColDef, type ICellRendererParams } from "ag-grid-community";
import type { ShopEvent } from "@/server/events";
import type { QueuedRefund } from "@/server/orders";
import { toTimelineItem } from "@/components/console/event-item";
import { Timeline, type WireState } from "@/components/console/timeline";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { cartFunnel, type FunnelCart, type FunnelOrder } from "@/lib/cart-funnel";
import { cn } from "@/lib/cn";
import { makeLedgerTheme } from "./theme";

// AG Grid Community for the ledger: the AG Studio trial key does not license standalone AG Grid Enterprise
// (it watermarked the grid), so product grouping is built here with full-width group rows instead (D-053).
ModuleRegistry.registerModules([AllCommunityModule]);

// One EventSource for the whole dashboard, shared by every widget (ref-counted).
const stream: { es: EventSource | null; subs: Set<(e: ShopEvent) => void>; wire: Set<(w: WireState) => void> } = { es: null, subs: new Set(), wire: new Set() };
function subscribe(cb: (e: ShopEvent) => void, onWire: (w: WireState) => void) {
  stream.subs.add(cb);
  stream.wire.add(onWire);
  if (!stream.es) {
    const es = new EventSource("/api/events?after=0");
    es.onopen = () => stream.wire.forEach((f) => f("live"));
    es.onerror = () => stream.wire.forEach((f) => f(es.readyState === EventSource.CLOSED ? "paused" : "reconnecting"));
    es.addEventListener("shop", (m) => {
      const ev = JSON.parse((m as MessageEvent<string>).data) as ShopEvent;
      stream.subs.forEach((f) => f(ev));
    });
    stream.es = es;
  } else if (stream.es.readyState === EventSource.OPEN) onWire("live");
  return () => {
    stream.subs.delete(cb);
    stream.wire.delete(onWire);
    if (stream.subs.size === 0) {
      stream.es?.close();
      stream.es = null;
    }
  };
}

/** Collapses bursts (the backlog replay on connect, several webhooks at once) into one reload. */
function useDebounced(fn: () => unknown, ms = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  }, [fn, ms]);
}

/** Fires `cb` for every live event (the backlog first, then new ones). */
export function useLiveEvents(cb: (e: ShopEvent) => void) {
  const [wire, setWire] = useState<WireState>("connecting");
  useEffect(() => subscribe(cb, setWire), [cb]);
  return wire;
}

// ───────────── Agent timeline: Agent → MCP → PayPal → Webhook → Seller agent, live ─────────────
export function TimelineWidget() {
  const [events, setEvents] = useState<ShopEvent[]>([]);
  const onEvent = useCallback((e: ShopEvent) => setEvents((all) => (all.some((x) => x.id === e.id) ? all : [e, ...all].slice(0, 60))), []);
  const wire = useLiveEvents(onEvent);
  const items = useMemo(() => events.map(toTimelineItem), [events]);
  return (
    <div className="h-full min-h-0 p-1">
      <Timeline items={items} state={wire} title="Agent → MCP → PayPal → webhook" emptyText="Waiting for the next agent call." className="h-full" listClassName="overflow-y-auto" />
    </div>
  );
}

// ───────────── Refund queue: one tap runs the deterministic executor ─────────────
export function RefundQueueWidget() {
  const [rows, setRows] = useState<QueuedRefund[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/seller/refunds", { cache: "no-store" });
    if (r.ok) setRows(((await r.json()) as { refunds: QueuedRefund[] }).refunds);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  const reload = useDebounced(load); // load is stable (useCallback), so the debounce survives re-renders
  useLiveEvents(
    useCallback((e: ShopEvent) => {
      if (e.kind.startsWith("refund")) reload();
    }, [reload]),
  );
  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    await fetch(`/api/seller/refunds/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approve }) });
    setBusy(null);
    void load();
  };
  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  return (
    <div className="grid h-full content-start gap-2 overflow-y-auto p-3" data-testid="widget-refund-queue">
      <p className="text-sm font-semibold">Refunds waiting for you · {pending.length}</p>
      {rows === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="text-sm text-ink-2">Nothing to decide. In-policy refunds run automatically.</p>
      ) : (
        pending.map((r) => (
          <div key={r.id} className="grid gap-2 rounded-md border border-warning/35 bg-warning-soft/40 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <Money cents={r.amountCents} className="text-md font-semibold" />
              <span className="truncate text-xs text-ink-2">{r.reasonCode.replace(/_/g, " ")}</span>
            </div>
            <p className="text-xs text-ink-2">{r.explanation}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(r.id, true)} loading={busy === r.id}>
                Refund
              </Button>
              <Button size="sm" variant="ghost" onClick={() => decide(r.id, false)} disabled={busy === r.id}>
                Decline
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ───────────── Order ledger: AG Grid, grouped by product, inline note + ship-by ─────────────
interface LedgerRow {
  order: string;
  date: string;
  status: string;
  product: string;
  total_usd: number;
  refunded_usd: number;
  buyer_country: string;
  confirmed_via: string;
  shipped: string;
  ship_by: string;
  note: string;
  paypal_order: string;
}
type GroupRow = { __group: string; count: number; total: number; refunded: number };
type Row = LedgerRow | GroupRow;
const isGroup = (r: Row | undefined): r is GroupRow => Boolean(r && "__group" in r);
const usd = (n: number) => `$${n.toFixed(2)}`;

/** Orders grouped by product: a full-width header per product (count and subtotal), newest orders first. */
function groupRows(orders: LedgerRow[]): Row[] {
  const by = new Map<string, LedgerRow[]>();
  for (const o of orders) by.set(o.product, [...(by.get(o.product) ?? []), o]);
  return [...by.entries()]
    .sort((a, b) => b[1].reduce((n, o) => n + o.total_usd, 0) - a[1].reduce((n, o) => n + o.total_usd, 0))
    .flatMap(([product, list]) => [
      { __group: product, count: list.length, total: list.reduce((n, o) => n + o.total_usd, 0), refunded: list.reduce((n, o) => n + o.refunded_usd, 0) } as Row,
      ...[...list].sort((a, b) => b.date.localeCompare(a.date) || b.order.localeCompare(a.order)),
    ]);
}

function GroupHeader(p: ICellRendererParams<Row>) {
  const g = p.data as GroupRow;
  return (
    <div className="flex h-full items-center gap-3 bg-surface-2 px-3 text-sm">
      <span className="font-display text-base font-medium text-ink">{g.__group}</span>
      <span className="text-ink-2">
        {g.count} order{g.count === 1 ? "" : "s"}
      </span>
      <span className="ml-auto tabular font-medium text-ink">{usd(g.total)}</span>
      {g.refunded > 0 && <span className="tabular text-ink-2">−{usd(g.refunded)} refunded</span>}
    </div>
  );
}

export function LedgerWidget() {
  const [orders, setOrders] = useState<LedgerRow[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/seller/dashboard/data", { cache: "no-store" });
    if (r.ok) setOrders(((await r.json()) as { orders: LedgerRow[] }).orders);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  const reload = useDebounced(load); // load is stable (useCallback), so the debounce survives re-renders
  useLiveEvents(
    useCallback((e: ShopEvent) => {
      if (e.checkoutId) reload();
    }, [reload]),
  );
  const rows = useMemo(() => groupRows(orders), [orders]);
  const totals = useMemo(
    () => [{ __group: "All products", count: orders.length, total: orders.reduce((n, o) => n + o.total_usd, 0), refunded: orders.reduce((n, o) => n + o.refunded_usd, 0) } as Row],
    [orders],
  );
  const money = (p: { value: unknown }) => (typeof p.value === "number" && p.value ? usd(p.value) : "");
  const columns = useMemo<ColDef<Row>[]>(
    () => [
      { field: "date" as never, width: 110 },
      { field: "order" as never, width: 150, cellClass: "font-mono text-xs" },
      { field: "note" as never, headerName: "Note ✎", minWidth: 200, flex: 1, editable: true },
      { field: "ship_by" as never, headerName: "Ship by ✎", width: 130, editable: true, cellEditor: "agDateStringCellEditor" },
      { field: "status" as never, width: 130 },
      { field: "total_usd" as never, headerName: "Total", width: 100, valueFormatter: money, cellClass: "tabular" },
      { field: "refunded_usd" as never, headerName: "Refunded", width: 110, valueFormatter: money, cellClass: "tabular" },
      { field: "confirmed_via" as never, headerName: "Confirmed", width: 120 },
      { field: "buyer_country" as never, headerName: "Country", width: 95 },
      { field: "shipped" as never, width: 90 },
    ],
    [],
  );
  const theme = useMemo(() => makeLedgerTheme(), []);
  const onEdit = async (e: CellValueChangedEvent<Row>) => {
    if (!e.data || isGroup(e.data)) return;
    const body = e.colDef.field === "note" ? { note: String(e.newValue ?? "") } : { ship_by: String(e.newValue ?? "") };
    const r = await fetch(`/api/seller/orders/${e.data.order}/ledger`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) e.node.setDataValue(e.colDef.field!, e.oldValue);
  };
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1 p-1" data-testid="widget-ledger">
      <p className="px-1 text-xs text-muted">Select a ✎ cell and start typing to add a note or a ship-by date. Saved for you only.</p>
      <AgGridReact<Row>
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        getRowId={(p) => (isGroup(p.data) ? `group-${p.data.__group}` : p.data.order)}
        isFullWidthRow={(p) => isGroup(p.rowNode.data)}
        fullWidthCellRenderer={GroupHeader}
        pinnedBottomRowData={totals}
        onCellValueChanged={onEdit}
        stopEditingWhenCellsLoseFocus
        suppressColumnVirtualisation
        singleClickEdit
        rowHeight={34}
        headerHeight={36}
      />
    </div>
  );
}

// ───────────── Reconciled with PayPal: the latest check, its sources and every mismatch (D-095) ─────────────
type Reconciliation = {
  state: "ok" | "mismatch" | "incomplete" | "pending";
  checkedAt?: string;
  matched: number;
  mismatches: Array<{ kind: string; label: string; detail?: string; captureId?: string; checkoutId?: string; amountCents?: number }>;
  sources?: { windowDays?: number; transactionSearch?: number; webhooks?: number; askedPayPal?: number };
  error?: string;
};
const ago = (iso?: string) => {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 2880 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

export function ReconcileWidget() {
  const [r, setR] = useState<Reconciliation | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async (method: "GET" | "POST" = "GET") => {
    const res = await fetch("/api/seller/reconcile", { method, cache: "no-store" });
    if (res.ok) setR((await res.json()) as Reconciliation);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  const again = async () => {
    setBusy(true);
    await load("POST").finally(() => setBusy(false));
  };
  const n = r?.mismatches.length ?? 0;
  const tone = r?.state === "mismatch" ? "text-danger" : r?.state === "ok" ? "text-success" : "text-ink-2";
  const headline = !r ? "Checking…" : r.state === "ok" ? "Reconciled with PayPal ✓" : r.state === "mismatch" ? `${n} mismatch${n === 1 ? "" : "es"} with PayPal` : r.state === "pending" ? "First check running" : "Check incomplete";
  const s = r?.sources ?? {};
  const counts: Array<[string, number | undefined]> = [
    ["Transaction Search", s.transactionSearch],
    ["Verified webhooks", s.webhooks],
    ["Direct GETs", s.askedPayPal],
  ];
  return (
    <div className="grid h-full content-start gap-3 overflow-y-auto p-4" data-testid="widget-reconcile" data-state={r?.state ?? "loading"} data-mismatches={n}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">PayPal reconciliation</p>
      <div>
        <p className={cn("text-xl font-semibold", tone)}>{headline}</p>
        {r && r.state !== "pending" && (
          <p className="text-sm text-ink-2">
            <span className="tabular font-medium text-ink">{r.matched}</span> payment{r.matched === 1 ? "" : "s"} match PayPal · checked {ago(r.checkedAt)}
          </p>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {counts.map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse rounded-md border border-line bg-canvas px-2 py-2">
            <dt className="text-[11px] leading-tight text-ink-2">{k}</dt>
            <dd className="tabular text-lg font-semibold text-ink">{v ?? 0}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-2">Every PayPal capture in the last {s.windowDays ?? 30} days is matched to an order here. Runs on start-up, daily and after every test suite. It reads PayPal only and never moves money.</p>
      {r?.error && <p className="text-xs text-warning">{r.error}</p>}
      {r && n > 0 && (
        <ul className="grid gap-2" aria-label="Mismatches">
          {r.mismatches.map((m) => (
            <li key={`${m.kind}${m.captureId}${m.checkoutId}`} className="rounded-md bg-danger-soft p-2 text-xs">
              <p className="font-medium text-danger">
                {m.label}
                {m.amountCents !== undefined && <span className="tabular"> · ${(m.amountCents / 100).toFixed(2)}</span>}
              </p>
              {m.detail && <p className="text-ink-2">{m.detail}</p>}
              <p className="font-mono text-[11px] text-ink-2">{[m.checkoutId, m.captureId].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button size="sm" variant="secondary" onClick={again} loading={busy} data-testid="reconcile-again">
          Check again
        </Button>
      </div>
    </div>
  );
}

// ───────────── Cart API funnel: carts agents built → valid → approved → authorized → captured on ship ─────────────

export function CartFunnelWidget() {
  const [data, setData] = useState<{ carts: FunnelCart[]; orders: FunnelOrder[] } | null>(null);
  const load = useCallback(async () => {
    const r = await fetch("/api/seller/dashboard/data", { cache: "no-store" });
    if (r.ok) setData((await r.json()) as { carts: FunnelCart[]; orders: FunnelOrder[] });
  }, []);
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);
  const reload = useDebounced(load);
  useLiveEvents(
    useCallback((e: ShopEvent) => {
      if (e.checkoutId || e.kind.startsWith("cart")) reload();
    }, [reload]),
  );
  const f = useMemo(() => (data ? cartFunnel(data.carts, data.orders) : null), [data]);
  const top = f?.stages[0]?.n || 1;
  return (
    <div className="grid h-full content-start gap-3 overflow-y-auto p-4" data-testid="widget-cart-funnel" data-stages={f ? JSON.stringify(f.stages.map((s) => s.n)) : ""}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">PayPal Cart API v1 · 90 days</p>
        <p className="text-sm text-ink-2">
          {f ? `${f.stages[0]!.n} cart${f.stages[0]!.n === 1 ? "" : "s"} from ${f.agents} agent${f.agents === 1 ? "" : "s"}. Prices come from your listings, never from the agent.` : "Loading…"}
        </p>
      </div>
      {f && (
        <ol className="grid gap-2.5">
          {f.stages.map((s, i) => {
            const prev = i ? f.stages[i - 1]!.n : 0;
            return (
              <li key={s.id} className="grid gap-1" data-testid={`funnel-${s.id}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-ink">{s.label}</span>
                  <span className="tabular font-semibold text-ink">
                    {s.n}
                    {i > 0 && <span className="ml-1.5 text-xs font-normal text-ink-2">{prev ? Math.round((s.n / prev) * 100) : 0}%</span>}
                  </span>
                </div>
                <div className="h-2.5 rounded-pill bg-surface-2">
                  <div className="h-full rounded-pill bg-clay transition-[width] duration-500" style={{ width: `${s.n ? Math.max(3, (s.n / top) * 100) : 0}%`, opacity: 1 - i * 0.12 }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {f && f.issues.length > 0 && (
        <div className="grid gap-1">
          <p className="text-xs font-semibold text-ink-2">Where carts stopped</p>
          <ul className="flex flex-wrap gap-1.5">
            {f.issues.map(([k, v]) => (
              <li key={k} className="rounded-pill border border-line bg-canvas px-2 py-0.5 font-mono text-[11px] text-ink-2">
                {k} · {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
