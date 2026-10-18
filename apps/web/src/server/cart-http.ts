import "server-only";
import { ShopError } from "@shopfront/core";
import { isPayPalApiError } from "@shopfront/paypal";
import { CartHttpError, storeByHandle } from "./cart";
import { verifyCartToken } from "./cart-auth";
import { recordEvent } from "./events";
import { rateLimit } from "./rate-limit";
import { services } from "./services";

type Store = NonNullable<Awaited<ReturnType<typeof storeByHandle>>>;

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Every Cart API v1 request (D-097): rate limit → the store in the URL → the store-bound JWT → the handler. Errors use
 * the spec's `Error` / `BusinessError` shapes. A refused token is logged on the store's timeline as blocked.
 */
export async function cartRoute(req: Request, handle: string, fn: (store: Store, client: string) => Promise<{ status: number; body: unknown }>): Promise<Response> {
  const limited = rateLimit(req, "cart_api");
  if (limited) return json(429, { name: "RATE_LIMIT_REACHED", message: "Too many Cart API requests. Retry after a minute." });
  const store = /^[a-z0-9_]{2,40}$/.test(handle) ? await storeByHandle(handle) : null;
  if (!store) return json(404, { name: "RESOURCE_NOT_FOUND", message: "No such store." });
  const auth = verifyCartToken(req.headers.get("authorization"), store.handle);
  if (!auth.ok) {
    await recordEvent(services().db, {
      actor: "cart_api",
      kind: "cart_rejected",
      sellerId: store.id,
      summary: `Cart API · ${auth.status} ${auth.name} · ${auth.message}`,
      data: { method: req.method, path: new URL(req.url).pathname.replace(/^.*\/merchant-cart/, "/merchant-cart") },
    }).catch(() => {});
    return json(auth.status, { name: auth.name, message: auth.message });
  }
  try {
    const out = await fn(store, auth.client);
    return json(out.status, out.body);
  } catch (e) {
    if (e instanceof CartHttpError) return json(e.status, e.body);
    if (e instanceof ShopError) return json(e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 422, { name: e.code, message: e.message, ...(e.details?.debug_id ? { debug_id: String(e.details.debug_id) } : {}) });
    const debugId = isPayPalApiError(e) ? e.debugId : undefined;
    console.error("[cart api]", e instanceof Error ? e.message : e);
    return json(500, { name: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Nothing was charged.", ...(debugId ? { debug_id: debugId } : {}) });
  }
}

/** The JSON body, or a spec-shaped 400. */
export async function cartBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 64_000) throw new CartHttpError(400, { name: "INVALID_REQUEST", message: "The body is too large." });
  try {
    return JSON.parse(text);
  } catch {
    throw new CartHttpError(400, { name: "INVALID_REQUEST", message: "The body is not valid JSON." });
  }
}
