import "server-only";
import { createHash, createHmac, createPrivateKey, createPublicKey, randomUUID, sign, verify, type KeyObject } from "node:crypto";
import { env } from "./env";

// Bearer JWTs for PayPal's Cart API v1 (D-097, D-098). The spec says PayPal supplies them once a merchant is onboarded to
// Store Sync, which is gated behind an access request. Until then Shopfront issues its own: EdDSA (Ed25519), one store
// per token (`aud` = the store handle in the URL), short-lived, public key at /.well-known/jwks.json. The verifier below
// is the single check every Cart API request passes, so PayPal's issuer slots in here at onboarding.
// The key is derived from SESSION_SECRET (no new secret to manage or leak), and rotates with it.

const MAX_TTL_S = 30 * 24 * 3600;
const SKEW_S = 30;

type Keys = { privateKey: KeyObject; publicKey: KeyObject; kid: string; jwk: Record<string, string> };
const g = globalThis as unknown as { __cartKeys?: Keys };

function keys(): Keys {
  if (g.__cartKeys) return g.__cartKeys;
  const seed = createHmac("sha256", env().SESSION_SECRET).update("cart-api-jwt:ed25519:v1").digest();
  // PKCS#8 wrapper for a raw Ed25519 seed (RFC 8410): fixed 16-byte prefix + the 32-byte seed.
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const pub = publicKey.export({ format: "jwk" }) as { kty: string; crv: string; x: string };
  const kid = createHash("sha256").update(pub.x).digest("base64url").slice(0, 16);
  g.__cartKeys = { privateKey, publicKey, kid, jwk: { kty: pub.kty, crv: pub.crv, x: pub.x, kid, alg: "EdDSA", use: "sig" } };
  return g.__cartKeys;
}

export function issuer(): string {
  return new URL(env().APP_URL).origin;
}

export function jwks() {
  return { keys: [keys().jwk] };
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

/** A store-bound Cart API token. `client` names the agent (it becomes the JWT subject and the cart's client). */
export function issueCartToken(storeHandle: string, client: string, ttlSeconds: number, backdateSeconds = 0) {
  const k = keys();
  // backdateSeconds exists for the AT's expired-token check only (admin action); real tokens start now.
  const now = Math.floor(Date.now() / 1000) - Math.max(0, Math.floor(backdateSeconds));
  const exp = now + Math.min(Math.max(60, Math.floor(ttlSeconds)), MAX_TTL_S);
  const head = b64({ alg: "EdDSA", typ: "JWT", kid: k.kid });
  const body = b64({ iss: issuer(), aud: storeHandle, sub: client.replace(/[^\w .:@-]/g, "").slice(0, 60) || "agent", scope: "cart", iat: now, exp, jti: randomUUID() });
  const sig = sign(null, Buffer.from(`${head}.${body}`), k.privateKey).toString("base64url");
  return { token: `${head}.${body}.${sig}`, expires_at: new Date(exp * 1000).toISOString(), store: storeHandle };
}

export type CartAuth = { ok: true; store: string; client: string; jti: string } | { ok: false; status: 401 | 403; name: string; message: string };

/** Verify `Authorization: Bearer <jwt>` for the store named in the URL. Never trusts the token's own `alg`. */
export function verifyCartToken(authorization: string | null, storeHandle: string): CartAuth {
  const m = /^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(authorization?.trim() ?? "");
  if (!m) return { ok: false, status: 401, name: "UNAUTHENTICATED", message: "A Bearer JWT for this store is required." };
  const [, h, b, s] = m as unknown as [string, string, string, string];
  let head: { alg?: string; kid?: string };
  let claims: { iss?: string; aud?: string; sub?: string; scope?: string; exp?: number; iat?: number; jti?: string };
  try {
    head = JSON.parse(Buffer.from(h, "base64url").toString());
    claims = JSON.parse(Buffer.from(b, "base64url").toString());
  } catch {
    return { ok: false, status: 401, name: "INVALID_TOKEN", message: "The token is malformed." };
  }
  const k = keys();
  // Only our key and only EdDSA: "alg: none" and algorithm swaps are refused before any signature work.
  if (head.alg !== "EdDSA" || head.kid !== k.kid) return { ok: false, status: 401, name: "INVALID_TOKEN", message: "Unknown signing key or algorithm." };
  if (!verify(null, Buffer.from(`${h}.${b}`), k.publicKey, Buffer.from(s, "base64url"))) return { ok: false, status: 401, name: "INVALID_TOKEN", message: "Bad signature." };
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== issuer() || claims.scope !== "cart") return { ok: false, status: 401, name: "INVALID_TOKEN", message: "Wrong issuer or scope." };
  if (!claims.exp || claims.exp + SKEW_S < now || (claims.iat ?? 0) - SKEW_S > now || claims.exp - (claims.iat ?? 0) > MAX_TTL_S) return { ok: false, status: 401, name: "TOKEN_EXPIRED", message: "The token has expired." };
  if (claims.aud !== storeHandle) return { ok: false, status: 403, name: "PERMISSION_DENIED", message: "This token is bound to another store." };
  return { ok: true, store: storeHandle, client: claims.sub ?? "agent", jti: claims.jti ?? "" };
}
