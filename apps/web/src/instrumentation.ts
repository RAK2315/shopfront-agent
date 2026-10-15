// Runs once when the Next.js server starts. Re-arms the per-checkout fallback timers (D-025) so a restart
// or a Render cold start never loses an order. Deferred, so it doesn't delay the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { rearmOpenCheckouts } = await import("./server/fallback");
  setTimeout(() => {
    rearmOpenCheckouts()
      .then((n) => console.log(`[fallback] re-armed checks for ${n} open checkout(s)`))
      .catch((e) => console.error("[fallback] re-arm failed", e));
  }, 3_000).unref?.();
}
