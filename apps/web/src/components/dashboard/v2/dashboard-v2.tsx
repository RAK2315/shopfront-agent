"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, BarChart3, Layers, RotateCcw, Search, Sparkles, Undo2, X } from "lucide-react";
import { CHART_PRESETS, describeViewChange, EMPTY_VIEW, GROUP_FIELDS, mergeView, type GridView } from "@shopfront/core";
import type { ShopEvent } from "@/server/events";
import type { Kpis, ListingRow, OrderRow } from "@/server/dashboard-v2";
import type { AskAnswer } from "@/server/dashboard-ask";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { RefundQueueWidget, useLiveEvents } from "../widgets";
import { KpiCards } from "./kpi-cards";
import { LinkedChart, type ChartPreset } from "./linked-chart";
import { ListingsGrid } from "./listings-grid";
import { OrdersGrid, rowsInView } from "./orders-grid";

type Data = { orders: OrderRow[]; kpis: Kpis; listings: ListingRow[] };
type Banner = { title: string; changes: string[]; source?: string } | null;

const SUGGESTIONS = ["What sold this week?", "Unshipped orders over $50", "Group by product, biggest first", "Refunds by product this month"];
const label = (s: string) => s.replace(/_/g, " ");

/** The chips under the toolbar: every active filter, each removable (the grid's state, made visible). */
function chipsOf(v: GridView): Array<{ key: keyof GridView; text: string }> {
  const out: Array<{ key: keyof GridView; text: string }> = [];
  if (v.last_days) out.push({ key: "last_days", text: `Last ${v.last_days} day${v.last_days > 1 ? "s" : ""}` });
  if (v.statuses?.length) out.push({ key: "statuses", text: v.statuses.map(label).join(" or ") });
  if (v.product_contains) out.push({ key: "product_contains", text: `“${v.product_contains}”` });
  if (v.min_total != null) out.push({ key: "min_total", text: `Over $${v.min_total}` });
  if (v.max_total != null) out.push({ key: "max_total", text: `Under $${v.max_total}` });
  if (v.shipped) out.push({ key: "shipped", text: v.shipped === "yes" ? "Shipped" : "Not shipped" });
  return out;
}

