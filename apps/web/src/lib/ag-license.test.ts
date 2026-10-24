import { describe, expect, it } from "vitest";
import { gridEdition, licenseSimulation, studioLicense } from "./ag-license";

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

describe("studioLicense (D-100 graceful expiry)", () => {
  const trial = { valid: true, isTrial: true, trialExpired: false, expiry: "29 November 2026" };
  it("mounts Studio for a valid, unexpired key, through its expiry day", () => {
    expect(studioLicense("k", trial, new Date("2026-10-24"))).toEqual({ ok: true, trial: true, expiry: "29 November 2026" });
    expect(studioLicense("k", trial, new Date("2026-11-29T20:00:00")).ok).toBe(true);
  });
  it("does not mount Studio without a key, with an invalid key, or after expiry", () => {
    expect(studioLicense(undefined, null)).toEqual({ ok: false, reason: "no-key" });
    expect(studioLicense("", trial)).toEqual({ ok: false, reason: "no-key" });
    expect(studioLicense("k", { valid: false, missing: true })).toEqual({ ok: false, reason: "no-key" });
    expect(studioLicense("k", { valid: false, incorrectLicenseType: true })).toEqual({ ok: false, reason: "invalid" });
    expect(studioLicense("k", { ...trial, trialExpired: true })).toEqual({ ok: false, reason: "expired" });
    expect(studioLicense("k", { ...trial, expired: true })).toEqual({ ok: false, reason: "expired" });
    expect(studioLicense("k", trial, new Date("2026-12-01"))).toEqual({ ok: false, reason: "expired" });
  });
  it("accepts only the two simulation values", () => {
    expect(licenseSimulation("expired")).toBe("expired");
    expect(licenseSimulation("missing")).toBe("missing");
    expect(licenseSimulation("valid")).toBeNull();
    expect(licenseSimulation(["expired"])).toBeNull();
    expect(licenseSimulation(undefined)).toBeNull();
  });
});
