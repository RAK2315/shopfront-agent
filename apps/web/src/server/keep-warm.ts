// Keep-warm from inside the server (D-114). Render's free plan sleeps after 15 idle minutes, and GitHub runs the
// keep-warm workflow's 10-minute schedule only every 2–7 hours (measured Oct 18–26), so most first visits hit a cold
// start. The server pings its own public /api/health/live every 10 minutes through the judging window. That route
// never touches the database, so Neon still sleeps (D-022). Only on Render; never locally.

const INTERVAL_MS = 10 * 60_000;
export const KEEP_WARM_UNTIL = "2026-12-16T00:00:00Z"; // judging ends Dec 15

/** The URL to ping, or null when the self-ping should not run. Pure, so it can be unit-tested. */
export function keepWarmTarget(env: Record<string, string | undefined>, now: Date, until = KEEP_WARM_UNTIL): string | null {
  if (env.RENDER !== "true" || !env.APP_URL) return null;
  if (now.getTime() >= new Date(until).getTime()) return null;
  try {
    const url = new URL("/api/health/live", env.APP_URL);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const g = globalThis as unknown as { __keepWarm?: ReturnType<typeof setInterval> };

export function startKeepWarm() {
  if (g.__keepWarm || !keepWarmTarget(process.env, new Date())) return;
  g.__keepWarm = setInterval(() => {
    const target = keepWarmTarget(process.env, new Date());
    if (!target) {
      clearInterval(g.__keepWarm);
      return;
    }
    fetch(target, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "shopfront-keep-warm" } }).catch(() => {});
  }, INTERVAL_MS);
  g.__keepWarm.unref?.();
  console.log("[keep-warm] self-ping every 10 min until", KEEP_WARM_UNTIL);
}
