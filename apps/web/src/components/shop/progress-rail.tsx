"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type StepState = "todo" | "active" | "done";
export type RailStep = { key: string; label: string; actor: "Agent" | "Shop" | "You" | "PayPal"; state: StepState; detail?: string };

const ACTOR_TONE: Record<RailStep["actor"], string> = {
  Agent: "text-clay-strong",
  Shop: "text-ink-2",
  You: "text-ink",
  PayPal: "text-paypal",
};

/** Search → Found → Checkout → PayPal → Paid (walkthrough #4): who does each step, lit only by real events. */
export function ProgressRail({ steps }: { steps: RailStep[] }) {
  const reduce = useReducedMotion();
  const doneCount = steps.filter((s) => s.state === "done").length;
  return (
    <ol className="grid grid-cols-5 gap-1 sm:gap-2" aria-label="Purchase progress" data-testid="progress-rail" data-done={doneCount}>
      {steps.map((s, i) => (
        <li
          key={s.key}
          className={cn("grid min-w-0 gap-1.5 rounded-md p-1 transition-colors duration-300", s.state === "active" && "bg-clay-soft ring-1 ring-clay/35")}
          data-step={s.key}
          data-state={s.state}
          aria-current={s.state === "active" ? "step" : undefined}
        >
          <div className="relative h-1 overflow-hidden rounded-pill bg-line">
            <motion.div
              className={cn("absolute inset-y-0 left-0 rounded-pill", s.key === "paid" || s.key === "paypal" ? "bg-paypal-bright" : "bg-clay")}
              initial={false}
              // The step waiting on someone breathes, so the eye lands on it (review v2 #1); still under reduced motion.
              animate={s.state === "active" && !reduce ? { width: "60%", opacity: [1, 0.45, 1] } : { width: s.state === "done" ? "100%" : s.state === "active" ? "60%" : "0%", opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : s.state === "active"
                    ? { width: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 1.6, repeat: Infinity, ease: "easeInOut" } }
                    : { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: s.state === "done" ? i * 0.04 : 0 }
              }
            />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "hidden size-4 shrink-0 place-items-center rounded-pill border text-[10px] sm:grid",
                s.state === "done" ? "border-transparent bg-ink text-canvas" : s.state === "active" ? "border-clay text-clay" : "border-line-strong text-transparent",
              )}
              aria-hidden
            >
              {s.state === "done" ? <Check className="size-3" strokeWidth={3} /> : s.state === "active" ? <LoaderCircle className="size-3 animate-spin" /> : null}
            </span>
            <span className={cn("truncate text-xs sm:text-sm", s.state === "active" ? "font-semibold text-ink" : "font-medium", s.state === "todo" ? "text-muted" : "text-ink", s.state === "done" && "max-sm:text-clay-strong")}>{s.label}</span>
          </div>
          <span className={cn("hidden truncate pl-5.5 text-xs sm:block", ACTOR_TONE[s.actor], s.state === "todo" && "opacity-60", s.state === "active" && "font-medium")}>{s.detail ?? s.actor}</span>
        </li>
      ))}
    </ol>
  );
}
