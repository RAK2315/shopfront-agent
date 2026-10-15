import { errorResponse } from "@/server/http";
import { sellerOrders } from "@/server/orders";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// The seller's refund requests (queue + recent decisions) for the dashboard widget.
export async function GET() {
  try {
    const seller = await requireSeller();
    const { refunds } = await sellerOrders(seller.id);
    return Response.json({ refunds }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
