import { eq, schema } from "@shopfront/db";
import { captureCheckout } from "@/server/payments";
import { services } from "@/server/services";
import { verifyOrderToken } from "@/server/tokens";

export const dynamic = "force-dynamic";

// Redirect-flow return (agents that hand out PayPal's raw approve link, or v6 redirect mode). PayPal appends
// `token` (its order id). We require BOTH the order token that only the checkout's creator holds (it is in the
// return URL we gave PayPal) and PayPal's `token` matching this checkout's order. This route never issues a token
// (REVIEW-1 #2): a checkout id alone, or with its public PayPal order id, gets nothing.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const checkout = sp.get("checkout") ?? "";
  const t = sp.get("t");
  const paypalToken = sp.get("token");
  if (!/^chk_[a-z0-9]{12}$/.test(checkout) || !(await verifyOrderToken(checkout, t))) return bad();
  const [c] = await services().db.select({ orderId: schema.checkouts.paypalOrderId }).from(schema.checkouts).where(eq(schema.checkouts.id, checkout));
  if (!c?.orderId || paypalToken !== c.orderId) return bad();
  await captureCheckout(checkout, "return_url"); // idempotent: a replayed return URL finds the order already captured
  return new Response(null, { status: 303, headers: { location: `/pay/${checkout}?t=${encodeURIComponent(t!)}`, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}

/** Same page as a bad pay link: it never says which check failed. */
function bad() {
  return new Response(null, { status: 303, headers: { location: "/pay/link-invalid", "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
