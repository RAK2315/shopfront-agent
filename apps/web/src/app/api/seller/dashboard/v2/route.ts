import { kpisFrom, listingsGrid, ordersGrid } from "@/server/dashboard-v2";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Dashboard v2 data (D-089): orders for the grid, KPIs computed from the same rows, and listings.
export async function GET() {
  try {
    const seller = await requireSeller();
    const [orders, listings] = await Promise.all([ordersGrid(seller.id), listingsGrid(seller.id)]);
    return Response.json({ orders, kpis: kpisFrom(orders), listings }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
