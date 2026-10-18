import { orderHistory } from "@/server/dashboard-v2";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// The orders grid's drill-down (D-089): one order's events and raw PayPal calls, for its own seller only.
export async function GET(_req: Request, ctx: RouteContext<"/api/seller/orders/[id]/history">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    if (!/^chk_[a-z0-9]{12}$/.test(id)) return Response.json({ error: { code: "NOT_FOUND", message: "Order not found." } }, { status: 404 });
    return Response.json(await orderHistory(seller.id, id), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
