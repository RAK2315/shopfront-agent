"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, LoaderCircle, MessageSquareText, PackageCheck, ShieldCheck, TriangleAlert, Undo2 } from "lucide-react";
import type { CheckoutStatus, Confirmation } from "@shopfront/core";
import { ConfirmationBadge } from "@/components/console/confirmation-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";
import { approvalPageUrl, fallbackMode, FIRST_MODE, type PresentationMode } from "@/lib/paypal-presentation";

// Minimal typings for the PayPal JS SDK v6 surface we use (verified against PayPal's v6 reference).
interface PayPalSession {
  start(options: { presentationMode: PresentationMode }, order: Promise<{ orderId: string }>): Promise<void>;
  hasReturned?(): boolean;
  resume?(): Promise<void>;
}
interface PayPalSdkInstance {
  findEligibleMethods(o: { currencyCode: string; amount?: string }): Promise<{ isEligible(m: string): boolean }>;
  createPayPalOneTimePaymentSession(cb: {
    onApprove: (data: { orderId: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (e: { code?: string; message?: string }) => void;
  }): PayPalSession;
}
declare global {
  interface Window {
    paypal?: { createInstance(o: { clientId: string; components: string[]; pageType?: string; locale?: string }): Promise<PayPalSdkInstance> };
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string; class?: string };
    }
  }
}

type Phase = "loading" | "ready" | "approving" | "capturing" | "paid" | "error" | "unavailable";

interface Status {
  status: CheckoutStatus;
  confirmedVia: string | null;
  webhookConfirmedAt: string | null;
  pollConfirmedAt: string | null;
  confirmation: Confirmation;
  paypalOrderId: string | null;
  captureId: string | null;
  tracking?: Array<{ carrier: string; trackingNumber: string }>;
  messages?: Array<{ id: string; kind: string; subject: string; body: string; at: string }>;
  refunds?: Array<{ id: string; status: string; amountCents: number; paypalRefundId: string | null }>;
}

