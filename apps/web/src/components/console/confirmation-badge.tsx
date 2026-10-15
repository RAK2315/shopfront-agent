import { RefreshCw, Webhook } from "lucide-react";
import type { Confirmation } from "@shopfront/core";
import { Badge } from "@/components/ui/badge";

/** How a paid checkout was confirmed: a verified PayPal webhook, a fallback check against PayPal, or neither yet. */
export function ConfirmationBadge({ confirmation }: { confirmation: Confirmation }) {
  if (confirmation === "webhook")
    return (
      <Badge tone="success" title="A signature-verified PAYMENT.CAPTURE.COMPLETED webhook confirmed this payment">
        <Webhook aria-hidden /> Webhook verified
      </Badge>
    );
  if (confirmation === "poll")
    return (
      <Badge tone="warning" title="No webhook arrived in time; a fallback check asked PayPal directly and confirmed the capture">
        <RefreshCw aria-hidden /> Via poll
      </Badge>
    );
  if (confirmation === "awaiting_webhook")
    return (
      <Badge tone="neutral" title="Captured; waiting for PayPal's webhook (a fallback check runs after 60 s)">
        <span className="size-1.5 animate-live-pulse rounded-pill bg-success" aria-hidden /> Awaiting webhook
      </Badge>
    );
  return null;
}
