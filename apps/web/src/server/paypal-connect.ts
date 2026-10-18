import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MERCHANT_ID_RE, ShopError } from "@shopfront/core";
import { desc, eq, and, schema } from "@shopfront/db";
import { appUrl, env } from "./env";
import { recordEvent } from "./events";
import { services } from "./services";

// "Get paid" with Log in with PayPal (D-084, walkthrough #10). The seller signs in to PayPal; PayPal tells us their
// account id (payer id) and email, so a payout account is verified before any order is routed to it. The user's
// token is used once, server-side, and never stored. The platform demo shop is never rerouted: connecting there
// only proves the identity check works (shown on its card).

export const RETURN_PATH = "/api/seller/paypal/return";
const STATE_TTL_MS = 10 * 60_000;
// Email, PayPal account ID (payer id) and account verification status, as enabled on the app (owner, 2026-10-18).
const SCOPES = ["openid", "email", "https://uri.paypal.com/services/paypalattributes"];
const used = new Set<string>(); // single instance (D-022): a replayed state is refused

const sig = (payload: string) => createHmac("sha256", env().SESSION_SECRET).update(`paypal-connect:${payload}`).digest("base64url");

export function connectState(sellerId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ s: sellerId, n: randomBytes(9).toString("base64url"), e: now + STATE_TTL_MS })).toString("base64url");
  return `${payload}.${sig(payload)}`;
}

export function readState(state: string, now = Date.now()): { sellerId: string; nonce: string } | null {
  const [payload, mac] = state.split(".");
  if (!payload || !mac) return null;
  const a = Buffer.from(sig(payload));
  const b = Buffer.from(mac);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as { s: string; n: string; e: number };
    if (typeof p.s !== "string" || typeof p.n !== "string" || p.e < now) return null;
    return { sellerId: p.s, nonce: p.n };
  } catch {
    return null;
  }
}

/** PayPal's consent page (sandbox host from the API base). */
export function connectUrl(sellerId: string) {
  const host = new URL(env().PAYPAL_BASE_URL).hostname.includes("sandbox") ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
  const q = new URLSearchParams({ flowEntry: "static", client_id: env().PAYPAL_CLIENT_ID, response_type: "code", scope: SCOPES.join(" "), redirect_uri: appUrl(RETURN_PATH), state: connectState(sellerId) });
  return `${host}/connect?${q.toString().replace(/\+/g, "%20")}`;
}

interface PayPalIdentity {
  payerId: string | null;
  email: string | null;
  verifiedAccount: boolean | null;
  fields: string[];
}

