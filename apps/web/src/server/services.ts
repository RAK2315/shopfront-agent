import "server-only";
import { getDb, schema, type Db } from "@shopfront/db";
import { createPayPalApi, PayPalClient, type PayPalApi } from "@shopfront/paypal";
import { env } from "./env";
import { recordEvent } from "./events";

// Process-wide singletons (one cached OAuth token, one DB pool).
const g = globalThis as unknown as { __shop?: { db: Db; paypal: PayPalApi; client: PayPalClient } };

export function services() {
  if (g.__shop) return g.__shop;
  const e = env();
  const db = getDb(e.DATABASE_URL);
  const client = new PayPalClient({
    baseUrl: e.PAYPAL_BASE_URL,
    clientId: e.PAYPAL_CLIENT_ID,
    clientSecret: e.PAYPAL_CLIENT_SECRET,
    // Every PayPal call is logged with its real ids (request id, debug id) for the timeline.
    onCall: async (c) => {
      try {
        await db.insert(schema.paypalCalls).values({
          method: c.method,
          path: c.path,
          status: c.status,
          paypalRequestId: c.paypalRequestId,
          debugId: c.debugId,
          durationMs: c.durationMs,
          checkoutId: c.context?.checkoutId,
        });
      } catch {
        /* logging must never break a payment */
      }
    },
  });
  g.__shop = { db, client, paypal: createPayPalApi(client) };
  return g.__shop;
}

export { recordEvent };
