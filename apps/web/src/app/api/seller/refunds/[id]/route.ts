import { z } from "zod";
import { errorResponse } from "@/server/http";
import { decideRefundAsSeller } from "@/server/refunds";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ approve: z.boolean() });

// One-tap approve or decline from the refund queue. Approve runs the same deterministic executor as auto-refunds;
// a double tap finds the request already executed (row lock + PayPal-Request-Id).
export async function POST(req: Request, ctx: RouteContext<"/api/seller/refunds/[id]">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    if (!/^rfr_[a-z0-9]{12}$/.test(id)) return Response.json({ error: { code: "NOT_FOUND", message: "Refund request not found." } }, { status: 404 });
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Approve or decline." } }, { status: 400 });
    const r = await decideRefundAsSeller(seller.id, id, parsed.data.approve);
    return Response.json({ refund: { id: r.id, status: r.status, paypalRefundId: r.paypalRefundId, amountCents: r.amountCents } });
  } catch (e) {
    return errorResponse(e);
  }
}
