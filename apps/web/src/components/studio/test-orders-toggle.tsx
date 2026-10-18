"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

/** "Include test orders" (D-087): the demo shop's history is real sandbox orders made by test runs. */
export function TestOrdersToggle({ on, count }: { on: boolean; count?: number }) {
  const router = useRouter();
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  const flip = async () => {
    const next = !value;
    setValue(next);
    const r = await fetch("/api/seller/test-orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ include: next }) });
    if (!r.ok) return setValue(!next);
    start(() => router.refresh());
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={flip}
      disabled={pending}
      data-testid="test-orders-toggle"
      className="inline-flex min-h-11 items-center gap-2.5 rounded-pill border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition-colors hover:border-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay disabled:opacity-60"
    >
      <span className={cn("relative h-5 w-9 rounded-pill transition-colors", value ? "bg-clay" : "bg-line-strong")} aria-hidden>
        <span className={cn("absolute top-0.5 size-4 rounded-pill bg-surface shadow-sm transition-transform", value ? "translate-x-4.5" : "translate-x-0.5")} />
      </span>
      <FlaskConical aria-hidden className="size-4 text-ink-2" />
      Include test orders{typeof count === "number" && value ? <span className="tabular text-ink-2">· {count}</span> : null}
    </button>
  );
}

export function TestRunBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pill border border-line-strong bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2", className)} title="A real PayPal sandbox order placed by our automated test runs" data-testid="test-run-badge">
      <FlaskConical aria-hidden className="size-3" /> Test run
    </span>
  );
}
