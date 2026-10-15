import "server-only";
import { confirmationOf, type CheckoutStatus, type Confirmation } from "@shopfront/core";
import { desc, inArray, schema } from "@shopfront/db";
import { toShopEvent, type ShopEvent } from "./events";
import { services } from "./services";

export interface ConsoleCheckout {
  id: string;
  status: CheckoutStatus;
  totalCents: number;
  currency: string;
  items: string;
  confirmation: Confirmation;
  buyerCountry: string | null;
  client: string | null;
  source: string;
  paypalOrderId: string | null;
  captureId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Recent checkouts for the live console. No buyer email or address: the console is public in the demo. */
export async function recentCheckouts(limit = 12): Promise<ConsoleCheckout[]> {
  const { db } = services();
  const rows = await db.select().from(schema.checkouts).orderBy(desc(schema.checkouts.createdAt)).limit(limit);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [items, caps] = await Promise.all([
    db.select().from(schema.checkoutItems).where(inArray(schema.checkoutItems.checkoutId, ids)),
    db.select().from(schema.captures).where(inArray(schema.captures.checkoutId, ids)),
  ]);
  return rows.map((c) => {
    const status = c.status as CheckoutStatus;
    return {
      id: c.id,
      status,
      totalCents: c.totalCents,
      currency: c.currency,
      items: items
        .filter((i) => i.checkoutId === c.id)
        .map((i) => `${i.quantity} × ${i.titleSnapshot}`)
        .join(", "),
      confirmation: confirmationOf({ ...c, status }),
      buyerCountry: c.buyerCountry,
      client: c.mcpClientName,
      source: c.source,
      paypalOrderId: c.paypalOrderId,
      captureId: caps.find((k) => k.checkoutId === c.id)?.paypalCaptureId ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

export async function recentEvents(limit = 60): Promise<ShopEvent[]> {
  const { db } = services();
  const rows = await db.select().from(schema.events).orderBy(desc(schema.events.id)).limit(limit);
  return rows.map(toShopEvent);
}
