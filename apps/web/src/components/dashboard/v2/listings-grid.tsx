"use client";

import { useCallback, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { ListingRow } from "@/server/dashboard-v2";
import { cn } from "@/lib/cn";
import { makeLedgerTheme } from "../theme";
import { gridModules } from "../grid-modules";

type Row = ListingRow & { saving?: boolean; error?: string };
const CATEGORIES = ["mugs", "bowls", "vases", "plates", "linens", "decor", "other"];

function Sold({ value }: { value: number[] }) {
  const max = Math.max(1, ...value);
  const total = value.reduce((a, b) => a + b, 0);
  return (
    <span className="flex h-full items-center gap-2" title={`${total} sold in the last 14 days`}>
      <span className="flex h-6 w-24 items-end gap-px" aria-hidden>
        {value.map((v, i) => (
          <span key={i} className={cn("flex-1 rounded-t-[1px]", v ? "bg-clay" : "bg-line")} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
        ))}
      </span>
      <span className="tabular text-sm text-ink-2">{total}</span>
    </span>
  );
}

function SyncCell(p: ICellRendererParams<Row>) {
  const r = p.data!;
  if (r.saving) return <span className="flex h-full items-center gap-1 text-sm text-ink-2"><LoaderCircle aria-hidden className="size-3.5 animate-spin" /> syncing…</span>;
  if (r.error) return <span className="flex h-full items-center gap-1 text-sm text-danger" title={r.error}><CircleAlert aria-hidden className="size-3.5" /> {r.error}</span>;
  return r.sync === "synced" ? (
    <span className="flex h-full items-center gap-1 text-sm text-paypal" title={r.sync_debug ? `PayPal debug id ${r.sync_debug}` : undefined} data-testid="listing-sync">
      <CircleCheck aria-hidden className="size-3.5" /> PayPal synced{r.sync_debug ? <span className="font-mono text-xs text-muted"> · {r.sync_debug.slice(0, 8)}</span> : null}
    </span>
  ) : (
    <span className="flex h-full items-center gap-1 text-sm text-warning" data-testid="listing-sync">
      <CircleAlert aria-hidden className="size-3.5" /> {r.sync}
    </span>
  );
}

/**
 * Listings, editable in place (walkthrough #3; PLAN AG Grid feature 1). Description and category are written to
 * PayPal's catalog (PATCH, the patchable fields); price and stock change only our catalog and apply to the next
 * checkout, never a past order (D-002). Every row shows PayPal's answer.
 */
export function ListingsGrid({ initial }: { initial: ListingRow[] }) {
  useMemo(() => gridModules(), []);
  const [rows, setRows] = useState<Row[]>(initial);
  const theme = useMemo(() => makeLedgerTheme(), []);
  const patch = (variant: string, p: Partial<Row>) => setRows((all) => all.map((r) => (r.variant === variant ? { ...r, ...p } : r)));

  const onEdit = useCallback(async (e: CellValueChangedEvent<Row>) => {
    const r = e.data!;
    const field = e.colDef.field as "description" | "category" | "price" | "stock";
    const body = field === "price" ? { variant_id: r.variant, price: String(e.newValue) } : field === "stock" ? { variant_id: r.variant, stock: Number(e.newValue) } : { [field]: e.newValue };
    const toPayPal = field === "description" || field === "category";
    patch(r.variant, { saving: toPayPal, error: undefined });
    const res = await fetch(`/api/seller/products/${r.product}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const out = (await res.json().catch(() => ({}))) as { paypal?: { ok: boolean; debugId?: string } | null; error?: { message?: string } };
    if (!res.ok) {
      patch(r.variant, { saving: false, error: out.error?.message ?? "Not saved", [field]: e.oldValue } as Partial<Row>);
      return;
    }
    // Description and category belong to the product: every variant row of it shows the new value and sync state.
    setRows((all) =>
      all.map((x) =>
        x.product !== r.product
          ? x
          : x.variant === r.variant || toPayPal
            ? { ...x, [field]: field === "price" ? Number(e.newValue) : e.newValue, saving: false, ...(out.paypal ? { sync: out.paypal.ok ? "synced" : "failed · retry", sync_debug: out.paypal.debugId ?? "" } : {}) }
            : x,
      ),
    );
  }, []);

  const cols = useMemo<ColDef<Row>[]>(
    () => [
      {
        field: "title",
        headerName: "Listing",
        flex: 1.4,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams<Row>) => (
          <span className="flex h-full min-w-0 items-center gap-2">
            {p.data!.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element -- content-hashed, resized server-side
              <img src={p.data!.thumb} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
            ) : (
              <span aria-hidden className="size-9 shrink-0 rounded-sm bg-surface-2" />
            )}
            <span className="grid min-w-0 leading-tight">
              <span className="truncate font-medium text-ink">{p.data!.title}</span>
              <span className="truncate text-xs text-muted">{p.data!.option}</span>
            </span>
          </span>
        ),
      },
      { field: "description", headerName: "Description → PayPal", flex: 2, minWidth: 240, editable: true, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true, cellEditorParams: { maxLength: 1000, rows: 6, cols: 60 }, cellClass: "text-ink-2", tooltipField: "description" },
      { field: "category", headerName: "Category → PayPal", width: 150, editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: CATEGORIES } },
      { field: "price", headerName: "Price", cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" }, width: 104, editable: true, type: "rightAligned", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}`, cellClass: "tabular font-medium", headerTooltip: "Used on the next checkout; never changes a past order" },
      { field: "stock", headerName: "Stock", cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" }, width: 90, editable: true, type: "rightAligned", cellEditor: "agNumberCellEditor", cellEditorParams: { min: 0, max: 100000, precision: 0 }, cellClass: (p) => cn("tabular", Number(p.value) <= 2 && "text-warning font-medium") },
      { field: "sold_14d", headerName: "Sold · 14 days", width: 160, cellRenderer: (p: ICellRendererParams<Row>) => <Sold value={p.value as number[]} />, sortable: false },
      { field: "sync", headerName: "PayPal catalog", width: 200, cellRenderer: SyncCell },
    ],
    [],
  );

  return (
    <div className="h-[340px]" data-testid="listings-grid">
      <AgGridReact<Row>
        theme={theme}
        rowData={rows}
        columnDefs={cols}
        defaultColDef={{ resizable: true, sortable: true, suppressHeaderMenuButton: true, cellStyle: { display: "flex", alignItems: "center" } }}
        getRowId={(p) => p.data.variant}
        rowHeight={52}
        onCellValueChanged={onEdit}
        stopEditingWhenCellsLoseFocus
        tooltipShowDelay={400}
        onGridReady={(e) => ((window as unknown as { __listingsGrid?: unknown }).__listingsGrid = e.api)}
      />
    </div>
  );
}
