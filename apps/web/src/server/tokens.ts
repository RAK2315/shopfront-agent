import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq, schema } from "@shopfront/db";
import { env } from "./env";
import { services } from "./services";

// The order token is a bearer secret handed ONLY to the caller that created the checkout (in the create_checkout
// result and the pay_url). It can't be derived from the checkout id, so no route can issue one for an arbitrary
// checkout (REVIEW-1 #2). We store only its hash.
// - With a client_request_id it is HMAC(SESSION_SECRET, checkoutId + key), so an idempotent retry by the same caller,
//   who holds the key, gets the same token back.
// - Without one it is 32 random bytes and can never be issued again.
export function newOrderToken(checkoutId: string, clientRequestId: string | null): string {
  if (!clientRequestId) return randomBytes(32).toString("base64url");
  return createHmac("sha256", env().SESSION_SECRET).update(`order-token:${checkoutId}:${clientRequestId}`).digest("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatchesHash(token: string | null | undefined, hash: string | null | undefined): boolean {
  if (!token || !hash) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function verifyOrderToken(checkoutId: string, token: string | null | undefined): Promise<boolean> {
  if (!token || !/^chk_[a-z0-9]{12}$/.test(checkoutId)) return false;
  const [c] = await services()
    .db.select({ hash: schema.checkouts.orderTokenHash })
    .from(schema.checkouts)
    .where(eq(schema.checkouts.id, checkoutId));
  return tokenMatchesHash(token, c?.hash);
}

/**
 * The hosted agent's model picks its own idempotency keys, and models reuse well-known example UUIDs. Namespacing the
 * key by buyer session keeps two shoppers from ever sharing a checkout (or its token) through the same key.
 */
export function sessionScopedRequestId(sessionId: string, clientRequestId: string): string {
  const h = createHash("sha256").update(`crid:${sessionId}:${clientRequestId}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x40; // version 4 layout
  h[8] = (h[8]! & 0x3f) | 0x80; // RFC 9562 variant
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
