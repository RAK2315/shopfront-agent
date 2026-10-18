import { z } from "zod";
import { agentActivity, dbSalesSummary, ordersNeedingAction, paypalTransactions, stockLevels } from "@/server/dashboard";
import { reconciliationFor } from "@/server/ledger";
import { errorResponse } from "@/server/http";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Read-only tools for the Shopfront insights agent in AG Studio (D-007). Each answer carries its source.
// Models send dates or datetimes; a bare date means the whole day (UTC).
const when = (end: boolean) =>
  z
    .string()
    .max(40)
    .transform((v, ctx) => {
      const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${end ? "23:59:59" : "00:00:00"}Z` : v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: `Not a date: ${v}` });
        return z.NEVER;
      }
      // Transaction Search rejects milliseconds and future end dates.
      const clamped = end && d.getTime() > Date.now() ? new Date() : d;
      return clamped.toISOString().replace(/\.\d{3}Z$/, "Z");
    });
const Range = z.strictObject({ from: when(false), to: when(true) });
const Body = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("db_sales_summary"), args: Range }),
  z.object({ tool: z.literal("paypal_transactions"), args: Range }),
  // Phase AG: the Shop Manager agent's other read-only tools (D-097).
  z.object({ tool: z.literal("agent_activity"), args: Range }),
  z.object({ tool: z.literal("orders_needing_action"), args: z.strictObject({}).optional() }),
  z.object({ tool: z.literal("stock_levels"), args: z.strictObject({}).optional() }),
  z.object({ tool: z.literal("reconciliation_status"), args: z.strictObject({}).optional() }),
]);

export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Bad request." } }, { status: 400 });
    const b = parsed.data;
    if (b.tool === "orders_needing_action") return Response.json(await ordersNeedingAction(seller.id));
    if (b.tool === "stock_levels") return Response.json(await stockLevels(seller.id));
    if (b.tool === "reconciliation_status") {
      const r = await reconciliationFor(seller);
      return Response.json({
        summary_line: `[paypal] ${r.state === "ok" ? `Reconciled with PayPal: ${r.matched} payment${r.matched === 1 ? "" : "s"} match` : r.state === "mismatch" ? `${r.mismatches.length} mismatch${r.mismatches.length === 1 ? "" : "es"} with PayPal` : "PayPal check pending"}${r.checkedAt ? `, checked ${r.checkedAt.slice(0, 16).replace("T", " ")} UTC` : ""}.`,
        mismatches: r.mismatches.map((m) => ({ label: m.label, order: m.checkoutId, capture: m.captureId, detail: m.detail })),
      });
    }
    const { tool, args } = b;
    const span = new Date(args.to).getTime() - new Date(args.from).getTime();
    if (span <= 0 || span > 31 * 86_400_000) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Use a range of up to 31 days." } }, { status: 400 });
    const result = tool === "db_sales_summary" ? await dbSalesSummary(seller.id, args.from, args.to) : tool === "agent_activity" ? await agentActivity(seller.id, args.from, args.to) : await paypalTransactions(args.from, args.to);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
