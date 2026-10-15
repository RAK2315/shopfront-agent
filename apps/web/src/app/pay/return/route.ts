import { redirect } from "next/navigation";
import { captureCheckout } from "@/server/payments";
import { orderTokenFor } from "@/server/tokens";

export const dynamic = "force-dynamic";

// Redirect-flow return (agents that hand out PayPal's raw approve link, or v6 redirect mode).
export async function GET(req: Request) {
  const checkout = new URL(req.url).searchParams.get("checkout");
  if (!checkout || !/^chk_[a-z0-9]{12}$/.test(checkout)) return new Response("Unknown checkout", { status: 400 });
  await captureCheckout(checkout, "return_url");
  redirect(`/pay/${checkout}?t=${orderTokenFor(checkout)}`);
}
