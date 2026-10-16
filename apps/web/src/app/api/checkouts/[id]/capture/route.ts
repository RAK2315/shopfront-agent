import { z } from "zod";
import { recordEvent } from "@/server/events";
import { captureCheckout } from "@/server/payments";
import { services } from "@/server/services";
import { verifyOrderToken } from "@/server/tokens";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ t: z.string().min(20).max(100) });

// Called by the /pay page's onApprove. The amount is never sent from the browser — we capture the server-made order.
export async function POST(req: Request, ctx: RouteContext<"/api/checkouts/[id]/capture">) {
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !(await verifyOrderToken(id, parsed.data.t))) return Response.json({ ok: false, message: "Forbidden" }, { status: 403 });
  await recordEvent(services().db, {
    actor: "server",
    kind: "buyer_approved",
    checkoutId: id,
    summary: "Buyer approved in the PayPal popup · capturing on the server",
  });
  const outcome = await captureCheckout(id, "pay_page");
  return Response.json(outcome, { status: outcome.ok ? 200 : outcome.reason === "declined" ? 422 : 409 });
}
