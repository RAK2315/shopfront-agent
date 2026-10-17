import { describe, expect, it } from "vitest";
import { hackReason } from "./hack-reason";

// Messages as the deployed MCP server returns them (captured from /api/shop/hack on 2026-10-17).
const PREFIX = "MCP error -32602: Input validation error: Invalid arguments for tool create_checkout: ";

describe("hack-demo rejection wording (REVIEW-1 #7)", () => {
  it("names the unknown money field", () => {
    expect(hackReason(`${PREFIX}Unrecognized key: "price" at items[0]`)).toEqual({ text: "unknown field", fields: ["price"] });
    expect(hackReason(`${PREFIX}Unrecognized keys: "total", "discount_percent"`)).toEqual({ text: "unknown fields", fields: ["total", "discount_percent"] });
  });

  it("names the bound a quantity broke", () => {
    expect(hackReason(`${PREFIX}Too small: expected number to be >=1 at items[0].quantity`)).toEqual({ text: "must be at least 1", fields: ["quantity"] });
  });

  it("falls back to a generic reason, never an invented one", () => {
    expect(hackReason("CONFLICT: something else")).toEqual({ text: "rejected by the server's schema", fields: [] });
  });
});
