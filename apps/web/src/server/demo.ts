import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, notInArray, schema } from "@shopfront/db";
import { env } from "./env";
import { recordEvent } from "./events";
import { services } from "./services";
import { DEMO_SELLER_HANDLES } from "./seller-session";

// Judge mode (D-011): the shared demo seller can be reset to a frozen catalog. Orders, payments, refunds and the
// event history are never touched; only the catalog, prices, stock, drafts and the dashboard layout go back.

interface Snapshot {
  products: Array<Pick<typeof schema.products.$inferSelect, "id" | "title" | "description" | "category" | "attributes" | "priceConfirmed">>;
  variants: Array<Pick<typeof schema.variants.$inferSelect, "id" | "productId" | "priceCents" | "stock" | "active" | "options">>;
  refundPolicy: unknown;
  bio: string;
}

/** Bearer token for the reset endpoint, derived from SESSION_SECRET (no extra secret to manage). */
export function adminToken() {
  return createHmac("sha256", env().SESSION_SECRET).update("admin:demo-reset").digest("base64url");
}
export function isAdmin(req: Request) {
  const got = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const want = Buffer.from(adminToken());
  return got.length === want.length && timingSafeEqual(got, want);
}

async function demoSeller() {
  const { db } = services();
  const [s] = await db.select().from(schema.sellers).where(eq(schema.sellers.handle, DEMO_SELLER_HANDLES[0]));
  if (!s) throw new Error("Demo seller missing; run the seed.");
  return s;
}

/** Freeze the demo seller's current approved catalog as the baseline a reset restores. */
export async function freezeDemoCatalog() {
  const { db } = services();
  const s = await demoSeller();
  const products = await db.select().from(schema.products).where(and(eq(schema.products.sellerId, s.id), eq(schema.products.status, "approved")));
  const variants = products.length ? await db.select().from(schema.variants).where(inArray(schema.variants.productId, products.map((p) => p.id))) : [];
  const data: Snapshot = {
    products: products.map(({ id, title, description, category, attributes, priceConfirmed }) => ({ id, title, description, category, attributes, priceConfirmed })),
    variants: variants.map(({ id, productId, priceCents, stock, active, options }) => ({ id, productId, priceCents, stock, active, options })),
    refundPolicy: s.refundPolicy,
    bio: s.bio,
  };
  await db.insert(schema.demoSnapshots).values({ id: s.id, data }).onConflictDoUpdate({ target: schema.demoSnapshots.id, set: { data, createdAt: new Date() } });
  return { products: data.products.length, variants: data.variants.length };
}

/** Restore the frozen catalog. Idempotent and fast (a handful of statements in one transaction). */
export async function resetDemo() {
  const { db } = services();
  const t0 = Date.now();
  const s = await demoSeller();
  const [snap] = await db.select().from(schema.demoSnapshots).where(eq(schema.demoSnapshots.id, s.id));
  if (!snap) throw new Error("No frozen demo catalog. Freeze one first.");
  const data = snap.data as Snapshot;
  const keep = data.products.map((p) => p.id);
  await db.transaction(async (tx) => {
    // Anything a judge added (drafts, new listings) is archived, never deleted: its photo and history stay.
    await tx
      .update(schema.products)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(schema.products.sellerId, s.id), keep.length ? notInArray(schema.products.id, keep) : undefined));
    for (const p of data.products) {
      await tx
        .update(schema.products)
        .set({ title: p.title, description: p.description, category: p.category, attributes: p.attributes, priceConfirmed: p.priceConfirmed, status: "approved", updatedAt: new Date() })
        .where(eq(schema.products.id, p.id));
    }
    for (const v of data.variants) {
      await tx.update(schema.variants).set({ priceCents: v.priceCents, stock: v.stock, active: v.active, options: v.options }).where(eq(schema.variants.id, v.id));
    }
    await tx
      .update(schema.sellers)
      .set({ refundPolicy: data.refundPolicy as never, bio: data.bio, dashboardState: null, demoResetAt: new Date() })
      .where(eq(schema.sellers.id, s.id));
  });
  const ms = Date.now() - t0;
  await recordEvent(db, { actor: "server", kind: "demo_reset", sellerId: s.id, summary: `Demo shop reset · ${data.products.length} listings restored · order history kept`, data: { ms } });
  return { products: data.products.length, variants: data.variants.length, ms };
}
