import { isAdmin } from "@/server/demo";
import { errorResponse } from "@/server/http";
import { DEMO_SELLER_HANDLES, requireSeller } from "@/server/seller-session";
import { createLinkCode } from "@/server/telegram";

export const dynamic = "force-dynamic";

// A one-time Telegram link code for the signed-in seller (PLAN Phase 10 "Linking"; the Studio card comes later).
// Any visitor can sign in as the public demo seller (judge mode, D-011), so linking a chat to that real shop also
// needs the owner's admin token; judges link to the isolated judge_demo seller with t.me/<bot>?start=judge instead.
export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    if ((DEMO_SELLER_HANDLES as readonly string[]).includes(seller.handle) && !isAdmin(req)) {
      return Response.json({ ok: false, message: "Judges: use the judge-mode link in the README. Linking this demo shop's chat is owner-only." }, { status: 403 });
    }
    const link = await createLinkCode(seller.id);
    return Response.json({ ok: true, deepLink: link.deepLink, code: link.code, expiresAt: link.expiresAt.toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
