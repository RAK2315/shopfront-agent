"use client";

import { CircleCheck, Sparkle, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { LOW_CONFIDENCE_THRESHOLD } from "@shopfront/core";
import { cn } from "@/lib/cn";

/**
 * An AI-extracted field the seller reviews. Below the threshold it is tinted, iconed and labelled
 * "Check this" (never colour alone). Price fields are always an "AI guess" until the seller confirms (D-016).
 */
export function ConfidenceField({
  label,
  value,
  onChange,
  confidence,
  kind = "text",
  confirmed = false,
  onConfirm,
  multiline = false,
  ai = true,
  className,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  confidence: number;
  kind?: "text" | "price";
  confirmed?: boolean;
  onConfirm?: () => void;
  multiline?: boolean;
  /** Filled in by the AI from the photo (walkthrough #9: show what the AI wrote vs what the seller decides). */
  ai?: boolean;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const isPrice = kind === "price";
  const low = isPrice ? !confirmed : confidence < LOW_CONFIDENCE_THRESHOLD;
  const pct = Math.round(confidence * 100);
  const Input = multiline ? "textarea" : "input";

  return (
    <div className={cn("group/field grid gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          {ai && !isPrice && (
            // aria-hidden: the field's accessible name stays exactly its label ("Tracking number"); the hint line says
            // how sure the AI was.
            <span aria-hidden className="inline-flex items-center gap-0.5 rounded-sm bg-clay-soft px-1 text-[10px] font-semibold uppercase tracking-wide text-clay-strong" title="Filled in by the AI from your photo">
              <Sparkle aria-hidden className="size-2.5" /> AI
            </span>
          )}
          {label}
        </label>
        <span id={hintId} className={cn("inline-flex items-center gap-1 text-xs", low ? "text-warning" : "text-muted")}>
          {low ? <TriangleAlert aria-hidden className="size-3.5" /> : <CircleCheck aria-hidden className="size-3.5 text-success" />}
          {isPrice ? (confirmed ? "Confirmed by you" : "AI guess · confirm before publishing") : low ? `Check this · ${pct}% sure` : `${pct}% sure`}
        </span>
      </div>
      <div
        className={cn(
          "relative flex items-center rounded-md border bg-surface transition-colors duration-150 focus-within:border-clay",
          low ? "border-warning/45 bg-warning-soft/60" : "border-line-strong",
        )}
      >
        {isPrice && <span className="pl-3 text-ink-2 tabular" aria-hidden>$</span>}
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          aria-describedby={hintId}
          inputMode={isPrice ? "decimal" : undefined}
          rows={multiline ? 3 : undefined}
          className={cn(
            "w-full resize-none bg-transparent px-3 py-2 text-base text-ink outline-none placeholder:text-muted",
            isPrice && "pl-1 tabular",
          )}
        />
        {isPrice && !confirmed && onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className="mr-1.5 shrink-0 rounded-sm bg-ink px-2 py-1 text-xs font-medium text-canvas transition-colors hover:bg-ink-2"
          >
            Confirm price
          </button>
        )}
      </div>
      <div
        className="h-1 overflow-hidden rounded-pill bg-surface-2"
        role="meter"
        aria-label={`${label} AI confidence`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div
          className={cn("h-full rounded-pill transition-[width] duration-300", low ? "bg-warning" : "bg-success")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
