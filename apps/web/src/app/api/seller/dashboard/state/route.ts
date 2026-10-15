import { saveDashboardState } from "@/server/dashboard";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// The seller's dashboard layout (AG Studio report state). Views only: no order or money data lives here.
export async function PUT(req: Request) {
  try {
    const seller = await requireSeller();
    const body = (await req.json().catch(() => null)) as { state?: unknown } | null;
    if (!body?.state || typeof body.state !== "object") return Response.json({ error: { code: "VALIDATION_ERROR", message: "No layout." } }, { status: 400 });
    await saveDashboardState(seller.id, body.state);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE() {
  try {
    const seller = await requireSeller();
    await saveDashboardState(seller.id, null);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
