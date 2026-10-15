import { z } from "zod";
import { startSellerSession } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ handle: z.string().regex(/^[a-z0-9_]{3,30}$/) });

// Sign in as the shared demo seller (judge mode, D-011).
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Unknown seller." } }, { status: 400 });
  const s = await startSellerSession(parsed.data.handle);
  if (!s) return Response.json({ error: { code: "FORBIDDEN", message: "That seller is not open for demo sign-in." } }, { status: 403 });
  return Response.json({ seller: { handle: s.handle, displayName: s.displayName } });
}
