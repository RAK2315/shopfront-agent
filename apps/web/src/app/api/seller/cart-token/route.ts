import { z } from "zod";
import { issueCartToken } from "@/server/cart-auth";
import { appUrl } from "@/server/env";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ client: z.string().trim().min(2).max(60).regex(/^[\w .:@-]+$/) });

// A seller issues a 30-day Cart API token for an agent they trust, bound to their store (D-097).
export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Name the agent (2-60 letters, digits, spaces or . : @ -)." } }, { status: 400 });
    const t = issueCartToken(seller.handle, parsed.data.client, 30 * 24 * 3600);
    return Response.json({ ...t, base_url: appUrl(`/api/paypal/v1/stores/${seller.handle}`) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
