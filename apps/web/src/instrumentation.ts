// Runs once when the Next.js server starts. Re-arms the per-checkout fallback timers (D-025) so a restart
// or a Render cold start never loses an order. Deferred, so it doesn't delay the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  // Local dev against the shared database must not race the deployed server's timers.
  if (process.env.SHOPFRONT_DISABLE_TIMERS === "1") return;
  const { rearmOpenCheckouts } = await import("./server/fallback");
  const { sweepUnprocessedWebhooks } = await import("./server/webhooks");
  const { rearmHandoffs } = await import("./server/handoff");
  const { scheduleReconciliation } = await import("./server/ledger");
  setTimeout(() => {
    rearmOpenCheckouts()
      .then((n) => console.log(`[fallback] re-armed checks for ${n} open checkout(s)`))
      .catch((e) => console.error("[fallback] re-arm failed", e));
    rearmHandoffs()
      .then((n) => n && console.log(`[handoff] re-armed checks for ${n} refund handoff(s)`))
      .catch((e) => console.error("[handoff] re-arm failed", e));
    // Verified webhooks stored before a crash or restart but never processed (REVIEW-1 #8).
    sweepUnprocessedWebhooks("boot")
      .then((ids) => ids.length && console.log(`[webhook sweep] recovered ${ids.length} event(s)`))
      .catch((e) => console.error("[webhook sweep] failed", e));
    // Reconciliation with PayPal: once on boot (after the sweep settles), then daily while the server is up (D-095).
    scheduleReconciliation();
  }, 3_000).unref?.();
}
