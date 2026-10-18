import { checkoutCart } from "@/server/cart";
import { cartBody, cartRoute } from "@/server/cart-http";

export const dynamic = "force-dynamic";

// PayPal Cart API v1 (D-097): the buyer approved in PayPal; authorize the order (charged when the seller ships, D-098).
export async function POST(req: Request, ctx: RouteContext<"/api/paypal/v1/stores/[handle]/merchant-cart/[cartId]/checkout">) {
  const { handle, cartId } = await ctx.params;
  return cartRoute(req, handle, async (store, client) => ({ status: 200, body: await checkoutCart(store, client, cartId, await cartBody(req)) }));
}
