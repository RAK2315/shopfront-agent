"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, LoaderCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CheckoutStatus, Confirmation } from "@shopfront/core";
import { ConfirmationBadge } from "@/components/console/confirmation-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";

// Minimal typings for the PayPal JS SDK v6 surface we use (verified against PayPal's v6 reference).
interface PayPalSession {
  start(options: { presentationMode: "auto" | "popup" | "modal" | "redirect" }, order: Promise<{ orderId: string }>): Promise<void>;
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
}

export function PayPalApprove({
  checkoutId,
  token,
  orderId,
  clientId,
  amount,
  initialStatus,
}: {
  checkoutId: string;
  token: string;
  orderId: string;
  clientId: string;
  amount: string;
  initialStatus: CheckoutStatus;
}) {
  const alreadyPaid = ["paid", "shipped", "partially_refunded", "refunded"].includes(initialStatus);
  const [phase, setPhase] = useState<Phase>(alreadyPaid ? "paid" : "loading");
  const [message, setMessage] = useState<string | null>(null);
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
  // Stop following once PayPal has confirmed the capture, by webhook or by a fallback check.
  const webhookDone = status?.confirmation === "webhook" || status?.confirmation === "poll";
  useEffect(() => {
    if (phase !== "paid" || webhookDone) return;
    const first = setTimeout(() => void refreshStatus(), 0);
    const t = setInterval(() => void refreshStatus(), 2000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [phase, refreshStatus, webhookDone]);

  const onClick = async () => {
    if (!sessionRef.current) return;
    setMessage(null);
    setPhase("approving");
    try {
      // v6 expects an invoked Promise of { orderId } — the order was created server-side by the agent's checkout.
      await sessionRef.current.start({ presentationMode: "auto" }, Promise.resolve({ orderId }));
    } catch {
      setPhase("ready");
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
          <div className={cn("min-h-12", (phase === "loading" || phase === "unavailable") && "grid place-items-center")}>
            {phase === "loading" && (
              <span className="inline-flex items-center gap-2 text-sm text-ink-2">
                <LoaderCircle aria-hidden className="size-4 animate-spin" /> Loading PayPal…
              </span>
            )}
            {phase === "unavailable" && <span className="text-sm text-danger">PayPal is not available for this order.</span>}
            <paypal-button
              ref={buttonRef as never}
              type="pay"
              class="paypal-gold"
              hidden={!(phase === "ready" || phase === "approving" || phase === "error")}
              aria-disabled={phase === "approving" || undefined}
            />
          </div>
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
    </div>
  );
}
