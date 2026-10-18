import { BadgeCheck, CircleAlert, Landmark, LogIn } from "lucide-react";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";

type Card = { status: "platform" | "none" | "unverified" | "verified"; merchantId: string | null; email: string | null; via: string | null; checkedAt: string | null };

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Connected. PayPal confirmed your account, so orders now pay you directly." },
  checked: { ok: true, text: "PayPal confirmed the account. This demo shop still pays into the platform account, so nothing was rerouted." },
  cancelled: { ok: false, text: "You left PayPal before connecting. Nothing changed." },
  expired: { ok: false, text: "That PayPal sign-in link expired or was already used. Start again." },
  invalid: { ok: false, text: "PayPal didn't send the details back. Start again." },
  failed: { ok: false, text: "PayPal didn't share the account id. Allow “PayPal account ID” when asked, then try again." },
};

/**
 * "Get paid" (Phase 9 screens + Log in with PayPal, D-084, walkthrough #10). Where this shop's money goes, verified
 * by PayPal itself. Server component: the button is a plain link to our connect route (PayPal's own sign-in page).
 */
export function GetPaidCard({ card, result }: { card: Card; result?: string }) {
  const r = result ? RESULT[result] : undefined;
  const direct = card.status === "verified";
  const platform = card.status === "platform";
  return (
    <section aria-labelledby="get-paid-h" className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid="get-paid-card" data-status={card.status}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", direct ? "bg-success-soft text-success" : platform ? "bg-paypal-soft text-paypal" : "bg-warning-soft text-warning")} aria-hidden>
          {direct ? <BadgeCheck className="size-5" /> : platform ? <Landmark className="size-5" /> : <CircleAlert className="size-5" />}
        </span>
        <div className="grid min-w-0 gap-1">
          <h2 id="get-paid-h" className="text-md font-semibold text-ink">
            {direct ? "Get paid: straight to your PayPal" : platform ? "Get paid: the platform's sandbox account (demo shop)" : "Get paid: connect PayPal to start selling"}
          </h2>
          <p className="text-sm text-ink-2">
            {direct
              ? "Every order names your PayPal account as the payee, so buyers pay you directly. You refund from your own PayPal; we track it."
              : platform
                ? "This demo shop is paid into Shopfront's sandbox account so anyone can try it. A real seller connects their own PayPal with Log in with PayPal, and only a verified account is ever paid."
                : "Agents can't buy from this shop until PayPal confirms your account. Sign in once; we never see your password."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {card.merchantId && <RequestId label={platform ? "Checked account" : "PayPal account"} value={card.merchantId} tone="paypal" />}
            {card.email && <span className="text-xs text-ink-2">{card.email}</span>}
            {card.via && <span className="text-xs text-muted">verified {card.via === "log_in_with_paypal" ? "with Log in with PayPal" : "by the first payment"}</span>}
          </div>
          {r && (
            <p className={cn("text-sm", r.ok ? "text-success" : "text-warning")} role="status" data-testid="get-paid-result">
              {r.text}
            </p>
          )}
        </div>
      </div>
      <a
        href="/api/seller/paypal/connect"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-paypal px-4 text-base font-semibold text-white transition-colors hover:bg-paypal-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paypal-bright"
        data-testid="connect-paypal"
      >
        <LogIn aria-hidden className="size-4" /> {direct ? "Reconnect PayPal" : platform ? "Try Log in with PayPal" : "Connect with PayPal"}
      </a>
    </section>
  );
}
