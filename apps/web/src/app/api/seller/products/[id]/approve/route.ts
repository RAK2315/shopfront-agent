import { ApproveInput, approveProduct } from "@/server/catalog";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Publish a listing. The API itself requires a seller-confirmed price for every variant (AT-3), not just the UI.
export async function POST(req: Request, ctx: RouteContext<"/api/seller/products/[id]/approve">) {
  try {
    const seller = await requireSeller();
    const { id } = await ctx.params;
    if (!/^prd_[a-z0-9]{12}$/.test(id)) return Response.json({ error: { code: "NOT_FOUND", message: "Product not found." } }, { status: 404 });
    const parsed = ApproveInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Confirm the price for every variant before publishing.", issues: parsed.error.issues.map((i) => i.path.join(".")) } },
        { status: 400 },
      );
    return Response.json(await approveProduct(seller, id, parsed.data));
  } catch (e) {
    return errorResponse(e);
  }
}
