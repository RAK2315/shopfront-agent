import { cancelAuthorized } from "@/server/cart";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Cancel an authorized (Cart API) order before it ships: the hold is voided, or handed to a direct-paid seller (D-098).
export async function POST(_req: Request, ctx: RouteContext<"/api/seller/orders/[id]/cancel">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    return Response.json(await cancelAuthorized(seller.id, id));
  } catch (e) {
    return errorResponse(e);
  }
}
