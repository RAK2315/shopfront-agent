"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "paypal" | "panel";

const TONE: Record<Tone, string> = {
  neutral: "border-line bg-surface-2 text-ink-2 hover:border-line-strong",
  paypal: "border-paypal/20 bg-paypal-soft text-paypal hover:border-paypal/40",
  panel: "border-ink-panel-line bg-ink-panel-2 text-ink-panel-text hover:border-ink-panel-muted/50",
};

function middle(value: string, max: number) {
  if (value.length <= max) return value;
  const head = Math.ceil((max - 1) * 0.6);
  return `${value.slice(0, head)}…${value.slice(-(max - 1 - head))}`;
}

/** A real identifier (PayPal order/capture id, PayPal-Request-Id, debug id, MCP request id). Click to copy. */
export function RequestId({
  label,
  value,
  tone = "neutral",
  max = 18,
  className,
}: {
  label: string;
  value: string;
  tone?: Tone;
  max?: number;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked: value is still selectable via title */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`${label}: ${value} (click to copy)`}
      className={cn(
        "group relative inline-flex h-6 max-w-full items-center gap-1.5 rounded-sm border px-1.5 text-xs transition-colors duration-150",
        TONE[tone],
        className,
      )}
    >
      <span className="shrink-0 font-sans font-medium">{label}</span>
      <span className="truncate font-mono tracking-tight">{middle(value, max)}</span>
      {copied ? (
        <Check aria-hidden className="size-3 shrink-0" />
      ) : (
        <Copy aria-hidden className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70" />
      )}
      {/* The accessible name starts with the visible text (WCAG 2.5.3); the full value is in the title. */}
      <span className="sr-only">, copy {value}</span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
