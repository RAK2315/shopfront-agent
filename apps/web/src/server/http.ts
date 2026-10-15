import "server-only";
import { isShopError } from "@shopfront/core";
import { LlmUnavailableError } from "@shopfront/llm";
import { ImageRejected } from "./images";
import { SellerAuthError } from "./seller-session";

const STATUS: Record<string, number> = { VALIDATION_ERROR: 400, NOT_FOUND: 404, FORBIDDEN: 403, RATE_LIMITED: 429, UPSTREAM_ERROR: 502 };

/** Route-handler errors → `{ error: { code, message } }` with a fitting status. Unknown errors are logged, not leaked. */
export function errorResponse(e: unknown): Response {
  if (e instanceof SellerAuthError) return Response.json({ error: { code: "UNAUTHENTICATED", message: e.message } }, { status: 401 });
  if (e instanceof ImageRejected) return Response.json({ error: { code: "BAD_IMAGE", message: e.message } }, { status: 422 });
  if (e instanceof LlmUnavailableError)
    return Response.json({ error: { code: "AI_UNAVAILABLE", message: "The AI couldn't read this photo right now. Enter the details yourself." } }, { status: 503 });
  if (isShopError(e)) return Response.json({ error: { code: e.code, message: e.message } }, { status: STATUS[e.code] ?? 400 });
  console.error(e);
  return Response.json({ error: { code: "ERROR", message: "Something went wrong." } }, { status: 500 });
}
