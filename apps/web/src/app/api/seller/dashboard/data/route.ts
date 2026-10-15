import { dashboardData } from "@/server/dashboard";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Data sources for the AG Studio dashboard (refetched when the live stream reports a change).
export async function GET() {
  try {
    const seller = await requireSeller();
    return Response.json(await dashboardData(seller.id), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
