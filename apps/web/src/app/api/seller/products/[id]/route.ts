import { discardDraft, editListing, ListingEdit } from "@/server/catalog";
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

// Inline edit from the dashboard's listings grid (D-089): description/category mirror to PayPal's catalog; price and
// stock stay in our catalog for the next checkout.
export async function PATCH(req: Request, ctx: RouteContext<"/api/seller/products/[id]">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    const parsed = ListingEdit.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Bad edit." } }, { status: 400 });
    return Response.json(await editListing(seller, id, parsed.data));
  } catch (e) {
    return errorResponse(e);
  }
}
