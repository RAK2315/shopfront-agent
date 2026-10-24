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

// AG Studio's licence (D-100). The Studio key licenses Studio only. When it is missing, invalid or past its expiry,
// the report is not mounted at all (no watermark, no console banner); the page shows the Community overview instead.
export interface StudioLicenseDetails {
  valid: boolean;
  missing?: boolean;
  expired?: boolean;
  trialExpired?: boolean;
  incorrectLicenseType?: boolean;
  isTrial?: boolean;
  expiry?: string | null;
}

export type StudioLicense = { ok: true; trial: boolean; expiry?: string } | { ok: false; reason: "no-key" | "invalid" | "expired" };

/** Pure decision on Studio's own AgStudioLicenseManager.getLicenseDetails() output. `now` lets a test move the clock. */
export function studioLicense(key: string | undefined, d: StudioLicenseDetails | null, now = new Date()): StudioLicense {
  if (!key || !d || d.missing) return { ok: false, reason: "no-key" };
  if (!d.valid) return { ok: false, reason: "invalid" };
  if (d.expired || d.trialExpired) return { ok: false, reason: "expired" };
  if (d.expiry) {
    const t = Date.parse(d.expiry);
    // A key works through its expiry day.
    if (Number.isFinite(t) && t + 86_400_000 <= now.getTime()) return { ok: false, reason: "expired" };
  }
  return { ok: true, trial: !!d.isTrial, expiry: d.expiry ?? undefined };
}

/** The `?aglicense=` simulation (D-100): it can only switch Studio off. */
export type LicenseSimulation = "missing" | "expired" | null;
export const licenseSimulation = (v: string | string[] | undefined): LicenseSimulation => (v === "missing" || v === "expired" ? v : null);
