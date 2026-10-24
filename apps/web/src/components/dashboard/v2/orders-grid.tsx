"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, ICellRendererParams, IRowNode, PostSortRowsParams, RowClickedEvent, RowHeightParams } from "ag-grid-community";
import { ChevronDown, ChevronRight, FlaskConical, Truck } from "lucide-react";
import type { CheckoutStatus, GridView } from "@shopfront/core";
import type { HistoryItem, OrderRow } from "@/server/dashboard-v2";
import { StatusPill } from "@/components/ui/status-pill";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";
import { makeLedgerTheme } from "../theme";
import { gridModules } from "../grid-modules";

type Group = { kind: "group"; id: string; label: string; count: number; total: number; refunded: number; collapsed: boolean };
type Detail = { kind: "detail"; id: string; order: string };
type Order = OrderRow & { kind: "order"; id: string; group?: string };
type Row = Order | Group | Detail;

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Applies the view's filters in code (the same rows feed the chart, so the two always agree). */
export function rowsInView(rows: OrderRow[], v: GridView, search: string): OrderRow[] {
  const since = v.last_days ? Date.now() - v.last_days * 86_400_000 : 0;
  const q = search.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!since || new Date(r.at).getTime() >= since) &&
      (!v.statuses?.length || v.statuses.includes(r.status as (typeof v.statuses)[number])) &&
      (!v.product_contains || r.product.toLowerCase().includes(v.product_contains.toLowerCase())) &&
      (v.min_total == null || r.total >= v.min_total) &&
      (v.max_total == null || r.total <= v.max_total) &&
      (!v.shipped || r.shipped === v.shipped) &&
      (!q || `${r.product} ${r.order} ${r.note} ${r.paypal}`.toLowerCase().includes(q)),
  );
}

const groupKey = (r: OrderRow, by: NonNullable<GridView["group_by"]>) => (by === "product" ? r.product.split(", ")[0]! : by === "status" ? r.status.replace(/_/g, " ") : by === "day" ? r.date : r.buyer_country || "unknown");

function buildRows(rows: OrderRow[], v: GridView, open: Set<string>, collapsed: Set<string>): Row[] {
  const out: Row[] = [];
  const pushOrder = (r: OrderRow, group?: string) => {
    out.push({ ...r, kind: "order", id: r.order, group });
    if (open.has(r.order)) out.push({ kind: "detail", id: `detail-${r.order}`, order: r.order });
  };
  if (!v.group_by) {
    rows.forEach((r) => pushOrder(r));
    return out;
  }
  const groups = new Map<string, OrderRow[]>();
  for (const r of rows) {
    const k = groupKey(r, v.group_by);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const [k, members] of [...groups].sort((a, b) => b[1].reduce((n, r) => n + r.total, 0) - a[1].reduce((n, r) => n + r.total, 0))) {
    const id = `group-${k}`;
    out.push({ kind: "group", id, label: k, count: members.length, total: members.reduce((n, r) => n + r.total, 0), refunded: members.reduce((n, r) => n + r.refunded, 0), collapsed: collapsed.has(id) });
    if (!collapsed.has(id)) members.forEach((r) => pushOrder(r, id));
  }
  return out;
}

function GroupHeader({ data, onToggle }: { data: Group; onToggle: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onToggle(data.id)} className="flex h-full w-full items-center gap-2 border-b border-line bg-surface-2 px-3 text-left text-sm hover:bg-clay-soft/40" data-testid="group-row">
      {data.collapsed ? <ChevronRight aria-hidden className="size-4 text-ink-2" /> : <ChevronDown aria-hidden className="size-4 text-ink-2" />}
      <span className="truncate font-semibold text-ink">{data.label}</span>
      <span className="text-ink-2">
        · {data.count} order{data.count === 1 ? "" : "s"}
      </span>
      <span className="ml-auto font-medium tabular text-ink">{usd(data.total)}</span>
      {data.refunded > 0 && <span className="tabular text-danger">−{usd(data.refunded)}</span>}
    </button>
  );
}

