import { describe, expect, it } from "vitest";
import { gridEdition } from "./ag-license";

const ok = { valid: true, expired: false, incorrectLicenseType: false, suppliedLicenseType: "BOTH", expiry: "29 Nov 2026" };

describe("gridEdition (D-080 no-watermark guard)", () => {
  it("turns Enterprise on only for a valid, unexpired BOTH key", () => {
    expect(gridEdition("k", ok, new Date("2026-10-18"))).toEqual({ enterprise: true, reason: "licensed", expiry: "29 Nov 2026" });
  });
  it("falls back to Community without a key, with an invalid key, or a grid-only/charts-only key", () => {
    expect(gridEdition(undefined, null).enterprise).toBe(false);
    expect(gridEdition("k", { valid: false, missing: true })).toEqual({ enterprise: false, reason: "no-key" });
    expect(gridEdition("k", { valid: false })).toEqual({ enterprise: false, reason: "invalid" });
    expect(gridEdition("k", { ...ok, suppliedLicenseType: "GRID" })).toEqual({ enterprise: false, reason: "wrong-type" });
    expect(gridEdition("k", { valid: false, incorrectLicenseType: true, suppliedLicenseType: "CHARTS" })).toEqual({ enterprise: false, reason: "wrong-type" });
  });
  it("falls back once the key or trial has expired (also checked against the expiry date itself)", () => {
    expect(gridEdition("k", { ...ok, expired: true }).enterprise).toBe(false);
    expect(gridEdition("k", { ...ok, trialExpired: true }).enterprise).toBe(false);
    expect(gridEdition("k", ok, new Date("2026-12-01"))).toEqual({ enterprise: false, reason: "expired" });
  });
});
