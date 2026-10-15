import { editLedger, LedgerEdit } from "@/server/dashboard";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Inline ledger edits: seller-only note and ship-by date. Strict schema: no other field can be written here.
export async function PATCH(req: Request, ctx: RouteContext<"/api/seller/orders/[id]/ledger">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    const parsed = LedgerEdit.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Only the note and ship-by date can be edited." } }, { status: 400 });
    await editLedger(seller.id, id, parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
