"use client";

import { AgStudioLicenseManager } from "ag-studio";
import { studioLicense, type LicenseSimulation, type StudioLicense, type StudioLicenseDetails } from "@/lib/ag-license";

const DAY = 86_400_000;

/**
 * Runs AG Studio's own licence validator before Studio mounts (D-100). The details are read, never logged (they
 * echo the key). `sim` (`?aglicense=`) feeds the same guard an empty key or a clock past the expiry.
 */
export function checkStudioLicense(sim: LicenseSimulation): StudioLicense {
  const key = sim === "missing" ? undefined : process.env.NEXT_PUBLIC_AG_LICENSE_KEY || undefined;
  let details: StudioLicenseDetails | null = null;
  if (key) {
    try {
      const d = AgStudioLicenseManager.getLicenseDetails(key, new Set(["PRO-AI"])) as unknown as StudioLicenseDetails;
      details = { valid: d.valid, missing: d.missing, expired: d.expired, trialExpired: d.trialExpired, incorrectLicenseType: d.incorrectLicenseType, isTrial: d.isTrial, expiry: d.expiry };
    } catch {
      details = { valid: false };
    }
  }
  const expiry = details?.expiry ? Date.parse(details.expiry) : NaN;
  const now = sim === "expired" ? new Date((Number.isFinite(expiry) ? expiry : Date.now()) + 2 * DAY) : new Date();
  const verdict = studioLicense(key, details, now);
  if (verdict.ok) AgStudioLicenseManager.setLicenseKey(key!);
  return verdict;
}
