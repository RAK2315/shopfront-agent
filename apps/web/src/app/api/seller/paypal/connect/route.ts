import { appUrl } from "@/server/env";
import { connectUrl } from "@/server/paypal-connect";
import { currentSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// "Connect with PayPal" on the Get paid card (D-084): off to PayPal's own sign-in and consent page.
export async function GET() {
  const seller = await currentSeller();
  if (!seller) return Response.redirect(appUrl("/studio"), 303);
  return new Response(null, { status: 303, headers: { location: connectUrl(seller.id), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
