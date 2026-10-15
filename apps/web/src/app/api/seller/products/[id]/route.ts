import { discardDraft } from "@/server/catalog";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Discard a draft (archived, never deleted: its photo and AI extraction stay cached).
export async function DELETE(_req: Request, ctx: RouteContext<"/api/seller/products/[id]">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    await discardDraft(seller, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
