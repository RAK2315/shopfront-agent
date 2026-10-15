"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bot,
  Cable,
  ClipboardCheck,
  Cpu,
  CreditCard,
  RefreshCw,
  Server,
  Store,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RequestId } from "@/components/ui/request-id";
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
  | "llm";

export type AiSource = "gemini" | "groq" | "cache" | "replay";

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
};

const SOURCE_LABEL: Record<AiSource, string> = { gemini: "Gemini", groq: "Groq", cache: "Cache", replay: "Replay" };

const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export function TimelineEvent({ item }: { item: TimelineItem }) {
  const a = ACTOR[item.actor];
  const Icon = a.icon;
  return (
    <div className="relative grid grid-cols-[1.75rem_1fr] gap-x-3 py-2.5">
      <span className={cn("relative z-[1] mt-0.5 grid size-7 place-items-center rounded-md", a.glyph)}>
        <Icon aria-hidden className="size-3.5" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-ink-panel-muted">{a.label}</span>
          <span
            className={cn(
              "text-base font-medium text-ink-panel-text",
              item.outcome === "error" && "text-[oklch(0.78_0.12_27)]",
              item.outcome === "blocked" && "text-[oklch(0.8_0.11_70)]",
            )}
          >
            {item.title}
          </span>
          <span className="ml-auto shrink-0 font-mono text-xs tabular text-ink-panel-muted">
            {time.format(new Date(item.at))}
            {item.durationMs !== undefined && <span className="opacity-70"> · {item.durationMs}ms</span>}
          </span>
        </div>
        {item.detail && <p className="mt-0.5 text-sm text-ink-panel-muted">{item.detail}</p>}
        {(item.ids?.length || item.aiSource) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.aiSource && <Badge tone="panel">via {SOURCE_LABEL[item.aiSource]}</Badge>}
            {item.ids?.map((x) => (
              <RequestId key={x.label + x.value} label={x.label} value={x.value} tone={x.paypal ? "paypal" : "panel"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** The live wire: newest event on top, each one slides in. Rendered on the inverted ink panel. */
export function Timeline({ items, live = true, className }: { items: TimelineItem[]; live?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <section
      aria-label="Live event timeline"
      className={cn("rounded-lg bg-ink-panel text-ink-panel-text", className)}
    >
      <header className="flex items-center justify-between border-b border-ink-panel-line px-4 py-2.5">
        <h2 className="text-sm font-medium">Live timeline</h2>
        <span className="inline-flex items-center gap-2 text-xs text-ink-panel-muted">
          <span className={cn("size-2 rounded-pill", live ? "bg-success animate-live-pulse" : "bg-ink-panel-muted")} aria-hidden />
          {live ? "Connected" : "Paused"}
        </span>
      </header>
      <ol className="relative px-4 py-1 before:absolute before:top-4 before:bottom-4 before:left-[1.85rem] before:w-px before:bg-ink-panel-line">
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
              <TimelineEvent item={item} />
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-panel-muted">
            Waiting for the first agent call. Try the buyer chat on the left.
          </li>
        )}
      </ol>
    </section>
  );
}
