"use client";

import dynamic from "next/dynamic";

// AG Studio and AG Grid touch `window` on import, so the dashboard renders in the browser only.
export const DashboardClient = dynamic(() => import("./dashboard").then((m) => m.SellerDashboard), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading the dashboard…</p>,
});
