"use client";

import { useState } from "react";
import { Bot, Play, RotateCcw, User } from "lucide-react";
import type { CheckoutStatus } from "@shopfront/core";
import { Timeline, type TimelineItem } from "@/components/console/timeline";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";

// Sample data for the style guide only: the shape of real events, not real IDs.
const SCRIPT: Array<Omit<TimelineItem, "id" | "at"> & { status?: CheckoutStatus }> = [
  {
    actor: "buyer_agent",
    title: "search_products",
    detail: "“blue mug under $40” → 3 results from 2 sellers",
    aiSource: "gemini",
    durationMs: 412,
    ids: [{ label: "MCP", value: "c1f0a2d4-7b9e-4a51-9a0e-2f4d8b1c6e73" }],
  },
  {
    actor: "mcp",
    title: "create_checkout rejected",
    detail: "Unknown field “price”: totals are set by the server",
    outcome: "blocked",
    ids: [{ label: "MCP", value: "8d2e41b0-55aa-4c3f-b1d7-0c9e7a6f2b10" }],
  },
  {
    actor: "mcp",
    title: "create_checkout",
    detail: "1 × Speckled stoneware cup · server total $39.00",
    status: "created",
    ids: [
      { label: "Checkout", value: "chk_k3j9x0a1b2c3" },
      { label: "Request-Id", value: "checkout-chk_k3j9x0a1b2c3" },
    ],
  },
  {
    actor: "paypal",
    title: "Order created",
    durationMs: 640,
    ids: [
      { label: "Order", value: "5O190127TN364715T", paypal: true },
      { label: "Debug", value: "f2d81c6a9b3e4", paypal: true },
    ],
  },
  { actor: "buyer_agent", title: "Waiting for the human to approve in PayPal", detail: "pay_url handed to the buyer" },
  {
    actor: "webhook",
    title: "PAYMENT.CAPTURE.COMPLETED",
    detail: "Signature verified · processed once",
    status: "paid",
    ids: [
      { label: "Event", value: "WH-2WR32451HC0233532-67976317FL4543714", paypal: true },
      { label: "Capture", value: "3C679366HH908993F", paypal: true },
    ],
  },
  { actor: "ops_agent", title: "Thank-you note drafted", detail: "Published to the buyer’s order page", aiSource: "cache" },
  {
    actor: "paypal",
    title: "Tracking added to order",
    detail: "USPS · from the shipping-label photo",
    status: "shipped",
    ids: [{ label: "Tracking", value: "9400111899223197428490", paypal: true }],
  },
];

export function ConsoleDemo() {
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [status, setStatus] = useState<CheckoutStatus>("created");

  const next = () => {
    const s = SCRIPT[step];
    if (!s) return;
    const { status: newStatus, ...rest } = s;
    setItems((prev) => [{ ...rest, id: `demo-${step}`, at: new Date().toISOString() }, ...prev]);
    if (newStatus) setStatus(newStatus);
    setStep(step + 1);
  };
  const reset = () => {
    setItems([]);
    setStep(0);
    setStatus("created");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="grid content-start gap-3 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink-2">Buyer agent</h3>
          <StatusPill status={status} />
        </div>
        <div className="grid gap-2 text-base">
          <p className="ml-auto inline-flex max-w-[85%] items-start gap-2 rounded-md bg-surface-2 px-3 py-2">
            <User aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted" />
            Find me a handmade blue mug under $40 as a gift.
          </p>
          <p className="inline-flex max-w-[90%] items-start gap-2 rounded-md border border-line px-3 py-2">
            <Bot aria-hidden className="mt-0.5 size-3.5 shrink-0 text-clay" />
            <span>
              Found a speckled stoneware cup from Juniper Clay Studio for <Money cents={3400} />, plus{" "}
              <Money cents={500} /> shipping. I’ve prepared the PayPal checkout; you approve the payment.
            </span>
          </p>
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={next} disabled={step >= SCRIPT.length}>
            <Play aria-hidden className="size-3.5" />
            {step >= SCRIPT.length ? "Story complete" : "Next event"}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw aria-hidden className="size-3.5" />
            Reset
          </Button>
        </div>
      </div>
      <Timeline items={items} className="min-h-80" />
    </div>
  );
}
