import { z } from "zod";
import { isAdmin } from "@/server/demo";
import { errorResponse } from "@/server/http";
import { setPayoutAccount } from "@/server/payouts";
import { DEMO_SELLER_HANDLES, requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ account: z.string().max(254) });

// Phase 9 (D-083): the seller connects their own PayPal (email or merchant id); the first payment verifies it.
// Any visitor can sign in as the public demo seller (D-011), so changing where its money goes needs the owner's token.
export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    if ((DEMO_SELLER_HANDLES as readonly string[]).includes(seller.handle) && !isAdmin(req)) {
      return Response.json({ ok: false, message: "The demo shop's payout account can only be changed by its owner." }, { status: 403 });
    }
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ ok: false, message: "Send { account }." }, { status: 400 });
    return Response.json({ ok: true, ...(await setPayoutAccount(seller.id, parsed.data.account)) });
  } catch (e) {
    return errorResponse(e);
  }
}
