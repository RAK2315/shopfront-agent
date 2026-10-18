import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq, schema } from "@shopfront/db";
import { env } from "./env";
import { services } from "./services";
import { DEMO_SELLER_HANDLES } from "./seller-session";

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

/** The demo seller's "Include test orders" switch (D-087). Its whole order history comes from real sandbox test runs,
 * so it is on by default there and every such row carries a "Test run" badge. Real sellers never see test rows. */
export const TEST_ORDERS_COOKIE = "sf_test_orders";

export async function testOrdersSwitch(sellerId: string): Promise<{ available: boolean; on: boolean }> {
  const { db } = services();
  const [s] = await db.select({ handle: schema.sellers.handle, testOnly: schema.sellers.testOnly }).from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  if (!s) return { available: false, on: false };
  if (s.testOnly) return { available: false, on: true }; // the judge practice shop: every order is a test by design
  if (!(DEMO_SELLER_HANDLES as readonly string[]).includes(s.handle)) return { available: false, on: false };
  try {
    return { available: true, on: (await cookies()).get(TEST_ORDERS_COOKIE)?.value !== "0" };
  } catch {
    return { available: true, on: false }; // outside a request
  }
}

/** Seller views include test rows for a test run, for a seller whose every order is a test by design
 * (`sellers.test_only`: the isolated Telegram judge seller, D-073/D-074), or when the demo seller's switch is on. */
export async function includeTestRowsFor(sellerId: string): Promise<boolean> {
  if (await isTestRun()) return true;
  return (await testOrdersSwitch(sellerId)).on;
}

/** Headers for our own server-to-server calls (the hosted agent and the hack demo call /mcp over HTTP). */
export async function runHeaders(): Promise<Record<string, string>> {
  return (await isTestRun()) ? { [TEST_RUN_HEADER]: testRunSignature() } : {};
}
