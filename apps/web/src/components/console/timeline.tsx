"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bot,
  Cable,
  ChevronDown,
  ClipboardCheck,
  Cpu,
  CreditCard,
  RefreshCw,
  Server,
  ShoppingCart,
  Store,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RequestId } from "@/components/ui/request-id";
import { AI_SOURCE_LABEL, type AiSource } from "@/lib/ai-source";
import { cn } from "@/lib/cn";

export type TimelineActor =
  | "buyer_agent"
  | "mcp"
  | "server"
  | "paypal"
  | "webhook"
  | "poller"
  | "seller"
  | "ops_agent"
  | "llm"
  | "cart_api";

export type { AiSource } from "@/lib/ai-source";

export interface TimelineItem {
  id: string;
  actor: TimelineActor;
  title: string;
  detail?: string;
  at: string; // ISO
  ids?: Array<{ label: string; value: string; paypal?: boolean }>;
  aiSource?: AiSource;
  durationMs?: number;
  outcome?: "ok" | "error" | "blocked";
  /** Set on the first row of a group (the /live "group by checkout" view): shown as a header above it. */
  group?: string;
}

const ACTOR: Record<TimelineActor, { label: string; icon: LucideIcon; glyph: string }> = {
  buyer_agent: { label: "Buyer agent", icon: Bot, glyph: "bg-clay text-white" },
  mcp: { label: "MCP", icon: Cable, glyph: "bg-ink-panel-text text-ink-panel" },
  server: { label: "Shopfront", icon: Server, glyph: "bg-ink-panel-2 text-ink-panel-text ring-1 ring-ink-panel-line" },
  paypal: { label: "PayPal", icon: CreditCard, glyph: "bg-paypal-bright text-white" },
  webhook: { label: "Webhook", icon: Webhook, glyph: "bg-success text-white" },
  poller: { label: "Fallback check", icon: RefreshCw, glyph: "bg-warning text-white" },
  seller: { label: "Seller", icon: Store, glyph: "bg-ink-panel-text text-ink-panel" },
  ops_agent: { label: "Seller agent", icon: ClipboardCheck, glyph: "bg-clay-soft text-clay-strong" },
  llm: { label: "Model", icon: Cpu, glyph: "bg-ink-panel-2 text-ink-panel-muted ring-1 ring-ink-panel-line" },
  cart_api: { label: "Cart API", icon: ShoppingCart, glyph: "bg-clay-soft text-clay-strong" },
};


const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Event families (walkthrough #7): one accent per system, always with its icon and label, never colour alone. */
const FAMILY: Record<TimelineActor, "agent" | "mcp" | "paypal" | "webhook" | "shop"> = {
  buyer_agent: "agent",
  ops_agent: "agent",
  llm: "agent",
  mcp: "mcp",
  cart_api: "mcp", // the agent-facing protocol lane: MCP or PayPal's Cart API
  paypal: "paypal",
  webhook: "webhook",
  poller: "webhook",
  server: "shop",
  seller: "shop",
};
const RULE: Record<(typeof FAMILY)[TimelineActor], string> = {
  agent: "before:bg-clay",
  mcp: "before:bg-ink-panel-muted",
  paypal: "before:bg-paypal-bright",
  webhook: "before:bg-success",
  shop: "before:bg-ink-panel-line",
};

/** "12 s ago" for a live feed; the exact clock time is in the tooltip. */
export function ago(iso: string, now: number | null) {
  if (!now) return time.format(new Date(iso));
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s} s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

function useNow(everyMs: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [everyMs]);
  return now;
}

const KEY_PAYPAL_IDS = ["Capture", "Refund", "Order"];

