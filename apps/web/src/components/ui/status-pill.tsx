"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Hourglass,
  PackageCheck,
  RotateCcw,
  ShieldAlert,
  Undo2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { STATUS_LABEL, type CheckoutStatus } from "@shopfront/core";
import { cn } from "@/lib/cn";

const STYLE: Record<CheckoutStatus, { icon: LucideIcon; cls: string }> = {
  created: { icon: CircleDashed, cls: "border-line-strong bg-surface text-ink-2" },
  approved: { icon: CircleDot, cls: "border-clay/30 bg-clay-soft text-clay-strong" },
  capture_pending: { icon: Hourglass, cls: "border-warning/30 bg-warning-soft text-warning" },
  paid: { icon: CircleCheck, cls: "border-success/30 bg-success-soft text-success" },
  shipped: { icon: PackageCheck, cls: "border-success/30 bg-success-soft text-success" },
  partially_refunded: { icon: Undo2, cls: "border-line-strong bg-surface-2 text-ink" },
  refunded: { icon: RotateCcw, cls: "border-line-strong bg-surface-2 text-ink" },
  capture_denied: { icon: XCircle, cls: "border-danger/30 bg-danger-soft text-danger" },
  reversed: { icon: ShieldAlert, cls: "border-danger/30 bg-danger-soft text-danger" },
  cancelled: { icon: Ban, cls: "border-line bg-surface-2 text-muted" },
};

/** Checkout status with icon + text (never colour alone). Crossfades when the status changes. */
export function StatusPill({ status, className }: { status: CheckoutStatus; className?: string }) {
  const reduce = useReducedMotion();
  const { icon: Icon, cls } = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center overflow-hidden whitespace-nowrap rounded-pill border px-2 text-xs font-medium transition-colors duration-200",
        cls,
        className,
      )}
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          className="inline-flex items-center gap-1.5"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(2px)" }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        >
          <Icon aria-hidden className="size-3.5" />
          {STATUS_LABEL[status]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
