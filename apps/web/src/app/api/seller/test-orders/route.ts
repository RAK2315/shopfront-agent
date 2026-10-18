import { z } from "zod";
import { TEST_ORDERS_COOKIE, testOrdersSwitch } from "@/server/run-context";
import { currentSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ include: z.boolean() });

// The demo seller's "Include test orders" switch (D-087). A preference cookie only: it changes what this browser's
// Studio shows, never any data, and it does nothing for a seller without the switch.
export async function POST(req: Request) {
  const seller = await currentSeller();
  if (!seller) return Response.json({ error: { code: "UNAUTHORIZED", message: "Sign in first." } }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Send { include: boolean }." } }, { status: 400 });
  if (!(await testOrdersSwitch(seller.id)).available) return Response.json({ error: { code: "NOT_AVAILABLE", message: "This shop has no test orders switch." } }, { status: 409 });
  const res = Response.json({ include: parsed.data.include });
  res.headers.append("set-cookie", `${TEST_ORDERS_COOKIE}=${parsed.data.include ? "1" : "0"}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return res;
}
