import "server-only";
import { confirmationOf, type CheckoutStatus, type Confirmation } from "@shopfront/core";
import { and, desc, eq, inArray, schema, sql } from "@shopfront/db";
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

/**
 * Recent checkouts for the live console. No buyer email or address: the console is public in the demo.
 * Test and script runs are left out unless the caller is itself a test run (run-context.ts).
 */
export async function recentCheckouts(limit = 12, includeTest = false): Promise<ConsoleCheckout[]> {
  const { db } = services();
  const rows = await db
    .select()
    .from(schema.checkouts)
    .where(includeTest ? undefined : eq(schema.checkouts.isTest, false))
    .orderBy(desc(schema.checkouts.createdAt))
    .limit(limit);
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

export async function recentEvents(limit = 60, includeTest = false): Promise<ShopEvent[]> {
  const { db } = services();
  const rows = await db
    .select()
    .from(schema.events)
    .where(and(includeTest ? undefined : eq(schema.events.isTest, false)))
    .orderBy(desc(schema.events.id))
    .limit(limit);
  return rows.map(toShopEvent);
}

export interface LiveStats {
  agentSteps: number;
  mcpCalls: number;
  payments: number;
  blocked: number;
  since: string;
}

/** The /live KPI strip (walkthrough #7): the last 24 hours of public events, counted by the database. */
export async function liveStats(includeTest = false): Promise<LiveStats> {
  const { db } = services();
  const since = new Date(Date.now() - 86_400_000);
  const rows = await db.execute<{ agent: number; mcp: number; paid: number; blocked: number }>(sql`
    select
      count(*) filter (where actor in ('buyer_agent', 'ops_agent'))::int as agent,
      count(*) filter (where actor = 'mcp' and kind <> 'tool_error')::int as mcp,
      count(distinct checkout_id) filter (where kind = 'captured')::int as paid,
      count(*) filter (where (kind = 'tool_error' and data->>'errorCode' = 'VALIDATION_ERROR') or kind in ('webhook_rejected', 'hack_blocked'))::int as blocked
    from ${schema.events}
    where created_at >= ${since} and (${includeTest} or not is_test)`);
  const r = rows.rows[0] ?? { agent: 0, mcp: 0, paid: 0, blocked: 0 };
  return { agentSteps: Number(r.agent), mcpCalls: Number(r.mcp), payments: Number(r.paid), blocked: Number(r.blocked), since: since.toISOString() };
}
