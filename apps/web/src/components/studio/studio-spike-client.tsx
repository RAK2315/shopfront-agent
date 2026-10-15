"use client";

import dynamic from "next/dynamic";
import type { SpikeRow } from "./studio-spike";

// AG Studio touches window on import, so it only renders in the browser.
const StudioSpike = dynamic(() => import("./studio-spike").then((m) => m.StudioSpike), { ssr: false });

export function StudioSpikeClient({ rows }: { rows: SpikeRow[] }) {
  return <StudioSpike rows={rows} />;
}
