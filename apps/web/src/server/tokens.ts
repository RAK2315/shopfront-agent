import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// The order token is HMAC(SESSION_SECRET, checkoutId): deterministic, so an idempotent create_checkout retry
// returns the same token, and nothing secret has to be stored (we keep only a hash for audit).
export function orderTokenFor(checkoutId: string): string {
  return createHmac("sha256", env().SESSION_SECRET).update(`order-token:${checkoutId}`).digest("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyOrderToken(checkoutId: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const a = Buffer.from(orderTokenFor(checkoutId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
