import "server-only";
import { EventEmitter } from "node:events";
import { schema, type Db } from "@shopfront/db";

export type Actor = (typeof schema.eventActor.enumValues)[number];

export interface ShopEvent {
  id: number;
  sellerId: string | null;
  checkoutId: string | null;
  actor: Actor;
  kind: string;
  summary: string;
  data: Record<string, unknown>;
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
  const [row] = await db
    .insert(schema.events)
    .values({
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
