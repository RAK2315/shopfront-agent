import { z } from "zod";
import { ask } from "@/server/dashboard-ask";
import { errorResponse } from "@/server/http";
import { clientKeyOf, withTestHooks } from "@/server/llm";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ text: z.string().trim().min(2).max(400) });

// The Ask bar (D-089): returns a view description or code-written figures. Read-only by construction.
export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Ask in 2 to 400 characters." } }, { status: 400 });
    return Response.json(await withTestHooks(req, () => ask(seller.id, parsed.data.text, clientKeyOf(req))));
  } catch (e) {
    return errorResponse(e);
  }
}
