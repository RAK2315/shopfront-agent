import { describe, expect, it } from "vitest";
import { approvalPageUrl, fallbackMode, FIRST_MODE } from "./paypal-presentation";

describe("PayPal presentation (D-086)", () => {
  it("opens an explicit popup, never v6 'auto' (which sometimes opened nothing)", () => {
    expect(FIRST_MODE).toBe("popup");
  });
  it("falls back to PayPal's page only when the popup was blocked", () => {
    expect(fallbackMode({ code: "ERR_DEV_UNABLE_TO_OPEN_POPUP" })).toBe("redirect");
    expect(fallbackMode(new Error("Popup blocked by the browser"))).toBe("redirect");
    expect(fallbackMode({ code: "INSTRUMENT_DECLINED" })).toBeNull();
    expect(fallbackMode(undefined)).toBeNull();
  });
  it("builds PayPal's approval page for a real order id only", () => {
    expect(approvalPageUrl("1XH1759827693053F", true)).toBe("https://www.sandbox.paypal.com/checkoutnow?token=1XH1759827693053F");
    expect(approvalPageUrl("1XH1759827693053F", false)).toBe("https://www.paypal.com/checkoutnow?token=1XH1759827693053F");
    expect(() => approvalPageUrl("x\"><script>", true)).toThrow();
  });
});
