import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DEMO_TOKEN_STORES } from "@/server/cart";
import { issueCartToken } from "@/server/cart-auth";
import { appUrl } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ store: z.enum(DEMO_TOKEN_STORES) });

// A one-hour Cart API token for a demo shop, so anyone (judges) can try the contract with curl or their own agent
// (D-097). Real stores issue theirs from the Studio; PayPal supplies them after Store Sync onboarding.
export async function POST(req: Request) {
  const limited = rateLimit(req, "cart_token");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ name: "INVALID_REQUEST", message: `store must be one of ${DEMO_TOKEN_STORES.join(", ")}` }, { status: 400 });
  const t = issueCartToken(parsed.data.store, `demo-${randomBytes(3).toString("hex")}`, 3600);
  return Response.json({ ...t, base_url: appUrl(`/api/paypal/v1/stores/${parsed.data.store}`) }, { headers: { "cache-control": "no-store" } });
}
