import "server-only";

// Per-IP rate limits for the public endpoints (ARCHITECTURE §7). In memory: Render free runs one instance, and a
// restart resetting the counters is acceptable. Fixed windows keep it simple and cheap.
const g = globalThis as unknown as { __shopRate?: Map<string, { start: number; n: number }> };
const buckets = (g.__shopRate ??= new Map());

const LIMITS = {
  mcp: { max: 120, windowMs: 60_000 },
  shop_chat: { max: 12, windowMs: 60_000 },
  shop_hack: { max: 6, windowMs: 60_000 },
} as const;
export type RateKey = keyof typeof LIMITS;

export function ipOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** Returns null when allowed, or a 429 response. No exemptions: the hosted agent's few calls fit the /mcp limit. */
export function rateLimit(req: Request, key: RateKey): Response | null {
  const { max, windowMs } = LIMITS[key];
  const id = `${key}:${ipOf(req)}`;
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || now - b.start >= windowMs) {
    buckets.set(id, { start: now, n: 1 });
    if (buckets.size > 5_000) for (const [k, v] of buckets) if (now - v.start >= windowMs) buckets.delete(k);
    return null;
  }
  b.n++;
  if (b.n <= max) return null;
  const retry = Math.ceil((b.start + windowMs - now) / 1000);
  return Response.json(
    { error: { code: "RATE_LIMITED", message: `Too many requests. Try again in ${retry} s.` } },
    { status: 429, headers: { "retry-after": String(retry) } },
  );
}
