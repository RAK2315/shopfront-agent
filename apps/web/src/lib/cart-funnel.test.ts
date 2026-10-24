import { describe, expect, it } from "vitest";
import { cartFunnel, type FunnelCart } from "./cart-funnel";

const cart = (id: string, validation: string, status: string, order = "", issue = "", agent = "a"): FunnelCart => ({ cart: id, agent, status, validation, issue, order });

describe("cartFunnel", () => {
  it("counts each stage as a subset of the one before, and captured only via a captured order", () => {
    const carts = [
      cart("1", "INVALID", "INCOMPLETE", "", "ITEM_OUT_OF_STOCK"),
      cart("2", "REQUIRES_ADDITIONAL_INFORMATION", "INCOMPLETE", "", "MISSING_SHIPPING_ADDRESS", "b"),
      cart("3", "VALID", "CREATED", "chk3"),
      cart("4", "VALID", "READY", "chk4"),
      cart("5", "VALID", "COMPLETED", "chk5"),
      cart("6", "VALID", "COMPLETED", "chk6"),
      cart("7", "INVALID", "INCOMPLETE", "", "ITEM_OUT_OF_STOCK"),
    ];
    const f = cartFunnel(carts, [{ order: "chk5", captured_usd: 37 }, { order: "chk6", captured_usd: 0 }, { order: "chk9", captured_usd: 10 }]);
    expect(f.stages.map((s) => s.n)).toEqual([7, 4, 3, 2, 1]);
    expect(f.issues).toEqual([["ITEM_OUT_OF_STOCK", 2], ["MISSING_SHIPPING_ADDRESS", 1]]);
    expect(f.agents).toBe(2);
  });
  it("handles no carts", () => {
    expect(cartFunnel([], []).stages.every((s) => s.n === 0)).toBe(true);
  });
});