export function PayPalApprove({
  checkoutId,
  token,
  orderId,
  clientId,
  amount,
  initialStatus,
  initialMessage = null,
  testBuyer,
}: {
  checkoutId: string;
  token: string;
  orderId: string;
  clientId: string;
  amount: string;
  initialStatus: CheckoutStatus;
  /** Shown on arrival, e.g. after the buyer cancelled on PayPal's own page (redirect flow). */
  initialMessage?: string | null;
  testBuyer?: { email: string; password: string };
}) {
  const alreadyPaid = ["paid", "shipped", "partially_refunded", "refunded"].includes(initialStatus);
  const [phase, setPhase] = useState<Phase>(alreadyPaid ? "paid" : "loading");
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [status, setStatus] = useState<Status | null>(null);
  const sessionRef = useRef<PayPalSession | null>(null);
  const buttonRef = useRef<HTMLElement | null>(null);

  const refreshStatus = useCallback(async () => {
    const r = await fetch(`/api/checkouts/${checkoutId}/status?t=${encodeURIComponent(token)}`, { cache: "no-store" });
    if (r.ok) setStatus((await r.json()) as Status);
  }, [checkoutId, token]);

  const init = useCallback(async () => {
    if (!window.paypal || alreadyPaid) return;
    try {
      const sdk = await window.paypal.createInstance({ clientId, components: ["paypal-payments"], pageType: "checkout", locale: "en-US" });
      const methods = await sdk.findEligibleMethods({ currencyCode: "USD", amount });
      if (!methods.isEligible("paypal")) {
        setPhase("unavailable");
        return;
      }
      sessionRef.current = sdk.createPayPalOneTimePaymentSession({
        onApprove: async () => {
          setPhase("capturing");
          const r = await fetch(`/api/checkouts/${checkoutId}/capture`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ t: token }),
          });
          const out = (await r.json()) as { ok: boolean; message?: string };
          if (out.ok) {
            setPhase("paid");
            void refreshStatus();
          } else {
            setPhase("ready");
            setMessage(out.message ?? "The payment did not go through.");
          }
        },
        onCancel: () => {
          setPhase("ready");
          setMessage("You closed PayPal before approving. Nothing was charged.");
        },
        onError: (e) => {
          setPhase("error");
          setMessage(e?.message ?? "PayPal could not start. Please try again.");
        },
      });
      setPhase("ready");
    } catch {
      setPhase("error");
      setMessage("PayPal could not load. Check your connection and refresh.");
    }
  }, [alreadyPaid, amount, checkoutId, clientId, refreshStatus, token]);

  // The SDK may already be loaded (client-side navigation).
  useEffect(() => {
    if (!window.paypal) return;
    const id = setTimeout(() => void init(), 0);
    return () => clearTimeout(id);
  }, [init]);

  // After payment, follow the order until PayPal's verified webhook confirms it (the live-wire moment).
  // A fallback check may confirm first ("via poll"); keep following more slowly so a late webhook still shows,
  // and give up after 5 minutes so an open tab doesn't keep the database awake.
  const webhookDone = status?.confirmation === "webhook";
  const pollConfirmed = status?.confirmation === "poll";
  useEffect(() => {
    if (phase !== "paid" || webhookDone) return;
    const first = setTimeout(() => void refreshStatus(), 0);
    const t = setInterval(() => void refreshStatus(), pollConfirmed ? 10_000 : 2_000);
    const stop = setTimeout(() => clearInterval(t), 5 * 60_000);
    return () => {
      clearTimeout(first);
      clearTimeout(stop);
      clearInterval(t);
    };
  }, [phase, refreshStatus, webhookDone, pollConfirmed]);

  const onClick = async () => {
    if (!sessionRef.current) return;
    setMessage(null);
    setPhase("approving");
    // v6 expects an invoked Promise of { orderId }: the order was created server-side by the agent's checkout.
    // start() is called synchronously inside the click so the browser lets the popup open (D-086: never "auto").
    try {
      await sessionRef.current.start({ presentationMode: FIRST_MODE }, Promise.resolve({ orderId }));
    } catch (e) {
      if (fallbackMode(e) === "redirect") {
        setMessage("Your browser blocked the PayPal window, so PayPal opens in this tab instead.");
        window.location.assign(approvalPageUrl(orderId, true));
        return;
      }
      setPhase("ready");
      setMessage("PayPal could not open. Try again, or continue in this tab below.");
    }
  };

  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  });

  return (
    <div className="grid gap-4">
      <Script src="https://www.sandbox.paypal.com/web-sdk/v6/core" strategy="afterInteractive" onReady={() => void init()} />

      {phase !== "paid" && (
        <>
          <div className={cn("min-h-12", (phase === "loading" || phase === "unavailable") && "grid place-items-center")} data-phase={phase}>
            {phase === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm text-ink-2">
                <LoaderCircle aria-hidden className="size-4 animate-spin" /> Loading PayPal…
              </span>
            )}
            {phase === "unavailable" && <span className="text-sm text-danger">PayPal is not available for this order.</span>}
            {/* Hidden on a wrapper: the web component sets its own display, so `hidden` on it is ignored and
                a click before the payment session exists would do nothing. */}
            <div hidden={!(phase === "ready" || phase === "approving" || phase === "error")}>
              <paypal-button ref={buttonRef as never} type="pay" class="paypal-gold" aria-disabled={phase === "approving" || undefined} />
            </div>
          </div>
          {phase === "approving" && (
            <p className="text-sm text-ink-2" role="status" data-testid="approving-hint">
              PayPal opened in a new window.{" "}
              <a href={approvalPageUrl(orderId, true)} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-clay" data-testid="approve-in-tab">
                Can&apos;t see it? Continue in this tab
              </a>
            </p>
          )}
          {phase === "capturing" && (
            <p className="inline-flex items-center gap-2 text-sm text-ink-2" role="status">
              <LoaderCircle aria-hidden className="size-4 animate-spin" /> Approved — completing payment with PayPal…
            </p>
          )}
          {message && (
            <p className="inline-flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-ink" role="alert">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
              {message}
            </p>
          )}
          <p className="inline-flex items-start gap-2 text-sm text-ink-2">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
            Your agent prepared this order. Nothing is charged until you approve it in PayPal.
          </p>
          {testBuyer && (
            <div className="grid gap-2 rounded-md border border-line bg-surface-2 px-3 py-2.5" data-testid="test-buyer">
              <p className="text-sm text-ink-2">
                <span className="font-medium text-ink">Judging?</span> Log in to PayPal with the sandbox test buyer. No real money moves.
              </p>
              <div className="flex flex-wrap gap-2">
                <RequestId label="Email" value={testBuyer.email} max={44} />
                <RequestId label="Password" value={testBuyer.password} max={24} />
              </div>
            </div>
          )}
        </>
      )}

      {phase === "paid" && (
        <div className="grid gap-3 rounded-lg border border-success/25 bg-success-soft/60 p-4" role="status">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-md font-medium text-ink">
              <CircleCheck aria-hidden className="size-5 text-success" /> Payment complete
            </p>
            <StatusPill status={status?.status ?? "paid"} />
          </div>
          <div className="flex flex-wrap gap-2">
            <RequestId label="Order" value={status?.paypalOrderId ?? orderId} tone="paypal" />
            {status?.captureId && <RequestId label="Capture" value={status.captureId} tone="paypal" />}
          </div>
          <p className="inline-flex flex-wrap items-center gap-2 text-sm text-ink-2" data-testid="webhook-state" data-confirmation={status?.confirmation ?? ""}>
            {status?.confirmation === "webhook" ? (
              <>
                <span className="size-2 rounded-pill bg-success" aria-hidden /> PayPal webhook received and signature verified
              </>
            ) : status?.confirmation === "poll" ? (
              <>
                <ConfirmationBadge confirmation="poll" /> No webhook yet; PayPal confirmed the capture when we checked
              </>
            ) : (
              <>
                <span className="size-2 animate-live-pulse rounded-pill bg-success" aria-hidden /> Waiting for PayPal’s webhook…
              </>
            )}
          </p>
        </div>
      )}

      {phase === "paid" && <AfterSale status={status} />}
    </div>
  );
}

