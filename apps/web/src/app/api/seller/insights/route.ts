import { z } from "zod";
import { dbSalesSummary, paypalTransactions } from "@/server/dashboard";
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
]);

export async function POST(req: Request) {
  try {
    const seller = await requireSeller();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Bad request." } }, { status: 400 });
    const { tool, args } = parsed.data;
    const span = new Date(args.to).getTime() - new Date(args.from).getTime();
    if (span <= 0 || span > 31 * 86_400_000) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Use a range of up to 31 days." } }, { status: 400 });
    const result = tool === "db_sales_summary" ? await dbSalesSummary(seller.id, args.from, args.to) : await paypalTransactions(args.from, args.to);
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
