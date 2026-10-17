import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { eq, schema } from "@shopfront/db";
import { env } from "./env";
import { services } from "./services";

// Test, replay-check and script runs write to the shared production database. They are flagged (`is_test` on
// checkouts and events) and never shown on public views: /live, the landing hero, /api/events, the console.
// A run is a test when its request carries the signed header (read through Next's request scope, so every route,
// page and streamed response sees it), or the whole server is started with SHOPFRONT_TEST_RUN=1 (local replay
// checks). Webhooks and timers have no request: their events inherit the flag from the checkout (events.ts).
// The seller's views (orders, dashboard, insights, its event stream) hide them too, unless the request is a test run.

export const TEST_RUN_HEADER = "x-shopfront-test-run";

export function testRunSignature(): string {
  return createHmac("sha256", env().SESSION_SECRET).update("test-run").digest("base64url");
}

export function isTestRunRequest(headers: Headers): boolean {
  const v = headers.get(TEST_RUN_HEADER);
  if (!v) return false;
  const a = Buffer.from(testRunSignature());
  const b = Buffer.from(v);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isTestRun(): Promise<boolean> {
  if (process.env.SHOPFRONT_TEST_RUN === "1") return true;
  try {
    return isTestRunRequest(await headers());
  } catch {
    return false; // outside a request (webhook processing after the response, timers, boot)
  }
}

/** Seller views include test rows for a test run, or for a seller whose every order is a test by design
 * (`sellers.test_only`: the isolated Telegram judge seller, D-073/D-074). */
export async function includeTestRowsFor(sellerId: string): Promise<boolean> {
  if (await isTestRun()) return true;
  const { db } = services();
  const [s] = await db.select({ testOnly: schema.sellers.testOnly }).from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  return Boolean(s?.testOnly);
}

/** Headers for our own server-to-server calls (the hosted agent and the hack demo call /mcp over HTTP). */
export async function runHeaders(): Promise<Record<string, string>> {
  return (await isTestRun()) ? { [TEST_RUN_HEADER]: testRunSignature() } : {};
}
