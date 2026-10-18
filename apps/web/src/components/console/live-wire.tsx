"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Cable, CreditCard, Layers, ShieldCheck, X } from "lucide-react";
import type { ConsoleCheckout, LiveStats } from "@/server/console";
import type { ShopEvent } from "@/server/events";
import { ConfirmationBadge } from "@/components/console/confirmation-badge";
import { toTimelineItem } from "@/components/console/event-item";
import { Timeline, type WireState } from "@/components/console/timeline";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { RequestId } from "@/components/ui/request-id";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

const MAX_EVENTS = 150;
const clock = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

/**
 * The live console: the SSE timeline (every agent → MCP → PayPal → webhook step) beside recent checkouts.
 * Server-rendered with the latest events, then follows /api/events; EventSource resumes with Last-Event-ID.
 */
/** The KPI strip (walkthrough #7): 24 hours from the database, then counted up live as events arrive. */
function StatStrip({ stats }: { stats: LiveStats }) {
  const cells = [
    { id: "agent", label: "Agent steps", value: stats.agentSteps, icon: Bot, tone: "text-clay" },
    { id: "mcp", label: "MCP calls", value: stats.mcpCalls, icon: Cable, tone: "text-ink-2" },
    { id: "payments", label: "Payments captured", value: stats.payments, icon: CreditCard, tone: "text-paypal" },
    { id: "blocked", label: "Attacks blocked", value: stats.blocked, icon: ShieldCheck, tone: "text-success" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Last 24 hours" data-testid="live-stats">
      {cells.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3" data-testid={`live-stat-${c.id}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2" aria-hidden>
            <c.icon className={cn("size-4", c.tone)} />
          </span>
          <span className="grid min-w-0">
            <span className="font-display text-2xl font-semibold tabular leading-7" data-testid={`live-stat-${c.id}-value`}>
              {c.value}
            </span>
            <span className="truncate text-xs text-ink-2">{c.label} · 24 h</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function bump(stats: LiveStats, e: ShopEvent): LiveStats {
  const d = (e.data ?? {}) as { errorCode?: string };
  return {
    ...stats,
    agentSteps: stats.agentSteps + (e.actor === "buyer_agent" || e.actor === "ops_agent" ? 1 : 0),
    mcpCalls: stats.mcpCalls + (e.actor === "mcp" && e.kind !== "tool_error" ? 1 : 0),
    payments: stats.payments + (e.kind === "captured" ? 1 : 0),
    blocked: stats.blocked + ((e.kind === "tool_error" && d.errorCode === "VALIDATION_ERROR") || e.kind === "webhook_rejected" ? 1 : 0),
  };
}

export function LiveWire({ initialEvents, initialCheckouts, initialStats, after: start }: { initialEvents: ShopEvent[]; initialCheckouts: ConsoleCheckout[]; initialStats: LiveStats; after?: number }) {
  const [stats, setStats] = useState(initialStats);
  const [grouped, setGrouped] = useState(false);
  const [events, setEvents] = useState<ShopEvent[]>(() => [...initialEvents].sort((a, b) => b.id - a.id));
  const [checkouts, setCheckouts] = useState(initialCheckouts);
  const [wire, setWire] = useState<WireState>("connecting");
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetchCheckouts = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch("/api/console/checkouts", { cache: "no-store" });
        if (r.ok) setCheckouts(((await r.json()) as { checkouts: ConsoleCheckout[] }).checkouts);
      } catch {
        /* the next event retries */
      }
    }, 350);
  }, []);

  useEffect(() => {
    const after = initialEvents.reduce((m, e) => Math.max(m, e.id), start ?? 0);
    const es = new EventSource(`/api/events?after=${after}`);
    es.onopen = () => setWire("live");
    es.onerror = () => setWire(es.readyState === EventSource.CLOSED ? "paused" : "reconnecting");
    es.addEventListener("shop", (msg) => {
      const ev = JSON.parse((msg as MessageEvent<string>).data) as ShopEvent;
      setEvents((prev) => {
        if (prev.some((p) => p.id === ev.id)) return prev;
        setStats((s) => bump(s, ev));
        return [ev, ...prev].slice(0, MAX_EVENTS);
      });
      if (ev.checkoutId) refetchCheckouts();
    });
    return () => es.close();
  }, [initialEvents, start, refetchCheckouts]);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  const items = useMemo(() => {
    const list = events.filter((e) => !selected || e.checkoutId === selected);
    if (!grouped || selected) return list.map(toTimelineItem);
    // Group by checkout: each checkout's events together (newest activity first), other activity last.
    const order: string[] = [];
    const by = new Map<string, ShopEvent[]>();
    for (const e of list) {
      const k = e.checkoutId ?? "~other";
      if (!by.has(k)) {
        by.set(k, []);
        order.push(k);
      }
      by.get(k)!.push(e);
    }
    order.sort((a, b) => (a === "~other" ? 1 : b === "~other" ? -1 : 0));
    return order.flatMap((k) =>
      by.get(k)!.map((e, i) => {
        const it = toTimelineItem(e);
        if (i !== 0) return it;
        const c = checkouts.find((x) => x.id === k);
        const head = k === "~other" ? "Other activity" : `${c?.items || "Checkout"} · ${k}${c ? ` · ${c.status.replace(/_/g, " ")}` : ""}`;
        return { ...it, group: head };
      }),
    );
  }, [events, selected, grouped, checkouts]);

  return (
    <div className="grid gap-4">
    <StatStrip stats={stats} />
    <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <Timeline
        items={items}
        state={wire}
        title={selected ? "Timeline for one checkout" : grouped ? "Live timeline · by checkout" : "Live timeline"}
        emptyText={selected ? "No events for this checkout yet." : "Waiting for the first agent call. Point any MCP client at /mcp."}
        className="max-h-[75dvh] lg:max-h-none lg:h-[calc(100dvh-11rem)] lg:min-h-[32rem]"
        listClassName="overflow-y-auto overscroll-contain"
        toolbar={
          !selected ? (
            <button
              type="button"
              aria-pressed={grouped}
              onClick={() => setGrouped((v) => !v)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-sm border px-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay",
                grouped ? "border-clay bg-clay text-white" : "border-ink-panel-line bg-ink-panel-2 text-ink-panel-text hover:border-ink-panel-muted/50",
              )}
              data-testid="group-by-checkout"
            >
              <Layers aria-hidden className="size-3" /> Group by checkout
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex h-6 items-center gap-1 rounded-sm border border-ink-panel-line bg-ink-panel-2 px-1.5 text-xs text-ink-panel-text transition-colors hover:border-ink-panel-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              <span className="font-mono">{selected}</span>
              <X aria-hidden className="size-3" />
              <span className="sr-only">Show all events</span>
            </button>
          )
        }
      />

      <section aria-labelledby="checkouts-h" className="flex min-h-0 flex-col rounded-lg border border-line bg-surface lg:h-[calc(100dvh-11rem)] lg:min-h-[32rem]">
        <header className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
          <h2 id="checkouts-h" className="text-sm font-medium">
            Checkouts
          </h2>
          <span className="text-xs text-muted">Select one to follow it</span>
        </header>
        {checkouts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">No checkouts yet.</p>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain">
            {checkouts.map((c) => {
              const on = selected === c.id;
              return (
                <li key={c.id} className={cn("relative grid gap-2 px-4 py-3 transition-colors", on ? "bg-clay-soft" : "hover:bg-surface-2")}>
                  {on && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-pill bg-clay" />}
                  <div className="flex items-baseline justify-between gap-3">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected(on ? null : c.id)}
                      className="min-w-0 text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-clay"
                    >
                      <span className="block truncate text-base font-medium text-ink">{c.items || "Checkout"}</span>
                      <span className="block font-mono text-xs text-muted">{c.id}</span>
                    </button>
                    <Money cents={c.totalCents} currency={c.currency} className="shrink-0 text-base font-medium" />
                  </div>
                  <div className="relative flex flex-wrap items-center gap-1.5">
                    <StatusPill status={c.status} />
                    <ConfirmationBadge confirmation={c.confirmation} />
                    {c.buyerCountry && <Badge title="Buyer country, from PayPal">{c.buyerCountry}</Badge>}
                    <span className="ml-auto text-xs text-muted tabular" title={new Date(c.createdAt).toISOString()} suppressHydrationWarning>
                      {now ? ago(c.createdAt, now) : clock.format(new Date(c.createdAt))}
                    </span>
                  </div>
                  {(c.paypalOrderId || c.captureId) && (
                    <div className="relative flex flex-wrap gap-1.5">
                      {c.paypalOrderId && <RequestId label="Order" value={c.paypalOrderId} tone="paypal" />}
                      {c.captureId && <RequestId label="Capture" value={c.captureId} tone="paypal" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
    </div>
  );
}
