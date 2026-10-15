import { z } from "zod";
import { freezeDemoCatalog, isAdmin, resetDemo } from "@/server/demo";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ action: z.enum(["reset", "freeze"]) });

// Judge mode (D-011): nightly reset (cron-job.org calls this with the bearer token) or freeze the current catalog.
export async function POST(req: Request) {
  if (!isAdmin(req)) return Response.json({ error: { code: "FORBIDDEN", message: "Admin token required." } }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "action must be reset or freeze" } }, { status: 400 });
  try {
    return Response.json(parsed.data.action === "reset" ? await resetDemo() : await freezeDemoCatalog());
  } catch (e) {
    return Response.json({ error: { code: "ERROR", message: e instanceof Error ? e.message : "failed" } }, { status: 500 });
  }
}
