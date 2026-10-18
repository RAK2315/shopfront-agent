import { getCart, updateCart } from "@/server/cart";
import { cartBody, cartRoute } from "@/server/cart-http";

export const dynamic = "force-dynamic";

type Ctx = RouteContext<"/api/paypal/v1/stores/[handle]/merchant-cart/[cartId]">;

// PayPal Cart API v1 (D-097): GET the cart's current state; PUT replaces it whole (the spec's rule).
export async function GET(req: Request, ctx: Ctx) {
  const { handle, cartId } = await ctx.params;
  return cartRoute(req, handle, async (store, client) => ({ status: 200, body: await getCart(store, client, cartId) }));
}

export async function PUT(req: Request, ctx: Ctx) {
  const { handle, cartId } = await ctx.params;
  return cartRoute(req, handle, async (store, client) => ({ status: 200, body: await updateCart(store, client, cartId, await cartBody(req)) }));
}