const REFUND_STATUS: Record<string, string> = { pending: "Waiting for the seller", approved: "Approved, sending", executed: "Refunded", rejected: "Declined", failed: "Not sent", handoff: "Approved · the seller is sending it from their PayPal" };

/** What happened after payment: the seller's notes, tracking and refunds (D-008: published here, never emailed). */
function AfterSale({ status }: { status: Status | null }) {
  if (!status?.messages?.length && !status?.tracking?.length && !status?.refunds?.length) return null;
  return (
    <div className="grid gap-3" data-testid="after-sale">
      {status.tracking?.map((t) => (
        <p key={t.trackingNumber} className="inline-flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <PackageCheck aria-hidden className="size-4 text-success" /> Shipped with {t.carrier}
          <RequestId label="Tracking" value={t.trackingNumber} tone="paypal" />
        </p>
      ))}
      {status.refunds?.map((r) => (
        <p key={r.id} className="inline-flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <Undo2 aria-hidden className="size-4 text-ink-2" /> Refund <span className="font-medium text-ink tabular">${(r.amountCents / 100).toFixed(2)}</span> · {REFUND_STATUS[r.status] ?? r.status}
          {r.paypalRefundId && <RequestId label="Refund" value={r.paypalRefundId} tone="paypal" />}
        </p>
      ))}
      {status.messages?.map((m) => (
        <article key={m.id} className="grid gap-1 rounded-lg border border-line bg-surface p-4">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-muted">
            <MessageSquareText aria-hidden className="size-3.5 text-clay" /> From the seller
          </p>
          <h3 className="font-display text-lg font-medium">{m.subject}</h3>
          <p className="whitespace-pre-line text-sm text-ink-2">{m.body}</p>
        </article>
      ))}
    </div>
  );
}
