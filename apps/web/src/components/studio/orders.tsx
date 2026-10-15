"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Camera, CircleCheck, Cpu, MessageSquareText, PackageCheck, Truck, Undo2 } from "lucide-react";
import type { QueuedRefund, SellerOrder } from "@/server/orders";
import { ConfirmationBadge } from "@/components/console/confirmation-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceField } from "@/components/ui/confidence-field";
import { Money } from "@/components/ui/money";
import { RequestId } from "@/components/ui/request-id";
import { StatusPill } from "@/components/ui/status-pill";

const REASON: Record<string, string> = {
  wrong_size: "Wrong size",
  damaged: "Arrived damaged",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
  never_arrived: "Never arrived",
  other: "Other",
};

/** Refund requests waiting for the seller. The amount is computed by the server; one tap runs the same executor as auto-refunds. */
export function RefundQueue({ refunds }: { refunds: QueuedRefund[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = refunds.filter((r) => r.status === "pending");
  const recent = refunds.filter((r) => r.status !== "pending").slice(0, 5);

  const decide = async (id: string, approve: boolean) => {
    setBusy(`${id}:${approve}`);
    setError(null);
    const r = await fetch(`/api/seller/refunds/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ approve }) });
    const out = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) setError(out.error?.message ?? "Could not update the refund.");
    router.refresh();
  };

  return (
    <section aria-labelledby="refunds-h" className="grid gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="refunds-h" className="font-display text-2xl font-medium">
          Refunds waiting for you
        </h2>
        <span className="text-sm text-muted tabular">{pending.length} pending</span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {pending.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-5 text-base text-ink-2">Nothing to decide. Refunds inside your policy are handled automatically.</p>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {pending.map((r) => (
              <motion.li key={r.id} layout={!reduce} exit={{ opacity: 0 }} className="grid gap-4 rounded-lg border border-warning/35 bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto]" data-testid="refund-pending">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Money cents={r.amountCents} className="font-display text-2xl font-medium" />
                    <span className="text-base text-ink-2">{REASON[r.reasonCode] ?? r.reasonCode}</span>
                    <span className="text-sm text-muted">· {r.items}</span>
                  </div>
                  <p className="text-sm text-ink-2">
                    <span className="font-medium text-warning">Why it&apos;s here:</span> {r.explanation}. Amount computed from the order, never from the buyer&apos;s message.
                  </p>
                  {r.details && <blockquote className="border-l-2 border-line-strong pl-3 text-sm text-ink-2">“{r.details}”</blockquote>}
                  {r.ai?.summary && (
                    <p className="inline-flex items-start gap-1.5 text-xs text-muted">
                      <Cpu aria-hidden className="mt-0.5 size-3.5 shrink-0" /> AI read it as “{REASON[r.ai.reason_code ?? ""] ?? r.ai.reason_code}”: {r.ai.summary} (advice only)
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                  <Button onClick={() => decide(r.id, true)} loading={busy === `${r.id}:true`} disabled={!!busy} data-testid="refund-approve">
                    Refund <Money cents={r.amountCents} />
                  </Button>
                  <Button variant="ghost" onClick={() => decide(r.id, false)} loading={busy === `${r.id}:false`} disabled={!!busy}>
                    Decline
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {recent.length > 0 && (
        <ul className="grid gap-1.5">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
              <Undo2 aria-hidden className="size-3.5 text-muted" />
              <Money cents={r.amountCents} /> · {REASON[r.reasonCode] ?? r.reasonCode} ·{" "}
              {r.status === "executed" ? (r.decision === "auto_approve" ? "refunded automatically" : "refunded by you") : r.status}
              {r.paypalRefundId && <RequestId label="Refund" value={r.paypalRefundId} tone="paypal" />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Add tracking: snap the label (vision reads it) or type it; the seller always confirms before it goes to PayPal. */
function ShipForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [carrier, setCarrier] = useState("");
  const [number, setNumber] = useState("");
  const [conf, setConf] = useState<number | null>(null);
  const [source, setSource] = useState<"label_photo" | "manual">("manual");
  const [state, setState] = useState<"idle" | "reading" | "sending">("idle");
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<string | null>(null);

  const readPhoto = async (f: File) => {
    setState("reading");
    setError(null);
    const form = new FormData();
    form.append("photos", f);
    const up = await (await fetch("/api/seller/photos", { method: "POST", body: form })).json().catch(() => ({}));
    const sha = up.photos?.[0]?.sha256;
    if (!sha) {
      setState("idle");
      return setError(up.photos?.[0]?.error ?? "Upload failed.");
    }
    const r = await fetch("/api/seller/labels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sha256: sha }) });
    const out = await r.json().catch(() => ({}));
    setState("idle");
    if (!r.ok) return setError(out.error?.message ?? "Couldn't read the label. Type the number instead.");
    setCarrier(out.reading.carrier);
    setNumber(out.reading.trackingNumber);
    setConf(out.reading.confidence);
    setSource("label_photo");
    setAi(`${out.reading.ai.source === "cache" ? "From cache" : "Read by Gemini"} · ${(out.reading.ai.ms / 1000).toFixed(1)} s`);
    if (!out.reading.trackingNumber) setError("The number wasn't readable. Type it from the label.");
  };

  const send = async () => {
    setState("sending");
    setError(null);
    const r = await fetch(`/api/seller/orders/${orderId}/tracking`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ carrier, tracking_number: number, source }),
    });
    const out = await r.json().catch(() => ({}));
    setState("idle");
    if (!r.ok) return setError(out.error?.message ?? "Could not add tracking.");
    onDone();
  };

  return (
    <div className="grid gap-3 rounded-md border border-line bg-surface-2 p-4" data-testid="ship-form">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept="image/*,.heic,.heif" className="sr-only" data-testid="label-input" onChange={(e) => e.target.files?.[0] && void readPhoto(e.target.files[0])} />
        <Button size="sm" variant="secondary" onClick={() => input.current?.click()} loading={state === "reading"}>
          <Camera aria-hidden className="size-4" /> Read a label photo
        </Button>
        <span className="text-xs text-muted">or type it below</span>
        {ai && <Badge>{ai}</Badge>}
      </div>
      <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        {conf !== null ? (
          <>
            <ConfidenceField label="Carrier" value={carrier} onChange={setCarrier} confidence={conf} />
            <ConfidenceField label="Tracking number" value={number} onChange={setNumber} confidence={conf} />
          </>
        ) : (
          <>
            <label className="grid gap-1.5 text-sm font-medium">
              Carrier
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="USPS" className="h-[2.4rem] rounded-md border border-line-strong bg-surface px-3 text-base outline-none focus:border-clay" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Tracking number
              <input value={number} onChange={(e) => setNumber(e.target.value)} className="h-[2.4rem] rounded-md border border-line-strong bg-surface px-3 font-mono text-base outline-none focus:border-clay" />
            </label>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={send} disabled={!carrier || number.length < 6} loading={state === "sending"} data-testid="tracking-confirm">
          Confirm and add to PayPal order
        </Button>
      </div>
    </div>
  );
}

export function OrderList({ orders }: { orders: SellerOrder[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section aria-labelledby="orders-h" className="grid gap-4">
      <h2 id="orders-h" className="font-display text-2xl font-medium">
        Orders
      </h2>
      {orders.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-5 text-base text-ink-2">No paid orders yet.</p>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id} className="grid gap-3 rounded-lg border border-line bg-surface p-5" data-testid="order-row" data-checkout={o.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="grid gap-0.5">
                  <span className="font-display text-lg font-medium">{o.items}</span>
                  <span className="font-mono text-xs text-muted">{o.id}</span>
                </div>
                <Money cents={o.totalCents} className="text-base font-medium" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={o.status} />
                <ConfirmationBadge confirmation={o.confirmation} />
                {o.buyerCountry && <Badge>{o.buyerCountry}</Badge>}
                {o.refundedCents > 0 && (
                  <Badge tone="neutral">
                    <Undo2 aria-hidden /> <Money cents={o.refundedCents} /> refunded
                  </Badge>
                )}
                {o.paypalOrderId && <RequestId label="Order" value={o.paypalOrderId} tone="paypal" />}
              </div>
              {o.shipment && (
                <p className="inline-flex flex-wrap items-center gap-2 text-sm text-ink-2">
                  <PackageCheck aria-hidden className="size-4 text-success" /> Shipped with {o.shipment.carrier}
                  <RequestId label="Tracking" value={o.shipment.trackingNumber} tone="paypal" />
                  <span className="text-xs text-muted">{o.shipment.source === "label_photo" ? "read from label photo" : "entered by you"} · on the PayPal order</span>
                </p>
              )}
              {o.message && (
                <details className="text-sm text-ink-2">
                  <summary className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-ink">
                    <MessageSquareText aria-hidden className="size-4 text-clay" /> {o.message.subject}
                  </summary>
                  <p className="mt-2 whitespace-pre-line pl-6">{o.message.body}</p>
                </details>
              )}
              {o.status === "paid" &&
                (open === o.id ? (
                  <ShipForm
                    orderId={o.id}
                    onDone={() => {
                      setOpen(null);
                      router.refresh();
                    }}
                  />
                ) : (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => setOpen(o.id)} data-testid="ship">
                      <Truck aria-hidden className="size-4" /> Add tracking
                    </Button>
                  </div>
                ))}
              {o.status === "refunded" && (
                <p className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                  <CircleCheck aria-hidden className="size-4 text-success" /> Fully refunded
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
