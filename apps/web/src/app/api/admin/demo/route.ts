import { z } from "zod";
import { eq, schema } from "@shopfront/db";
import { resyncCatalog } from "@/server/catalog";
import { connectUrl } from "@/server/paypal-connect";
import { linkedSeller } from "@/server/telegram";
import { onPhoto } from "@/server/telegram-bot";
import { freezeDemoCatalog, isAdmin, resetDemo } from "@/server/demo";
import { runHandoffCheck } from "@/server/handoff";
import { cancelAuthorized } from "@/server/cart";
import { issueCartToken } from "@/server/cart-auth";
import { runReconciliation } from "@/server/ledger";
import { addTracking } from "@/server/tracking";
import { setPayoutAccount } from "@/server/payouts";
import { refundStrayCapture } from "@/server/refunds";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("reset") }),
  z.strictObject({ action: z.literal("freeze") }),
  // Phase 9 (D-083): connect a seller that can't sign in to the demo studio (fern_and_loom → seller 2 for AT-9).
  z.strictObject({ action: z.literal("set_payout"), handle: z.string().regex(/^[a-z0-9_]{2,40}$/), account: z.string().max(254) }),
  // Run the refund-handoff GET fallback now (AT-9: the path used when the webhook never arrives).
  z.strictObject({ action: z.literal("handoff_check"), refund_request_id: z.string().regex(/^rfr_[a-z0-9]{12}$/) }),
  // After the seed attaches listing photos (D-087): push description + image_url to PayPal's catalog for one seller.
  z.strictObject({ action: z.literal("sync_catalog"), handle: z.string().regex(/^[a-z0-9_]{2,40}$/) }),
  // AT for D-084: a Log in with PayPal link for a seller that can't sign in to the demo studio (fern_and_loom).
  z.strictObject({ action: z.literal("connect_url"), handle: z.string().regex(/^[a-z0-9_]{2,40}$/) }),
  // AT for Phase 10 (D-092): a photo "sent" by a linked test chat, handed to the same onPhoto the webhook uses (a fake
  // chat can't upload a file to Telegram). The chat must already be linked; the seller comes from that link.
  z.strictObject({ action: z.literal("tg_photo"), chat_id: z.number().int(), image_base64: z.string().max(4_000_000), caption: z.string().max(200).optional() }),
  // D-095: run the reconciliation with PayPal now (the regression suites and `pnpm reconcile`).
  z.strictObject({ action: z.literal("reconcile") }),
  // D-095: refund a capture that landed on a cancelled order (the D-094 incident) through the app's refund code.
  z.strictObject({ action: z.literal("refund_stray"), checkout_id: z.string().regex(/^chk_[a-z0-9]{12}$/), note: z.string().min(10).max(300) }),
  // Cart API ATs (D-097, D-098): a store-bound token for any store, and the seller's ship / cancel for a store the AT
  // can't sign in to (Fern & Loom, paid directly). Both run the same seller functions as the Studio.
  z.strictObject({ action: z.literal("cart_token"), handle: z.string().regex(/^[a-z0-9_]{2,40}$/), client: z.string().regex(/^[\w .:@-]{2,60}$/), ttl_seconds: z.number().int().min(-600).max(86_400).optional() }),
  z.strictObject({ action: z.literal("ship"), checkout_id: z.string().regex(/^chk_[a-z0-9]{12}$/), carrier: z.string().min(2).max(40), tracking_number: z.string().min(6).max(60) }),
  z.strictObject({ action: z.literal("cancel_order"), checkout_id: z.string().regex(/^chk_[a-z0-9]{12}$/) }),
]);

// Judge mode (D-011): nightly reset (cron-job.org calls this with the bearer token) or freeze the current catalog.
// Owner-only operations for the acceptance tests ride on the same admin token.
export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: { code: "FORBIDDEN", message: "Admin token required." } }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "bad action" } }, { status: 400 });
  try {
    const b = parsed.data;
    if (b.action === "reset") return Response.json(await resetDemo());
    if (b.action === "freeze") return Response.json(await freezeDemoCatalog());
    if (b.action === "handoff_check") return Response.json(await runHandoffCheck(b.refund_request_id));
    if (b.action === "reconcile") return Response.json(await runReconciliation("script"));
    if (b.action === "refund_stray") return Response.json(await refundStrayCapture(b.checkout_id, b.note));
    if (b.action === "ship" || b.action === "cancel_order") {
      const [row] = await services().db.select({ s: schema.sellers }).from(schema.checkouts).innerJoin(schema.sellers, eq(schema.sellers.id, schema.checkouts.sellerId)).where(eq(schema.checkouts.id, b.checkout_id));
      if (!row) return Response.json({ error: { code: "NOT_FOUND", message: "No such order." } }, { status: 404 });
      if (b.action === "cancel_order") return Response.json(await cancelAuthorized(row.s.id, b.checkout_id));
      return Response.json({ shipment: await addTracking(row.s, b.checkout_id, { carrier: b.carrier, tracking_number: b.tracking_number, source: "manual" }) });
    }
    if (b.action === "tg_photo") {
      const link = await linkedSeller(b.chat_id);
      if (!link) return Response.json({ error: { code: "NOT_FOUND", message: "That chat isn't linked." } }, { status: 404 });
      await onPhoto(b.chat_id, link.sellerId, Buffer.from(b.image_base64, "base64"), b.caption);
      return Response.json({ ok: true });
    }
    const [s] = await services().db.select().from(schema.sellers).where(eq(schema.sellers.handle, b.handle));
    if (!s) return Response.json({ error: { code: "NOT_FOUND", message: "No such seller." } }, { status: 404 });
    if (b.action === "sync_catalog") return Response.json(await resyncCatalog(s));
    if (b.action === "connect_url") return Response.json({ url: connectUrl(s.id) });
    // A negative ttl mints an already-expired token (the AT's expiry check).
    if (b.action === "cart_token") return Response.json(b.ttl_seconds !== undefined && b.ttl_seconds < 0 ? issueCartToken(s.handle, b.client, 3600, 3600 - b.ttl_seconds) : issueCartToken(s.handle, b.client, b.ttl_seconds ?? 3600));
    return Response.json(await setPayoutAccount(s.id, b.account));
  } catch (e) {
    return Response.json({ error: { code: "ERROR", message: e instanceof Error ? e.message : "failed" } }, { status: 500 });
  }
}