async function identity(code: string): Promise<PayPalIdentity> {
  const e = env();
  const tokenRes = await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { authorization: `Basic ${Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }).toString(),
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenRes.ok || !token.access_token) throw new ShopError("UPSTREAM_ERROR", `PayPal didn't accept the sign-in (${token.error ?? tokenRes.status}).`);
  // paypalv1.1 returns payer_id with the PayPal-account-id scope; the OpenID endpoint is the documented fallback.
  for (const url of [`${e.PAYPAL_BASE_URL}/v1/identity/oauth2/userinfo?schema=paypalv1.1`, `${e.PAYPAL_BASE_URL}/v1/identity/openidconnect/userinfo?schema=openid`]) {
    const r = await fetch(url, { headers: { authorization: `Bearer ${token.access_token}` } });
    if (!r.ok) continue;
    const u = (await r.json()) as { payer_id?: string; email?: string; emails?: Array<{ value: string; primary?: boolean }>; verified_account?: string | boolean };
    const email = u.emails?.find((x) => x.primary)?.value ?? u.emails?.[0]?.value ?? u.email ?? null;
    return { payerId: u.payer_id ?? null, email, verifiedAccount: u.verified_account === undefined ? null : String(u.verified_account) === "true", fields: Object.keys(u) };
  }
  throw new ShopError("UPSTREAM_ERROR", "PayPal didn't share the account details.");
}

export type ConnectOutcome = { kind: "verified" | "demo_verified" | "account_unverified"; sellerId: string; merchantId: string; email: string | null };

/** The return leg: check the state, exchange the code, read the account, then verify the seller (or, for the
 * platform demo shop, only record that the check passed). */
export async function completeConnect(code: string, state: string): Promise<ConnectOutcome> {
  const st = readState(state);
  if (!st || used.has(st.nonce)) throw new ShopError("FORBIDDEN", "This PayPal sign-in link expired or was already used. Start again from the Get paid card.");
  used.add(st.nonce);
  const id = await identity(code);
  if (!id.payerId || !MERCHANT_ID_RE.test(id.payerId)) throw new ShopError("UPSTREAM_ERROR", "PayPal didn't share the account id. Allow 'PayPal account ID' when asked.");
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.id, st.sellerId));
  if (!s) throw new ShopError("NOT_FOUND", "Seller not found.");
  const masked = id.email ? id.email.replace(/^(.).*(@.*)$/, "$1…$2") : null;
  if (s.payoutStatus === "platform") {
    await recordEvent(db, { actor: "paypal", kind: "payout_identity_checked", sellerId: s.id, summary: `Log in with PayPal confirmed account ${id.payerId} · this demo shop stays on the platform account`, data: { merchantId: id.payerId, email: masked, verifiedAccount: id.verifiedAccount, fields: id.fields }, isTest: true });
    return { kind: "demo_verified", sellerId: s.id, merchantId: id.payerId, email: masked };
  }
  // Account verification status is an extra signal (owner, 2026-10-18): PayPal saying the account itself is not
  // verified keeps the seller unpaid until they verify it in PayPal and connect again. Unknown (not shared) is allowed.
  if (id.verifiedAccount === false) {
    await db.update(schema.sellers).set({ paypalMerchantId: id.payerId, payoutEmail: id.email?.toLowerCase() ?? s.payoutEmail, payoutStatus: "unverified", payoutVerifiedAt: null }).where(eq(schema.sellers.id, s.id));
    await recordEvent(db, { actor: "paypal", kind: "payout_account_unverified", sellerId: s.id, summary: `PayPal account ${id.payerId} isn't verified by PayPal yet · not paid until it is`, data: { merchantId: id.payerId, email: masked, verifiedAccount: false, fields: id.fields } });
    return { kind: "account_unverified", sellerId: s.id, merchantId: id.payerId, email: masked };
  }
  await db.update(schema.sellers).set({ paypalMerchantId: id.payerId, payoutEmail: id.email?.toLowerCase() ?? s.payoutEmail, payoutStatus: "verified", payoutVerifiedAt: new Date() }).where(eq(schema.sellers.id, s.id));
  await recordEvent(db, { actor: "paypal", kind: "payout_verified", sellerId: s.id, summary: `Seller's PayPal verified by Log in with PayPal · merchant ${id.payerId}`, data: { merchantId: id.payerId, email: masked, via: "log_in_with_paypal", verifiedAccount: id.verifiedAccount, fields: id.fields } });
  return { kind: "verified", sellerId: s.id, merchantId: id.payerId, email: masked };
}

/** What the Get paid card shows. */
export async function payoutCard(sellerId: string) {
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  if (!s) return null;
  const [check] = await db
    .select({ data: schema.events.data, at: schema.events.createdAt })
    .from(schema.events)
    .where(and(eq(schema.events.sellerId, sellerId), eq(schema.events.kind, s.payoutStatus === "platform" ? "payout_identity_checked" : "payout_verified")))
    .orderBy(desc(schema.events.id))
    .limit(1);
  const d = (check?.data ?? {}) as { merchantId?: string; email?: string; via?: string };
  return {
    status: s.payoutStatus as "platform" | "none" | "unverified" | "verified",
    merchantId: s.payoutStatus === "platform" ? (d.merchantId ?? null) : s.paypalMerchantId,
    email: d.email ?? (s.payoutEmail ? s.payoutEmail.replace(/^(.).*(@.*)$/, "$1…$2") : null),
    via: s.payoutStatus === "platform" ? (check ? "log_in_with_paypal" : null) : (d.via ?? (s.payoutStatus === "verified" ? "first_payment" : null)),
    checkedAt: check?.at.toISOString() ?? null,
  };
}
