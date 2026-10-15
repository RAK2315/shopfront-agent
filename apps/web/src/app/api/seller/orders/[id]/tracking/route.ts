import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";
import { AddTrackingInput, addTracking } from "@/server/tracking";

export const dynamic = "force-dynamic";

// Seller-confirmed tracking → PayPal Orders v2 /track.
export async function POST(req: Request, ctx: RouteContext<"/api/seller/orders/[id]/tracking">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    const parsed = AddTrackingInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Enter the carrier and tracking number." } }, { status: 400 });
    return Response.json({ shipment: await addTracking(seller, id, parsed.data) });
  } catch (e) {
    return errorResponse(e);
  }
}
