import { confirmationOf, type CheckoutStatus } from "@shopfront/core";
import { and, asc, eq, schema } from "@shopfront/db";
import { services } from "@/server/services";
import { verifyOrderToken } from "@/server/tokens";

export const dynamic = "force-dynamic";

// Status for the buyer's order page (/pay): payment confirmation, then the seller's notes, tracking and refunds.
export async function GET(req: Request, ctx: RouteContext<"/api/checkouts/[id]/status">) {
  const { id } = await ctx.params;
  if (!(await verifyOrderToken(id, new URL(req.url).searchParams.get("t")))) return Response.json({ message: "Forbidden" }, { status: 403 });
  const { db } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, id));
  if (!c) return Response.json({ message: "Not found" }, { status: 404 });
  const [[cap], ships, msgs, refunds] = await Promise.all([
    db.select().from(schema.captures).where(eq(schema.captures.checkoutId, id)),
    db.select().from(schema.shipments).where(eq(schema.shipments.checkoutId, id)),
    db.select().from(schema.messages).where(and(eq(schema.messages.checkoutId, id), eq(schema.messages.status, "published"))).orderBy(asc(schema.messages.createdAt)),
    db.select().from(schema.refundRequests).where(eq(schema.refundRequests.checkoutId, id)).orderBy(asc(schema.refundRequests.createdAt)),
  ]);
  return Response.json({
    status: c.status,
    confirmedVia: c.confirmedVia,
    webhookConfirmedAt: c.webhookConfirmedAt?.toISOString() ?? null,
    pollConfirmedAt: c.pollConfirmedAt?.toISOString() ?? null,
    confirmation: confirmationOf({ ...c, status: c.status as CheckoutStatus }),
    paypalOrderId: c.paypalOrderId,
    captureId: cap?.paypalCaptureId ?? null,
    // The buyer's order page (D-008): the seller's notes, tracking and refunds.
    tracking: ships.map((s) => ({ carrier: s.carrier, trackingNumber: s.trackingNumber })),
    messages: msgs.map((m) => ({ id: m.id, kind: m.kind, subject: m.subject, body: m.body, at: m.createdAt.toISOString() })),
    refunds: refunds.map((r) => ({ id: r.id, status: r.status, amountCents: r.amountCents, paypalRefundId: r.paypalRefundId })),
  });
}
