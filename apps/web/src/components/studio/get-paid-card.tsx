import { BadgeCheck, CircleAlert, Landmark, LogIn, ShieldCheck, Store } from "lucide-react";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";

type Card = { status: "platform" | "none" | "unverified" | "verified"; merchantId: string | null; email: string | null; via: string | null; checkedAt: string | null };

const RESULT: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Verified by PayPal. Orders now pay this account directly." },
  checked: { ok: true, text: "Verified by PayPal. This demo shop still pays into the platform account, so nothing was rerouted." },
  cancelled: { ok: false, text: "You left PayPal before connecting. Nothing changed." },
  account_unverified: { ok: false, text: "PayPal says this account isn't verified yet. Verify it in PayPal, then connect again; until then this shop isn't paid." },
  expired: { ok: false, text: "That PayPal sign-in link expired or was already used. Start again." },
  invalid: { ok: false, text: "PayPal didn't send the details back. Start again." },
  failed: { ok: false, text: "PayPal didn't share the account id. Allow “PayPal account ID” when asked, then try again." },
};

const STEPS = [
  "You sign in on PayPal's own page. Shopfront never sees your password.",
  "PayPal tells us the account id and whether the account is verified.",
  "A verified account becomes this shop's payee: buyers pay it directly. Signing in never moves money by itself.",
];

/**
 * "Get paid" (Phase 9 screens + Log in with PayPal, D-084; review v2 #6). Where this shop's money goes, verified by
 * PayPal itself, with what the sign-in does, which sandbox login to use, and whether payouts reach the seller's own PayPal.
 */
export function GetPaidCard({ card, result, connectEnabled, testLogin }: { card: Card; result?: string; connectEnabled: boolean; testLogin?: { email: string; password: string } }) {
  const r = result ? RESULT[result] : undefined;
  const direct = card.status === "verified";
  const platform = card.status === "platform";
  const verifiedNow = r?.ok && (result === "checked" || result === "connected");
  return (
    <section aria-labelledby="get-paid-h" className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5" data-testid="get-paid-card" data-status={card.status}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", direct ? "bg-success-soft text-success" : platform ? "bg-paypal-soft text-paypal" : "bg-warning-soft text-warning")} aria-hidden>
            {direct ? <BadgeCheck className="size-5" /> : platform ? <Landmark className="size-5" /> : <CircleAlert className="size-5" />}
          </span>
          <div className="grid min-w-0 gap-1">
            <h2 id="get-paid-h" className="text-md font-semibold text-ink">
              {direct ? "Get paid: straight to your PayPal" : platform ? "Get paid: this demo shop uses the platform's account" : "Get paid: connect PayPal to start selling"}
            </h2>
            <p className="text-sm text-ink-2">
              {direct
                ? "Every order names your PayPal account as the payee, so buyers pay you directly. You refund from your own PayPal; we track it."
                : platform
                  ? "So anyone can try it, this demo shop is paid into Shopfront's sandbox account. A real shop connects its own PayPal below."
                  : "Agents can't buy from this shop until PayPal confirms your account."}
            </p>
            <p className={cn("inline-flex w-fit items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold", direct ? "bg-success-soft text-success" : "bg-surface-2 text-ink-2")} data-testid="payouts-state">
              Payouts to your own PayPal: {direct ? "enabled" : platform ? "not enabled on this demo shop" : "not enabled yet"}
            </p>
          </div>
        </div>
        {connectEnabled ? (
          <a
            href="/api/seller/paypal/connect"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-paypal px-4 text-base font-semibold text-white transition-colors hover:bg-paypal-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paypal-bright"
            data-testid="connect-paypal"
          >
            <LogIn aria-hidden className="size-4" /> {direct ? "Reconnect PayPal" : platform ? "Try Log in with PayPal" : "Connect with PayPal"}
          </a>
        ) : (
          <p className="max-w-[16rem] text-xs text-muted" data-testid="connect-pending">
            Connecting a PayPal account uses Log in with PayPal, which is being switched on for this sandbox app.
          </p>
        )}
      </div>

      {(verifiedNow || (direct && card.merchantId)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-success/30 bg-success-soft/60 px-3 py-2.5" role="status" data-testid="verified-banner">
          <span className="inline-flex items-center gap-1.5 text-md font-semibold text-success">
            <ShieldCheck aria-hidden className="size-5" /> Verified by PayPal
          </span>
          {card.merchantId && <RequestId label="Account" value={card.merchantId} tone="paypal" />}
          {card.email && <span className="text-xs text-ink-2">{card.email}</span>}
          <span className="text-sm text-ink">{direct ? "Payouts: enabled, straight to this account." : "Payouts on this demo shop: not enabled (it stays on the platform account)."}</span>
        </div>
      )}
      {r && !verifiedNow && (
        <p className={cn("text-sm", r.ok ? "text-success" : "text-warning")} role="status" data-testid="get-paid-result">
          {r.text}
        </p>
      )}
      {verifiedNow && <p className="sr-only" data-testid="get-paid-result">{r!.text}</p>}

      {!direct && (
        <div className="grid gap-4 border-t border-line pt-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            <h3 className="text-sm font-semibold text-ink">What Log in with PayPal does</h3>
            <ol className="grid gap-1.5 text-sm text-ink-2" data-testid="lipp-steps">
              {STEPS.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-paypal-soft text-xs font-semibold text-paypal" aria-hidden>
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="grid content-start gap-2">
            {platform && (
              <dl className="grid gap-1.5 text-sm" data-testid="payee-rows">
                <div className="flex items-start gap-2">
                  <Landmark aria-hidden className="mt-0.5 size-4 shrink-0 text-paypal" />
                  <div>
                    <dt className="font-medium text-ink">This demo shop</dt>
                    <dd className="text-ink-2">Paid to Shopfront&apos;s sandbox account. Signing in here only shows the check.</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Store aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                  <div>
                    <dt className="font-medium text-ink">A real shop</dt>
                    <dd className="text-ink-2">Paid straight to the PayPal it connects, once PayPal says it&apos;s verified (see Fern &amp; Loom).</dd>
                  </div>
                </div>
              </dl>
            )}
            {testLogin && connectEnabled && (
              <div className="grid gap-1.5" data-testid="lipp-login">
                <p className="text-sm text-ink-2">
                  <span className="font-medium text-ink">Which login?</span> Any PayPal sandbox account, for example the sandbox test buyer:
                </p>
                <div className="flex flex-wrap gap-2">
                  <RequestId label="Email" value={testLogin.email} max={44} />
                  <RequestId label="Password" value={testLogin.password} max={24} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
