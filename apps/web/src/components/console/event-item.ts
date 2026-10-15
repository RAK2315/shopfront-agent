import type { ShopEvent } from "@/server/events";
import type { AiSource, TimelineItem } from "./timeline";

// Data keys that hold real identifiers, in display order. PayPal-issued ids use the PayPal tone.
const ID_KEYS: Array<{ key: string; label: string; paypal?: boolean }> = [
  { key: "orderId", label: "Order", paypal: true },
  { key: "captureId", label: "Capture", paypal: true },
  { key: "refundId", label: "Refund", paypal: true },
  { key: "catalogId", label: "Catalog", paypal: true },
  { key: "trackingNumber", label: "Tracking", paypal: true },
  { key: "productId", label: "Product" },
  { key: "eventId", label: "Event", paypal: true },
  { key: "debugId", label: "Debug", paypal: true },
  { key: "paypalRequestId", label: "Request-Id" },
  { key: "mcpRequestId", label: "MCP" },
];

const ERROR_KINDS = new Set(["order_failed", "capture_failed", "capture_declined"]);
const BLOCKED_KINDS = new Set(["webhook_rejected", "capture_skipped"]);

/** Server event → timeline row. The summary's first " · " segment is the title; the rest is detail. */
export function toTimelineItem(e: ShopEvent): TimelineItem {
  const [title, ...rest] = e.summary.split(" · ");
  const d = e.data ?? {};
  const ids = ID_KEYS.flatMap(({ key, label, paypal }) => {
    const v = d[key];
    return typeof v === "string" && v ? [{ label, value: v, paypal }] : [];
  });
  if (e.checkoutId) ids.unshift({ label: "Checkout", value: e.checkoutId, paypal: undefined });
  const errorCode = typeof d.errorCode === "string" ? d.errorCode : undefined;
  const aiSource = (["gemini", "groq", "cache", "replay"] as const).find((s) => s === d.source) as AiSource | undefined;
  return {
    id: String(e.id),
    actor: e.actor,
    title: title ?? e.kind,
    detail: rest.length ? rest.join(" · ") : undefined,
    at: e.createdAt,
    ids,
    durationMs: typeof d.ms === "number" ? d.ms : undefined,
    aiSource,
    outcome:
      BLOCKED_KINDS.has(e.kind) || (e.kind === "tool_error" && errorCode === "VALIDATION_ERROR")
        ? "blocked"
        : ERROR_KINDS.has(e.kind) || e.kind === "tool_error"
          ? "error"
          : undefined,
  };
}
