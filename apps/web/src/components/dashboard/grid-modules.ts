"use client";

import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import { gridEdition, type GridEdition, type LicenseDetails } from "@/lib/ag-license";

// Registers the grid's modules once per page. Enterprise is registered only when the guard says the key is a valid
// BOTH key (D-080); otherwise the grid is Community and the dashboard uses its fallbacks. Never a watermark.
let edition: GridEdition | null = null;

export function gridModules(): GridEdition {
  if (edition) return edition;
  const key = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY;
  let details: LicenseDetails | null = null;
  if (key) {
    try {
      details = LicenseManager.getLicenseDetails(key) as LicenseDetails;
    } catch {
      details = { valid: false };
    }
  }
  edition = gridEdition(key, details);
  if (edition.enterprise) {
    LicenseManager.setLicenseKey(key!);
    ModuleRegistry.registerModules([AllEnterpriseModule.with(AgChartsEnterpriseModule)]);
  } else {
    ModuleRegistry.registerModules([AllCommunityModule]);
  }
  return edition;
}