export function TimelineEvent({ item, now = null }: { item: TimelineItem; now?: number | null }) {
  const [open, setOpen] = useState(false);
  const a = ACTOR[item.actor];
  const Icon = a.icon;
  const family = FAMILY[item.actor];
  const paypal = family === "paypal";
  // PayPal rows keep their one key id in view (the proof); every other id, latency and model sit behind Details.
  const keyId = paypal ? KEY_PAYPAL_IDS.map((l) => item.ids?.find((x) => x.label === l)).find(Boolean) : undefined;
  const rest = (item.ids ?? []).filter((x) => x !== keyId);
  const honesty = item.aiSource === "cache" || item.aiSource === "replay";
  const details = rest.length + (item.aiSource && !honesty ? 1 : 0) + (item.durationMs !== undefined ? 1 : 0);
  return (
    <div
      className={cn(
        "relative grid grid-cols-[1.75rem_1fr] gap-x-3 py-2.5 before:absolute before:inset-y-2 before:-left-4 before:w-0.5 before:rounded-pill",
        RULE[family],
      )}
      data-family={family}
    >
      <span className={cn("relative z-[1] mt-0.5 grid size-7 place-items-center rounded-md", a.glyph)}>
        <Icon aria-hidden className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={cn("text-xs font-medium", paypal ? "text-[oklch(0.78_0.1_255)]" : "text-ink-panel-muted")}>{a.label}</span>
          <span
            className={cn(
              "font-medium text-ink-panel-text",
              paypal ? "text-md" : "text-base",
              item.outcome === "error" && "text-[oklch(0.78_0.12_27)]",
              item.outcome === "blocked" && "text-[oklch(0.8_0.11_70)]",
            )}
          >
            {item.title}
          </span>
          <span className="ml-auto shrink-0 text-xs tabular text-ink-panel-muted" title={new Date(item.at).toLocaleString()} suppressHydrationWarning>
            {ago(item.at, now)}
          </span>
        </div>
        {item.detail && <p className="mt-0.5 text-sm text-ink-panel-muted">{item.detail}</p>}
        {(keyId || honesty || details > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {keyId && <RequestId label={keyId.label} value={keyId.value} tone="paypal" />}
            {honesty && item.aiSource && <Badge tone="panel">{AI_SOURCE_LABEL[item.aiSource]}</Badge>}
            {details > 0 && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-xs text-ink-panel-muted transition-colors hover:bg-ink-panel-2 hover:text-ink-panel-text"
                data-testid="event-details-toggle"
              >
                Details · {details}
                <ChevronDown aria-hidden className={cn("size-3 transition-transform", open && "rotate-180")} />
              </button>
            )}
          </div>
        )}
        {open && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5" data-testid="event-details">
            {item.aiSource && !honesty && <Badge tone="panel">{AI_SOURCE_LABEL[item.aiSource]}</Badge>}
            {item.durationMs !== undefined && <Badge tone="panel">{item.durationMs} ms</Badge>}
            {rest.map((x) => (
              <RequestId key={x.label + x.value} label={x.label} value={x.value} tone={x.paypal ? "paypal" : "panel"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type WireState = "live" | "connecting" | "reconnecting" | "paused";

const WIRE_LABEL: Record<WireState, string> = {
  live: "Connected",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  paused: "Paused",
};

/** The live wire: newest event on top, each one slides in. Rendered on the inverted ink panel. */
export function Timeline({
  items,
  live = true,
  state,
  title = "Live timeline",
  emptyText = "Waiting for the first agent call. Try the buyer chat on the left.",
  toolbar,
  footer,
  guide,
  className,
  listClassName,
}: {
  items: TimelineItem[];
  /** Shown under the list while it has fewer than 4 rows, so a quiet wire still explains itself (review v2 #8). */
  guide?: ReactNode;
  live?: boolean;
  state?: WireState;
  title?: string;
  emptyText?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
  listClassName?: string;
}) {
  const reduce = useReducedMotion();
  const now = useNow(10_000);
  const wire: WireState = state ?? (live ? "live" : "paused");
  return (
    <section aria-label={title} className={cn("flex min-h-0 flex-col rounded-lg bg-ink-panel text-ink-panel-text", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-panel-line px-4 py-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-3">
          {toolbar}
          <span className="inline-flex items-center gap-2 text-xs text-ink-panel-muted" role="status">
            <span
              className={cn(
                "size-2 rounded-pill",
                wire === "live" ? "bg-success animate-live-pulse" : wire === "paused" ? "bg-ink-panel-muted" : "bg-warning",
              )}
              aria-hidden
            />
            {WIRE_LABEL[wire]}
          </span>
        </div>
      </header>
      <ol
        className={cn(
          "relative min-h-0 flex-1 px-4 py-1 before:absolute before:top-4 before:bottom-4 before:left-[1.85rem] before:w-px before:bg-ink-panel-line",
          listClassName,
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {item.group && (
                <p className="relative z-[1] -mx-1 mt-3 mb-1 truncate rounded-sm bg-ink-panel-2 px-2 py-1 text-xs font-medium text-ink-panel-text" data-testid="timeline-group">
                  {item.group}
                </p>
              )}
              <TimelineEvent item={item} now={now} />
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 && <li className="py-6 text-center text-sm text-ink-panel-muted">{emptyText}</li>}
      </ol>
      {guide && items.length < 4 && <div className="border-t border-ink-panel-line px-4 py-3" data-testid="wire-guide">{guide}</div>}
      {footer && <footer className="border-t border-ink-panel-line px-4 py-2.5 text-xs text-ink-panel-muted">{footer}</footer>}
    </section>
  );
}