export function DashboardV2({ initial }: { initial: Data }) {
  const reduce = useReducedMotion();
  const [data, setData] = useState(initial);
  const [view, setView] = useState<GridView>(EMPTY_VIEW);
  const [history, setHistory] = useState<GridView[]>([]);
  const [search, setSearch] = useState("");
  const [askText, setAskText] = useState("");
  const [asking, setAsking] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [answer, setAnswer] = useState<Extract<AskAnswer, { kind: "question" }> | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const change = (next: GridView, title?: string, source?: string) => {
    const changes = describeViewChange(view, next);
    if (!changes.length) return;
    setHistory((h) => [...h.slice(-19), view]);
    setBanner(title || source ? { title: title ?? "View updated", changes, source } : null);
    setView(next);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setView(prev);
    setBanner(null);
    setHistory((h) => h.slice(0, -1));
  };

  // Live: any order or refund event refreshes the data (KPIs are recomputed on the server from the same rows).
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onEvent = useCallback((e: ShopEvent) => {
    if (!e.checkoutId && !e.kind.startsWith("refund") && !e.kind.startsWith("listing") && !e.kind.startsWith("catalog")) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch("/api/seller/dashboard/v2", { cache: "no-store" });
      if (r.ok) setData((await r.json()) as Data);
    }, 700);
  }, []);
  const wire = useLiveEvents(onEvent);
  useEffect(() => () => clearTimeout(timer.current), []);

  const inView = useMemo(() => rowsInView(data.orders, view, search), [data.orders, view, search]);
  const chart: ChartPreset = view.chart ?? (view.group_by === "status" ? "orders_by_status" : view.group_by === "product" ? "revenue_by_product" : "revenue_by_day");

  // Handles for the acceptance tests (state, not pixels): the current view and the rows in it.
  useEffect(() => {
    (window as unknown as { __dashboard?: unknown }).__dashboard = { view, rows: inView.length, orders: data.orders.length, chart };
  }, [view, inView.length, data.orders.length, chart]);

  const ask = async (text: string) => {
    if (!text.trim() || asking) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      const r = await fetch("/api/seller/dashboard/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const out = (await r.json()) as AskAnswer & { error?: { message?: string } };
      if (!r.ok) throw new Error(out.error?.message ?? "The assistant is unavailable right now.");
      if (out.kind === "view") {
        const next = mergeView(view, out.view);
        if (!describeViewChange(view, next).length) setBanner({ title: out.title, changes: ["Already showing this view"], source: out.source });
        else change(next, out.title, out.source);
      } else setAnswer(out);
      setAskText("");
    } catch (e) {
      setAskError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  };

  const chips = chipsOf(view);
  return (
    <div className="mx-auto grid w-full max-w-[96rem] gap-4 px-3 py-4 sm:px-5" data-testid="dashboard-v2" data-wire={wire}>
      {/* Ask: the AI changes the view; deterministic code applies it; Undo restores the last one. */}
      <section className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4" aria-label="Ask your dashboard">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(askText);
          }}
        >
          <label htmlFor="dash-ask" className="sr-only">
            Ask your dashboard
          </label>
          <div className="relative min-w-0 flex-1">
            <Sparkles aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-clay" />
            <input
              id="dash-ask"
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="Ask your dashboard: “unshipped orders over $50 this week”"
              maxLength={400}
              className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-md outline-none transition-colors focus:border-clay"
              data-testid="dash-ask-input"
            />
          </div>
          <Button type="submit" size="lg" loading={asking} disabled={!askText.trim()} className="w-11 px-0 sm:w-auto sm:px-5" aria-label="Ask" data-testid="dash-ask-submit">
            <ArrowUp aria-hidden className="size-4 sm:hidden" />
            <span className="hidden sm:inline">Ask</span>
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => void ask(s)} disabled={asking} className="rounded-pill border border-line bg-surface-2 px-3 py-1 text-sm text-ink-2 transition-colors hover:border-clay hover:text-ink disabled:opacity-50" data-testid="dash-suggestion">
              {s}
            </button>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {banner && (
            <motion.div key="banner" initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-clay/30 bg-clay-soft/60 px-3 py-2.5" role="status" data-testid="dash-change-banner">
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-ink">
                  <Sparkles aria-hidden className="mr-1 inline size-3.5 text-clay" />
                  {banner.title}
                </p>
                <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-2">
                  {banner.changes.map((c) => (
                    <li key={c} data-testid="dash-change">
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">The assistant changed the view only. It can&apos;t change orders, prices or refunds.</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={undo} disabled={!history.length} data-testid="dash-undo">
                  <Undo2 aria-hidden className="size-3.5" /> Undo
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBanner(null)} aria-label="Dismiss">
                  <X aria-hidden className="size-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
          {answer && (
            <motion.div key="answer" initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-1.5 rounded-md border border-line bg-canvas px-3 py-2.5" data-testid="dash-answer">
              <p className="text-sm font-semibold text-ink">{answer.title}</p>
              {answer.lines.map((l) => (
                <p key={l} className="font-mono text-sm text-ink" data-testid="dash-answer-line">
                  {l}
                </p>
              ))}
              {answer.top && <p className="text-sm text-ink-2">{answer.top}</p>}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => change({ ...view, last_days: answer.days, chart: "revenue_by_product" }, `Sales by product · last ${answer.days} days`)}>
                  <BarChart3 aria-hidden className="size-3.5" /> Show it in the grid and chart
                </Button>
                <span className="text-xs text-muted">[db] is live from our database; [paypal] is PayPal Transaction Search, which can lag about 3 hours.</span>
              </div>
            </motion.div>
          )}
          {askError && (
            <p className="text-sm text-danger" role="alert">
              {askError}
            </p>
          )}
        </AnimatePresence>
      </section>

      <KpiCards k={data.kpis} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-2 rounded-lg border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-base font-semibold text-ink">
              Orders <span className="font-normal text-ink-2">· {inView.length} of {data.orders.length}</span>
            </h2>
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders" className="h-9 w-40 rounded-md border border-line-strong bg-surface pl-8 pr-2 text-sm outline-none focus:border-clay sm:w-48" aria-label="Search orders" data-testid="orders-search" />
            </div>
            <label className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink-2">
              <Layers aria-hidden className="size-3.5" />
              <span className="sr-only sm:not-sr-only">Group</span>
              <select value={view.group_by ?? ""} onChange={(e) => change({ ...view, group_by: (e.target.value || null) as GridView["group_by"] })} className="bg-transparent text-ink outline-none" data-testid="group-select">
                <option value="">None</option>
                {GROUP_FIELDS.map((g) => (
                  <option key={g} value={g}>
                    {label(g)}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink-2">
              <BarChart3 aria-hidden className="size-3.5" />
              <span className="sr-only sm:not-sr-only">Chart</span>
              <select value={chart} onChange={(e) => change({ ...view, chart: e.target.value as ChartPreset })} className="bg-transparent text-ink outline-none" data-testid="chart-select">
                {CHART_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </label>
            {(chips.length > 0 || view.group_by || view.sort || view.columns) && (
              <Button size="sm" variant="ghost" onClick={() => change(EMPTY_VIEW, "View reset")} data-testid="dash-reset">
                <RotateCcw aria-hidden className="size-3.5" /> Reset
              </Button>
            )}
          </div>
          {chips.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" data-testid="filter-chips">
              {chips.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => change({ ...view, [c.key]: null })} className="inline-flex h-7 items-center gap-1 rounded-pill border border-clay/30 bg-clay-soft px-2.5 text-sm text-clay-strong hover:border-clay" data-testid="filter-chip">
                    {c.text} <X aria-hidden className="size-3" />
                    <span className="sr-only">remove filter</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="h-[460px]">
            <OrdersGrid rows={inView} view={view} onSortChange={(s) => change({ ...view, sort: s })} />
          </div>
          <p className="text-xs text-muted">Click an order for its full PayPal history. Notes and ship-by dates are yours to edit; nothing here changes money.</p>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <div className="h-[330px]">
            <LinkedChart rows={inView} chart={chart} onPickProduct={(p) => change({ ...view, product_contains: p }, `Drilled into ${p}`)} />
          </div>
          <div className={cn("rounded-lg border border-line bg-surface")}>
            <RefundQueueWidget />
          </div>
        </div>
      </section>

      <section className="grid gap-2 rounded-lg border border-line bg-surface p-3" aria-label="Listings">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">
            Listings <span className="font-normal text-ink-2">· {data.listings.length} variants</span>
          </h2>
          <p className="text-xs text-muted">Double-click to edit. Description and category update PayPal&apos;s catalog; price and stock apply to the next checkout.</p>
        </div>
        <ListingsGrid initial={data.listings} />
      </section>
    </div>
  );
}
