"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { AllEnterpriseModule, LicenseManager, ModuleRegistry, type ColDef, type CellValueChangedEvent } from "ag-grid-enterprise";
import type { ShopEvent } from "@/server/events";
import type { QueuedRefund } from "@/server/orders";
import { toTimelineItem } from "@/components/console/event-item";
import { Timeline, type WireState } from "@/components/console/timeline";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { makeLedgerTheme } from "./theme";

ModuleRegistry.registerModules([AllEnterpriseModule]);
if (process.env.NEXT_PUBLIC_AG_LICENSE_KEY) LicenseManager.setLicenseKey(process.env.NEXT_PUBLIC_AG_LICENSE_KEY);

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

export function LedgerWidget() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const load = useCallback(async () => {
    const r = await fetch("/api/seller/dashboard/data", { cache: "no-store" });
    if (r.ok) setRows(((await r.json()) as { orders: LedgerRow[] }).orders);
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
  const columns = useMemo<ColDef<LedgerRow>[]>(
    () => [
      { field: "product", rowGroup: true, hide: true },
      { field: "date", width: 110, sort: "desc" },
      { field: "order", width: 150, cellClass: "font-mono text-xs" },
      { field: "note", headerName: "Note ✎", minWidth: 200, flex: 1, editable: true },
      { field: "ship_by", headerName: "Ship by ✎", width: 130, editable: true, cellEditor: "agDateStringCellEditor" },
      { field: "status", width: 130 },
      { field: "total_usd", headerName: "Total", width: 100, aggFunc: "sum", valueFormatter: (p) => (p.value == null ? "" : `$${Number(p.value).toFixed(2)}`), cellClass: "tabular" },
      { field: "refunded_usd", headerName: "Refunded", width: 110, aggFunc: "sum", valueFormatter: (p) => (p.value ? `$${Number(p.value).toFixed(2)}` : ""), cellClass: "tabular" },
      { field: "confirmed_via", headerName: "Confirmed", width: 120 },
      { field: "buyer_country", headerName: "Country", width: 95 },
      { field: "shipped", width: 90 },
    ],
    [],
  );
  const theme = useMemo(() => makeLedgerTheme(), []);
  const onEdit = async (e: CellValueChangedEvent<LedgerRow>) => {
    if (!e.data) return;
    const body = e.colDef.field === "note" ? { note: String(e.newValue ?? "") } : { ship_by: String(e.newValue ?? "") };
    const r = await fetch(`/api/seller/orders/${e.data.order}/ledger`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) e.node.setDataValue(e.colDef.field!, e.oldValue);
  };
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1 p-1" data-testid="widget-ledger">
      <p className="px-1 text-xs text-muted">Select a ✎ cell and start typing to add a note or a ship-by date. Saved for you only.</p>
      <AgGridReact<LedgerRow>
        theme={theme}
        rowData={rows}
        columnDefs={columns}
        getRowId={(p) => p.data.order}
        autoGroupColumnDef={{ headerName: "Product", minWidth: 220 }}
        groupDefaultExpanded={1}
        grandTotalRow="bottom"
        suppressAggFuncInHeader
        suppressColumnVirtualisation
        // Studio's edit mode takes double-clicks for itself; the two ✎ columns edit on a single click instead.
        singleClickEdit
        rowHeight={34}
        headerHeight={36}
        onCellValueChanged={onEdit}
        stopEditingWhenCellsLoseFocus
      />
    </div>
  );
}
