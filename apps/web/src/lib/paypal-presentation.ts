// How the PayPal approval opens (D-086). Never "auto": on Render, v6's auto mode resolved start() without opening any
// window in about 1 of 5 fresh pay pages, and the same session then stayed dead, so the buyer could not pay (the
// owner's walkthrough order). Explicit "popup" opened every time; a blocked popup falls back to PayPal's own page
// (redirect), which returns through /pay/return and is captured server-side.

export type PresentationMode = "popup" | "redirect";

export const FIRST_MODE: PresentationMode = "popup";

/** A start() failure that a full-page redirect can get around (a blocked popup); anything else is shown as an error. */
export function fallbackMode(e: unknown): PresentationMode | null {
  const code = String((e as { code?: unknown } | null)?.code ?? "");
  const message = String((e as { message?: unknown } | null)?.message ?? "");
  return /popup|blocked/i.test(`${code} ${message}`) ? "redirect" : null;
}

/** PayPal's own approval page for an order: the escape hatch when no window appears. Host follows the client SDK. */
export function approvalPageUrl(orderId: string, sandbox: boolean): string {
  if (!/^[A-Z0-9]{10,30}$/.test(orderId)) throw new Error("Not a PayPal order id");
  return `https://www.${sandbox ? "sandbox." : ""}paypal.com/checkoutnow?token=${orderId}`;
}
