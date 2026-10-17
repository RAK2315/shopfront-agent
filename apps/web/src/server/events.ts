import "server-only";
import { EventEmitter } from "node:events";
import { eq, schema, type Db } from "@shopfront/db";
import { isTestRun } from "./run-context";

export type Actor = (typeof schema.eventActor.enumValues)[number];

export interface ShopEvent {
  id: number;
  sellerId: string | null;
  checkoutId: string | null;
  actor: Actor;
  kind: string;
  summary: string;
  data: Record<string, unknown>;
  isTest: boolean;
  createdAt: string;
}

// One in-process bus per server instance (Render free = one instance). SSE subscribers listen here;
// the `events` table stays the source of truth so a reconnecting dashboard can replay what it missed.
const g = globalThis as unknown as { __shopBus?: EventEmitter };
export const bus = (g.__shopBus ??= new EventEmitter().setMaxListeners(100));

export async function recordEvent(
  db: Db,
  e: { actor: Actor; kind: string; summary: string; sellerId?: string | null; checkoutId?: string | null; data?: Record<string, unknown> },
): Promise<ShopEvent> {
  const isTest = (await isTestRun()) || (e.checkoutId ? await checkoutIsTest(db, e.checkoutId) : false);
  const [row] = await db
    .insert(schema.events)
    .values({
      isTest,
      actor: e.actor,
      kind: e.kind,
      summary: e.summary,
      sellerId: e.sellerId ?? null,
      checkoutId: e.checkoutId ?? null,
      data: e.data ?? {},
    })
    .returning();
  const ev = toShopEvent(row!);
  bus.emit("event", ev);
  return ev;
}

export function toShopEvent(row: typeof schema.events.$inferSelect): ShopEvent {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

// Webhooks and fallback timers carry no request context: their events inherit the flag from the checkout.
// Only `true` is cached: a checkout can be archived as test later (a purge), never the other way round.
const testCheckouts = new Set<string>();
async function checkoutIsTest(db: Db, checkoutId: string): Promise<boolean> {
  if (testCheckouts.has(checkoutId)) return true;
  const [c] = await db.select({ isTest: schema.checkouts.isTest }).from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c?.isTest) return false;
  if (testCheckouts.size > 5000) testCheckouts.clear();
  testCheckouts.add(checkoutId);
  return true;
}
