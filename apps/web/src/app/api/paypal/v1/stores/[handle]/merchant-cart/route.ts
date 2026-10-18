import { createCart } from "@/server/cart";
import { cartBody, cartRoute } from "@/server/cart-http";

export const dynamic = "force-dynamic";

// PayPal Cart API v1 (D-097): POST /merchant-cart for this store. 201 with a payment token when valid; 200 with
// validation_issues otherwise.
export async function POST(req: Request, ctx: RouteContext<"/api/paypal/v1/stores/[handle]/merchant-cart">) {
  const { handle } = await ctx.params;
  return cartRoute(req, handle, async (store, client) => {
    const r = await createCart(store, client, await cartBody(req));
    return { status: r.status, body: r.cart };
  });
}
