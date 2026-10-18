import { Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import { centsToValue } from "@shopfront/core";
import type { SellerReconciliation } from "@/server/ledger";
import { cn } from "@/lib/cn";

function ago(iso?: string) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 48 * 60 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
}

/**
 * "Reconciled with PayPal ✓ / N mismatches" (D-095). The latest reconciliation run, scoped to this seller; opens to
 * show what was compared and every mismatch with its ids. Read-only: fixing a mismatch is an operator action.
 */
export function ReconcileBadge({ r }: { r: SellerReconciliation }) {
  const n = r.mismatches.length;
  const s = (r.sources ?? {}) as { windowDays?: number; transactionSearch?: number; webhooks?: number; askedPayPal?: number; unchecked?: number };
  const tone = r.state === "mismatch" ? "danger" : r.state === "ok" ? "success" : "muted";
  const Icon = r.state === "mismatch" ? TriangleAlert : r.state === "ok" ? ShieldCheck : Clock;
  const label =
    r.state === "mismatch" ? `${n} mismatch${n === 1 ? "" : "es"} with PayPal` : r.state === "ok" ? "Reconciled with PayPal ✓" : r.state === "incomplete" ? "PayPal check incomplete" : "PayPal check pending";
  return (
    <details className="group relative" data-testid="reconcile-badge" data-state={r.state} data-mismatches={n}>
      <summary
        className={cn(
          "inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-pill border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay [&::-webkit-details-marker]:hidden",
          tone === "danger" && "border-danger/40 bg-danger-soft text-danger",
          tone === "success" && "border-success/40 bg-success-soft text-success",
          tone === "muted" && "border-line-strong bg-surface text-ink-2",
        )}
      >
        <Icon aria-hidden className="size-4" />
        {label}
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[24rem] sm:left-auto sm:right-0 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-4 text-sm shadow-float" data-testid="reconcile-details">
        <p className="font-medium text-ink">
          {r.state === "pending" ? "The first check is running." : `Checked ${ago(r.checkedAt)}: ${r.matched} payment${r.matched === 1 ? "" : "s"} match PayPal.`}
        </p>
        <p className="mt-1 text-ink-2">
          Every PayPal capture in the last {s.windowDays ?? 30} days is compared with this shop&apos;s orders: PayPal&apos;s Transaction Search ({s.transactionSearch ?? 0}), verified webhooks ({s.webhooks ?? 0}) and direct checks ({s.askedPayPal ?? 0}). Runs on start-up and daily.
        </p>
        {r.error && <p className="mt-2 text-warning">{r.error}</p>}
        {n > 0 && (
          <ul className="mt-3 space-y-2" aria-label="Mismatches">
            {r.mismatches.map((m) => (
              <li key={`${m.kind}${m.captureId}${m.checkoutId}`} className="rounded-md bg-danger-soft p-2.5" data-testid="reconcile-mismatch">
                <p className="font-medium text-danger">
                  {m.label}
                  {m.amountCents !== undefined && <span className="tabular"> · ${centsToValue(m.amountCents)}</span>}
                  {m.isTest && <span className="font-normal text-ink-2"> · test run</span>}
                </p>
                <p className="mt-0.5 text-ink-2">{m.detail}.</p>
                <p className="mt-0.5 font-mono text-xs text-muted">
                  {m.checkoutId && <>order {m.checkoutId} </>}
                  {m.captureId && <>· capture {m.captureId}</>}
                </p>
              </li>
            ))}
          </ul>
        )}
        {r.explained.length > 0 && (
          <div className="mt-3 border-t border-line pt-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Explained, not mismatches</p>
            {r.explained.map((x) => (
              <p key={x.captureId} className="mt-1 text-ink-2">
                <span className="font-mono text-xs">{x.captureId}</span>
                {x.amountCents !== undefined && <span className="tabular"> · ${centsToValue(x.amountCents)}</span>} · {x.reason}
              </p>
            ))}
          </div>
        )}
        {(s.unchecked ?? 0) > 0 && <p className="mt-2 text-xs text-muted">{s.unchecked} newer payment(s) wait for PayPal&apos;s records and are checked on the next run.</p>}
      </div>
    </details>
  );
}
