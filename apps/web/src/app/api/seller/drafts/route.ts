import { z } from "zod";
import { draftFromPhoto, manualDraft } from "@/server/catalog";
import { errorResponse } from "@/server/http";
import { clientKeyOf } from "@/server/llm";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ sha256: z.string().regex(/^[a-f0-9]{64}$/), manual: z.boolean().optional() });

// One uploaded photo → one draft listing (vision model, cached by image hash), or a blank draft to fill by hand.
export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Unknown photo." } }, { status: 400 });
    const draft = parsed.data.manual ? await manualDraft(seller, parsed.data.sha256) : await draftFromPhoto(seller, parsed.data.sha256, clientKeyOf(req));
    return Response.json({ draft });
  } catch (e) {
    return errorResponse(e);
  }
}
