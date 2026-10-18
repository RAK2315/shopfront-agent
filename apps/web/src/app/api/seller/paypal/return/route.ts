import { ShopError } from "@shopfront/core";
import { completeConnect } from "@/server/paypal-connect";

export const dynamic = "force-dynamic";

// Log in with PayPal returns here (the Return URL set in the Developer Dashboard, D-084). The state is signed, short
// lived and single use; the code is exchanged server-side. The seller lands back on the Studio with the result.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const go = (q: string) => new Response(null, { status: 303, headers: { location: `/studio?paypal=${q}`, "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  if (sp.get("error")) return go("cancelled");
  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) return go("invalid");
  try {
    const r = await completeConnect(code, state);
    return go(r.kind === "verified" ? "connected" : "checked");
  } catch (e) {
    console.error("paypal connect failed", e instanceof Error ? e.message : e);
    return go(e instanceof ShopError && e.code === "FORBIDDEN" ? "expired" : "failed");
  }
}
