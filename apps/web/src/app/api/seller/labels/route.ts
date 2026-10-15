import { z } from "zod";
import { errorResponse } from "@/server/http";
import { clientKeyOf } from "@/server/llm";
import { requireSeller } from "@/server/seller-session";
import { readLabel } from "@/server/tracking";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ sha256: z.string().regex(/^[a-f0-9]{64}$/) });

// Read an uploaded shipping-label photo. Returns a suggestion only; the seller confirms before PayPal sees it.
export async function POST(req: Request) {
  try {
    await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Unknown photo." } }, { status: 400 });
    return Response.json({ reading: await readLabel(parsed.data.sha256, clientKeyOf(req)) });
  } catch (e) {
    return errorResponse(e);
  }
}
