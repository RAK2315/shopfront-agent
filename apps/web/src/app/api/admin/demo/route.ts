import { z } from "zod";
import { eq, schema } from "@shopfront/db";
import { freezeDemoCatalog, isAdmin, resetDemo } from "@/server/demo";
import { runHandoffCheck } from "@/server/handoff";
import { setPayoutAccount } from "@/server/payouts";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("reset") }),
  z.strictObject({ action: z.literal("freeze") }),
  // Phase 9 (D-083): connect a seller that can't sign in to the demo studio (fern_and_loom → seller 2 for AT-9).
  z.strictObject({ action: z.literal("set_payout"), handle: z.string().regex(/^[a-z0-9_]{2,40}$/), account: z.string().max(254) }),
  // Run the refund-handoff GET fallback now (AT-9: the path used when the webhook never arrives).
  z.strictObject({ action: z.literal("handoff_check"), refund_request_id: z.string().regex(/^rfr_[a-z0-9]{12}$/) }),
]);

// Judge mode (D-011): nightly reset (cron-job.org calls this with the bearer token) or freeze the current catalog.
// Owner-only operations for the acceptance tests ride on the same admin token.
export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: { code: "FORBIDDEN", message: "Admin token required." } }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "bad action" } }, { status: 400 });
  try {
    const b = parsed.data;
    if (b.action === "reset") return Response.json(await resetDemo());
    if (b.action === "freeze") return Response.json(await freezeDemoCatalog());
    if (b.action === "handoff_check") return Response.json(await runHandoffCheck(b.refund_request_id));
    const [s] = await services().db.select({ id: schema.sellers.id }).from(schema.sellers).where(eq(schema.sellers.handle, b.handle));
    if (!s) return Response.json({ error: { code: "NOT_FOUND", message: "No such seller." } }, { status: 404 });
    return Response.json(await setPayoutAccount(s.id, b.account));
  } catch (e) {
    return Response.json({ error: { code: "ERROR", message: e instanceof Error ? e.message : "failed" } }, { status: 500 });
  }
}
