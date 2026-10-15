import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq, schema } from "@shopfront/db";
import { env } from "./env";
import { services } from "./services";

// Seller session: a signed cookie naming the seller. The hosted demo has one shared demo seller (judge mode, D-011);
// real seller accounts are out of scope for the hackathon build.
const COOKIE = "sf_seller";
const MAX_AGE_S = 60 * 60 * 24 * 14;
export const DEMO_SELLER_HANDLES = ["juniper_clay"] as const;

function sign(sellerId: string) {
  return createHmac("sha256", env().SESSION_SECRET).update(`seller:${sellerId}`).digest("base64url");
}

export async function startSellerSession(handle: string) {
  if (!(DEMO_SELLER_HANDLES as readonly string[]).includes(handle)) return null;
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.handle, handle));
  if (!s) return null;
  (await cookies()).set(COOKIE, `${s.id}.${sign(s.id)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE_S });
  return s;
}

/** The signed-in seller, or null. */
export async function currentSeller() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig) return null;
  const a = Buffer.from(sign(id));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.id, id));
  return s ?? null;
}

export async function requireSeller() {
  const s = await currentSeller();
  if (!s) throw new SellerAuthError();
  return s;
}

export class SellerAuthError extends Error {
  constructor() {
    super("Sign in as a seller first.");
  }
}
