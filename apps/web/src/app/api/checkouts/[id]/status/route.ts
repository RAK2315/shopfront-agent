import { confirmationOf, type CheckoutStatus } from "@shopfront/core";
import { eq, schema } from "@shopfront/db";
import { services } from "@/server/services";
import { verifyOrderToken } from "@/server/tokens";

export const dynamic = "force-dynamic";

// Lightweight status for the /pay page (shows "webhook verified" once PayPal's event lands).
export async function GET(req: Request, ctx: RouteContext<"/api/checkouts/[id]/status">) {
  const { id } = await ctx.params;
  if (!verifyOrderToken(id, new URL(req.url).searchParams.get("t"))) return Response.json({ message: "Forbidden" }, { status: 403 });
  const { db } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, id));
  if (!c) return Response.json({ message: "Not found" }, { status: 404 });
  const [cap] = await db.select().from(schema.captures).where(eq(schema.captures.checkoutId, id));
  return Response.json({
    status: c.status,
    confirmedVia: c.confirmedVia,
    webhookConfirmedAt: c.webhookConfirmedAt?.toISOString() ?? null,
    pollConfirmedAt: c.pollConfirmedAt?.toISOString() ?? null,
    confirmation: confirmationOf({ ...c, status: c.status as CheckoutStatus }),
    paypalOrderId: c.paypalOrderId,
    captureId: cap?.paypalCaptureId ?? null,
  });
}
