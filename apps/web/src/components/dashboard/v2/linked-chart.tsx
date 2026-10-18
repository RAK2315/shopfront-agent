"use client";

import { useEffect, useMemo, useRef } from "react";
import { AgCharts, AllCommunityModule, ModuleRegistry, type AgCartesianChartOptions, type AgChartInstance } from "ag-charts-community";
import type { GridView } from "@shopfront/core";
import type { OrderRow } from "@/server/dashboard-v2";

ModuleRegistry.registerModules([AllCommunityModule]);

export type ChartPreset = NonNullable<GridView["chart"]>;

const TITLES: Record<ChartPreset, string> = {
  revenue_by_day: "Revenue by day",
  revenue_by_product: "Revenue by product",
  orders_by_status: "Orders by status",
  refunds_by_product: "Refunds by product",
};

/** Built from the grid's rows in view, so every filter, Ask or click narrows the chart too (linked, walkthrough #3).
 * Clicking a product bar filters the grid to that product (drill-down). AG Charts Community. */
export function LinkedChart({ rows, chart, onPickProduct }: { rows: OrderRow[]; chart: ChartPreset; onPickProduct: (product: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<AgChartInstance | null>(null);
  const pick = useRef(onPickProduct);
  useEffect(() => {
    pick.current = onPickProduct;
  });

  const data = useMemo(() => {
    const m = new Map<string, number>();
    const add = (k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
    if (chart === "revenue_by_day") {
      for (const d of [...new Set(rows.map((r) => r.date))].sort()) m.set(d, 0);
      for (const r of rows) add(r.date, r.total);
      return [...m].map(([key, value]) => ({ key: key.slice(5), value: Math.round(value * 100) / 100 }));
    }
    for (const r of rows) {
      if (chart === "orders_by_status") add(r.status.replace(/_/g, " "), 1);
      else for (const p of r.product.split(", ")) add(p, chart === "refunds_by_product" ? r.refunded : r.total);
    }
    return [...m]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({ key, value: Math.round(value * 100) / 100 }));
  }, [rows, chart]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const money = chart !== "orders_by_status";
    const horizontal = chart === "revenue_by_product" || chart === "refunds_by_product";
    const fill = chart === "refunds_by_product" ? "#c0392b" : "#b4562b";
    const options = {
      container: el,
      data,
      background: { visible: false },
      padding: { top: 8, right: 16, bottom: 4, left: 4 },
      theme: { baseTheme: "ag-default", params: { fontFamily: "Geist, system-ui, sans-serif", fontSize: 12, foregroundColor: "#5b524c" } },
      series: [
        chart === "revenue_by_day"
          ? {
              type: "area",
              xKey: "key",
              yKey: "value",
              yName: "Revenue",
              fill,
              stroke: fill,
              fillOpacity: 0.14,
              strokeWidth: 2,
              marker: { enabled: true, size: 5, fill, stroke: fill },
            }
          : {
              type: "bar",
              direction: horizontal ? "horizontal" : "vertical",
              xKey: "key",
              yKey: "value",
              yName: money ? "USD" : "Orders",
              fill,
              cornerRadius: 4,
              label: { enabled: true, color: "#fff", fontSize: 11, formatter: ({ value }: { value: number }) => (money ? `$${Math.round(value)}` : String(value)) },
              cursor: horizontal ? "pointer" : "default",
              listeners: horizontal ? { nodeClick: (e: { datum: { key: string } }) => pick.current(e.datum.key) } : undefined,
            },
      ],
      axes: [
        { type: "category", position: horizontal ? "left" : "bottom", label: { fontSize: 11 } },
        { type: "number", position: horizontal ? "bottom" : "left", label: { fontSize: 11, formatter: ({ value }: { value: number }) => (money ? `$${value}` : String(value)) } },
      ],
      legend: { enabled: false },
    } as unknown as AgCartesianChartOptions;
    if (!inst.current) inst.current = AgCharts.create(options);
    else void inst.current.update(options);
  }, [data, chart]);
  useEffect(
    () => () => {
      inst.current?.destroy();
      inst.current = null;
    },
    [],
  );

  return (
    <figure className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-1 rounded-lg border border-line bg-surface p-3" data-testid="linked-chart" data-chart={chart} data-points={data.length}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-sm font-semibold text-ink">{TITLES[chart]}</span>
        <span className="text-xs text-muted">
          {rows.length} order{rows.length === 1 ? "" : "s"} in view{chart.endsWith("product") ? " · click a bar to drill in" : ""}
        </span>
      </figcaption>
      <div className="relative min-h-[240px]">
        <div ref={host} className="absolute inset-0" />
        {!data.length && <p className="absolute inset-0 grid place-items-center text-sm text-ink-2">No orders match this view yet.</p>}
      </div>
    </figure>
  );
}
