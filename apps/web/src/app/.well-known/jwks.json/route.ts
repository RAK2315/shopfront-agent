import { jwks } from "@/server/cart-auth";

export const dynamic = "force-dynamic";

// The public key that verifies Shopfront's store-bound Cart API tokens (D-097). EdDSA (Ed25519).
export function GET() {
  return Response.json(jwks(), { headers: { "cache-control": "public, max-age=300" } });
}