const ACTOR: Record<string, string> = { mcp: "Agent → MCP", agent: "Buyer agent", paypal: "PayPal", webhook: "PayPal webhook", server: "Shopfront", seller: "Seller", seller_agent: "Seller agent", poller: "Fallback check", cart_api: "Agent → Cart API" };

function DetailPanel({ order }: { order: string }) {
  const [h, setH] = useState<{ events: HistoryItem[]; calls: Array<{ at: string; method: string; path: string; status: number; debugId: string | null; requestId: string | null; ms: number }> } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/seller/orders/${order}/history`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => live && setH(j))
      .catch(() => live && setErr(true));
    return () => {
      live = false;
    };
  }, [order]);
  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-y-auto border-b border-line bg-canvas px-4 py-3 lg:grid-cols-[3fr_2fr]" data-testid="order-detail" data-order={order}>
      {err ? (
        <p className="text-sm text-danger">Couldn&apos;t load this order&apos;s history.</p>
      ) : !h ? (
        <p className="text-sm text-ink-2">Loading the PayPal history…</p>
      ) : (
        <>
          <section className="grid content-start gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">What happened · {h.events.length} events</h4>
            <ol className="grid gap-1.5 border-l border-line-strong pl-3">
              {h.events.map((e, i) => (
                <li key={i} className="grid gap-0.5">
                  <span className="text-sm text-ink">
                    <span className={cn("font-medium", e.actor === "paypal" || e.actor === "webhook" ? "text-paypal" : "text-ink")}>{ACTOR[e.actor] ?? e.actor}</span> · {e.summary}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    {e.ids.map((x) => (
                      <RequestId key={x.label + x.value} label={x.label} value={x.value} tone={x.label === "Request-Id" ? "neutral" : "paypal"} max={16} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="grid content-start gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">Raw PayPal calls · {h.calls.length}</h4>
            <ul className="grid gap-1 font-mono text-xs">
              {h.calls.map((c, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-2 rounded-sm bg-surface px-2 py-1">
                  <span className="font-semibold text-ink">{c.method}</span>
                  <span className="min-w-0 truncate text-ink-2">{c.path}</span>
                  <span className={cn("ml-auto", c.status < 300 ? "text-success" : "text-danger")}>{c.status}</span>
                  <span className="text-muted">{c.ms}ms</span>
                  {c.debugId && <span className="w-full text-muted">debug {c.debugId}</span>}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function ProductCell(p: ICellRendererParams<Row>) {
  const r = p.data as Order;
  return (
    <span className="flex h-full min-w-0 items-center gap-2">
      {r.thumb ? (
        // eslint-disable-next-line @next/next/no-img-element -- content-hashed, resized server-side
        <img src={r.thumb} alt="" className="size-8 shrink-0 rounded-sm object-cover" />
      ) : (
        <span aria-hidden className="size-8 shrink-0 rounded-sm bg-surface-2" />
      )}
      <span className="truncate">{r.product}</span>
      {r.items > 1 && <span className="shrink-0 text-xs text-muted">×{r.items}</span>}
    </span>
  );
}

function OrderCell(p: ICellRendererParams<Row>) {
  const r = p.data as Order;
  return (
    <span className="flex h-full items-center gap-1.5">
      <span className="font-mono text-xs text-ink-2">{r.order.slice(4)}</span>
      {r.is_test && (
        <span title="A real PayPal sandbox order placed by a test run" className="inline-flex items-center gap-0.5 rounded-pill border border-line-strong bg-surface-2 px-1.5 text-[10px] font-medium text-ink-2" data-testid="grid-test-badge">
          <FlaskConical aria-hidden className="size-2.5" /> test
        </span>
      )}
    </span>
  );
}

export function OrdersGrid({ rows, view, onSortChange }: { rows: OrderRow[]; view: GridView; onSortChange?: (s: GridView["sort"]) => void }) {
  const edition = useMemo(() => gridModules(), []);
  const api = useRef<GridApi<Row> | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null);
  const theme = useMemo(() => makeLedgerTheme("lg"), []);

  const toggleGroup = useCallback((id: string) => setCollapsed((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id]))), []);
  const data = useMemo(() => buildRows(rows, view, open, collapsed), [rows, view, open, collapsed]);

  // New orders arriving live flash once (the backlog on first load does not).
  useEffect(() => {
    const ids = new Set(rows.map((r) => r.order));
    if (seen.current && api.current) {
      const fresh = [...ids].filter((id) => !seen.current!.has(id));
      if (fresh.length) {
        setTimeout(() => {
          const nodes = fresh.map((id) => api.current?.getRowNode(id)).filter((n): n is IRowNode<Row> => Boolean(n));
          api.current?.flashCells({ rowNodes: nodes, flashDuration: 1600, fadeDuration: 900 });
        }, 50);
      }
    }
    seen.current = ids;
  }, [rows]);

  // The view's sort drives the grid's sort (the Ask bar can sort), and a header click reports back.
  useEffect(() => {
    const a = api.current;
    if (!a) return;
    const want = view.sort ? { total: "total", refunded: "refunded", date: "at", product: "product", status: "status" }[view.sort.field] : null;
    a.applyColumnState({ state: want ? [{ colId: want, sort: view.sort!.dir }] : [], defaultState: { sort: null } });
  }, [view.sort]);

  const cols = useMemo<ColDef<Row>[]>(() => {
    const show = (id: string) => !view.columns || view.columns.includes(id as never);
    const all: Array<ColDef<Row> & { key: string }> = [
      { key: "date", colId: "at", field: "at" as never, headerName: "Date", width: 150, valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(p.value).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""), sort: "desc" },
      { key: "order", colId: "order", field: "order" as never, headerName: "Order", width: 150, cellRenderer: OrderCell, sortable: false },
      { key: "product", colId: "product", field: "product" as never, headerName: "Product", flex: 2, minWidth: 220, cellRenderer: ProductCell },
      { key: "status", colId: "status", field: "status" as never, headerName: "Status", width: 160, cellRenderer: (p: ICellRendererParams<Row>) => <span className="flex h-full items-center"><StatusPill status={(p.data as Order).status as CheckoutStatus} /></span>, enableCellChangeFlash: true },
      { key: "total", colId: "total", field: "total" as never, headerName: "Total", width: 104, type: "rightAligned", cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" }, valueFormatter: (p) => usd(p.value ?? 0), cellClass: "tabular font-medium", enableCellChangeFlash: true },
      { key: "refunded", colId: "refunded", field: "refunded" as never, headerName: "Refunded", width: 110, type: "rightAligned", cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" }, valueFormatter: (p) => (p.value ? `−${usd(p.value)}` : "—"), cellClass: (p) => (p.value ? "tabular text-danger" : "tabular text-muted"), enableCellChangeFlash: true },
      { key: "shipped", colId: "shipped", field: "shipped" as never, headerName: "Shipped", width: 150, cellRenderer: (p: ICellRendererParams<Row>) => { const r = p.data as Order; return r.shipped === "yes" ? <span className="flex h-full items-center gap-1 text-sm text-ink-2" title={r.tracking}><Truck aria-hidden className="size-3.5 text-success" />{r.tracking.split(" ")[0]}</span> : <span className="text-sm text-muted">not yet</span>; }, enableCellChangeFlash: true },
      { key: "ship_by", colId: "ship_by", field: "ship_by" as never, headerName: "Ship by", width: 124, editable: true, cellEditor: "agDateStringCellEditor", cellClass: "text-ink-2" },
      { key: "note", colId: "note", field: "note" as never, headerName: "Note (only you)", flex: 1, minWidth: 160, editable: true, cellClass: "text-ink-2", sortable: false },
      { key: "paypal", colId: "paypal", field: "paypal" as never, headerName: "PayPal order", width: 170, cellClass: "font-mono text-xs text-paypal", sortable: false },
    ];
    return all.filter((c) => show(c.key)).map((c) => Object.fromEntries(Object.entries(c).filter(([k]) => k !== "key")) as ColDef<Row>);
  }, [view.columns]);

  // Keep detail rows under their order and orders inside their group, whatever column the seller sorts by.
  const postSortRows = useCallback((p: PostSortRowsParams<Row>) => {
    const nodes = p.nodes;
    const orders = nodes.filter((n) => n.data?.kind === "order");
    const details = new Map(nodes.filter((n) => n.data?.kind === "detail").map((n) => [(n.data as Detail).order, n]));
    const groups = nodes.filter((n) => n.data?.kind === "group");
    const seq: IRowNode<Row>[] = [];
    const withDetail = (n: IRowNode<Row>) => {
      seq.push(n);
      const d = details.get((n.data as Order).order);
      if (d) seq.push(d);
    };
    if (!groups.length) orders.forEach(withDetail);
    else
      for (const g of groups) {
        seq.push(g);
        orders.filter((n) => (n.data as Order).group === (g.data as Group).id).forEach(withDetail);
      }
    nodes.splice(0, nodes.length, ...seq);
  }, []);

  const onEdit = useCallback(async (e: CellValueChangedEvent<Row>) => {
    const r = e.data as Order;
    const field = e.colDef.field as "note" | "ship_by";
    const res = await fetch(`/api/seller/orders/${r.order}/ledger`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ [field]: e.newValue ?? "" }) });
    if (!res.ok) e.node.setDataValue(field, e.oldValue);
  }, []);

  return (
    <div className="h-full min-h-[420px]" data-testid="orders-grid" data-edition={edition.enterprise ? "enterprise" : "community"} data-rows={rows.length}>
      <AgGridReact<Row>
        theme={theme}
        rowData={data}
        columnDefs={cols}
        defaultColDef={{ resizable: true, sortable: true, suppressHeaderMenuButton: true, cellStyle: { display: "flex", alignItems: "center" } }}
        getRowId={(p: GetRowIdParams<Row>) => p.data.id}
        isFullWidthRow={(p) => p.rowNode.data?.kind !== "order"}
        fullWidthCellRenderer={(p: ICellRendererParams<Row>) => (p.data?.kind === "group" ? <GroupHeader data={p.data} onToggle={toggleGroup} /> : p.data?.kind === "detail" ? <DetailPanel order={p.data.order} /> : null)}
        getRowHeight={(p: RowHeightParams<Row>) => (p.data?.kind === "detail" ? 300 : p.data?.kind === "group" ? 42 : 52)}
        postSortRows={postSortRows}
        onSortChanged={(e) => {
          const s = e.api.getColumnState().find((c) => c.sort);
          const map: Record<string, NonNullable<GridView["sort"]>["field"]> = { at: "date", total: "total", refunded: "refunded", product: "product", status: "status" };
          if (e.source === "uiColumnSorted") onSortChange?.(s && map[s.colId] ? { field: map[s.colId]!, dir: s.sort as "asc" | "desc" } : null);
        }}
        onRowClicked={(e: RowClickedEvent<Row>) => {
          if (e.data?.kind !== "order" || (e.event?.target as HTMLElement | null)?.closest(".ag-cell-inline-editing, button")) return;
          const id = e.data.order;
          setOpen((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
        }}
        onCellValueChanged={onEdit}
        singleClickEdit={false}
        stopEditingWhenCellsLoseFocus
        animateRows
        onGridReady={(e) => {
          api.current = e.api;
          (window as unknown as { __ordersGrid?: GridApi<Row> }).__ordersGrid = e.api;
        }}
        overlayNoRowsTemplate='<span class="text-sm">No orders match this view. Clear a filter, or place an order in the shop.</span>'
        rowClass="cursor-pointer"
      />
    </div>
  );
}
