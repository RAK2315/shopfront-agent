import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Signed fault hooks for the recovery ATs (REVIEW-1 #8), like the LLM failover hook (D-054). A fault is enabled
// only by `x-shopfront-fault: <name>` plus `x-shopfront-fault-sig: HMAC(SESSION_SECRET, "fault:<name>")`, so nobody
// else can trigger one.
//   verify-unavailable  the webhook's signature check acts as if PayPal's verify endpoint were down (no PayPal call)
//   capture-declined    the capture call carries PayPal's own sandbox negative-testing header, so the real sandbox
//                       answers INSTRUMENT_DECLINED (developer.paypal.com/tools/sandbox/negative-testing)
export type Fault = "verify-unavailable" | "capture-declined";

export function faultSignature(name: Fault) {
  return createHmac("sha256", env().SESSION_SECRET).update(`fault:${name}`).digest("base64url");
}

export function hasFault(req: Request, name: Fault): boolean {
  if (req.headers.get("x-shopfront-fault") !== name) return false;
  const sig = req.headers.get("x-shopfront-fault-sig") ?? "";
  const a = Buffer.from(faultSignature(name));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
