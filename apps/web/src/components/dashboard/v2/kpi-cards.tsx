"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Kpis } from "@/server/dashboard-v2";
import { cn } from "@/lib/cn";

function Spark({ values, tone }: { values: number[]; tone: "clay" | "ink" | "danger" }) {
  const max = Math.max(1, ...values);
  const w = 120;
  const h = 32;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(" ");
  const stroke = tone === "clay" ? "var(--color-clay)" : tone === "danger" ? "var(--color-danger)" : "var(--color-ink-2)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={stroke} opacity="0.08" />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Delta({ now, prev, invert = false }: { now: number; prev: number; invert?: boolean }) {
  if (!prev && !now) return <span className="text-xs text-muted">no orders in either week</span>;
  if (!prev) return <span className="text-xs font-medium text-success">new this week</span>;
  const pct = Math.round(((now - prev) / prev) * 100);
  const good = invert ? pct < 0 : pct > 0;
  const Icon = pct === 0 ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", pct === 0 ? "text-ink-2" : good ? "text-success" : "text-danger")}>
      <Icon aria-hidden className="size-3.5" />
      {Math.abs(pct)}% <span className="font-normal text-muted">vs prior 7 days</span>
    </span>
  );
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Four numbers a one-person shop checks first (walkthrough #3). Every figure is from our database, labelled. */
export function KpiCards({ k }: { k: Kpis }) {
  const cards = [
    { id: "revenue", label: "Revenue", value: usd(k.revenue.now), delta: <Delta now={k.revenue.now} prev={k.revenue.prev} />, spark: k.days.map((d) => d.revenue), tone: "clay" as const },
    { id: "orders", label: "Orders", value: String(k.orders.now), delta: <Delta now={k.orders.now} prev={k.orders.prev} />, spark: k.days.map((d) => d.orders), tone: "ink" as const },
    { id: "aov", label: "Average order", value: usd(k.aov.now), delta: <Delta now={k.aov.now} prev={k.aov.prev} />, spark: k.days.map((d) => (d.orders ? d.revenue / d.orders : 0)), tone: "ink" as const },
    { id: "refunds", label: "Refund rate", value: `${k.refundRate.now}%`, delta: <Delta now={k.refundRate.now} prev={k.refundRate.prev} invert />, spark: k.days.map((d) => d.refunds), tone: "danger" as const },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="kpi-cards">
      {cards.map((c) => (
        <li key={c.id} className="grid min-w-0 gap-1 rounded-lg border border-line bg-surface p-4" data-testid={`kpi-${c.id}`}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-ink-2">{c.label}</span>
            <span className="shrink-0 rounded-sm border border-line bg-surface-2 px-1.5 font-mono text-[11px] text-ink-2" title="From the Shopfront database, live">
              [db] 7d
            </span>
          </div>
          <span className="font-display text-2xl font-semibold tabular sm:text-[2rem] sm:leading-10" data-testid={`kpi-${c.id}-value`}>
            {c.value}
          </span>
          {c.delta}
          <Spark values={c.spark} tone={c.tone} />
        </li>
      ))}
    </ul>
  );
}
