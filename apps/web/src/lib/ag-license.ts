// The no-watermark guard (D-080, walkthrough #3). AG Grid Enterprise features (master-detail, row grouping, pivot,
// set filters, grid sparklines, integrated charts) switch on only when NEXT_PUBLIC_AG_GRID_LICENSE_KEY is a valid,
// unexpired AG Grid + AG Charts Enterprise ("BOTH") key. Anything else runs the Community grid with our fallbacks,
// so a watermark never ships. The AG Studio key does not license a standalone grid (D-053), so it is never used here.

export interface LicenseDetails {
  valid: boolean;
  missing?: boolean;
  expired?: boolean;
  trialExpired?: boolean;
  incorrectLicenseType?: boolean;
  suppliedLicenseType?: string;
  expiry?: string;
}

export type GridEdition = { enterprise: true; reason: "licensed"; expiry?: string } | { enterprise: false; reason: "no-key" | "invalid" | "expired" | "wrong-type" };

/** Pure decision on AG Grid's own LicenseManager.getLicenseDetails() output. */
export function gridEdition(key: string | undefined, d: LicenseDetails | null, now = new Date()): GridEdition {
  if (!key || !d || d.missing) return { enterprise: false, reason: "no-key" };
  if (!d.valid) return { enterprise: false, reason: d.incorrectLicenseType ? "wrong-type" : "invalid" };
  if (d.expired || d.trialExpired) return { enterprise: false, reason: "expired" };
  if (d.expiry) {
    const t = Date.parse(d.expiry);
    if (Number.isFinite(t) && t < now.getTime()) return { enterprise: false, reason: "expired" };
  }
  if (d.incorrectLicenseType || d.suppliedLicenseType !== "BOTH") return { enterprise: false, reason: "wrong-type" };
  return { enterprise: true, reason: "licensed", expiry: d.expiry };
}
