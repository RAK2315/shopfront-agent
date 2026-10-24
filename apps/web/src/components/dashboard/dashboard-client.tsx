"use client";

import dynamic from "next/dynamic";

// AG Studio and AG Grid touch `window` on import, so the dashboard renders in the browser only.
export const DashboardClient = dynamic(() => import("./dashboard").then((m) => m.StudioReport), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading the dashboard…</p>,
});

// Dashboard v2 (D-089): AG Grid + AG Charts, client-only for the same reason.
export const DashboardV2Client = dynamic(() => import("./v2/dashboard-v2").then((m) => m.DashboardV2), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading the dashboard…</p>,
});
