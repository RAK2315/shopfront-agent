"use client";

import { useMemo } from "react";
import { AgStudio } from "ag-studio-react";
import { AgStudioLicenseManager, AgStudioModuleRegistry, AgStudioAiModule, createAiHarness } from "ag-studio";
import { shopfrontLlmAdapter } from "./llm-adapter";

// Phase 2 AG Studio spike (D-043): real Studio, real checkout rows, built-in agents running on our adapter.
// Replaced by the Phase 5 seller dashboard.
AgStudioModuleRegistry.registerModules([AgStudioAiModule]);
if (process.env.NEXT_PUBLIC_AG_LICENSE_KEY) AgStudioLicenseManager.setLicenseKey(process.env.NEXT_PUBLIC_AG_LICENSE_KEY);

export interface SpikeRow {
  checkout: string;
  status: string;
  total_usd: number;
  items: string;
  country: string;
  created: string;
}

export function StudioSpike({ rows }: { rows: SpikeRow[] }) {
  const data = useMemo(() => ({ sources: [{ id: "checkouts", data: rows }] }), [rows]);
  if (typeof window !== "undefined") (window as unknown as { __studioTurns?: unknown[] }).__studioTurns ??= [];
  return (
    <div style={{ height: "100%", width: "100%" }}>
      <AgStudio
        data={data as never}
        mode="edit"
        ai={(params) => createAiHarness(params.api, { adapter: shopfrontLlmAdapter, primary: "lead" })}
      />
    </div>
  );
}
