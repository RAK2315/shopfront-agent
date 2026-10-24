import { describe, expect, it } from "vitest";
import { ATTEMPT_FIELDS, CART_FIELDS, LINE_FIELDS, LISTING_FIELDS, ORDER_FIELDS, REFUND_FIELDS, USD_FORMAT } from "./sources";

const all = [...ORDER_FIELDS, ...LINE_FIELDS, ...REFUND_FIELDS, ...ATTEMPT_FIELDS, ...LISTING_FIELDS, ...CART_FIELDS];

describe("Studio report money fields", () => {
  it("uses Studio's format string for dollars with two decimals", () => {
    expect(USD_FORMAT).toBe("$#,##0.00");
  });
  it("formats every *_usd field as currency with that string (a serialisable string, not an Intl object)", () => {
    const money = all.filter((f) => f.id.endsWith("_usd"));
    expect(money.length).toBeGreaterThanOrEqual(7);
    for (const f of money) {
      expect(f, f.id).toMatchObject({ format: "currencyFormat", formatOptions: { format: USD_FORMAT } });
    }
  });
  it("has no currency field outside the *_usd names", () => {
    const currency = all.filter((f) => f.format === "currencyFormat").map((f) => f.id);
    expect(currency.every((id) => id.endsWith("_usd"))).toBe(true);
  });
});
