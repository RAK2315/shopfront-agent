import type { Metadata } from "next";
import Link from "next/link";
import { SellerNav } from "@/components/studio/seller-nav";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PRESET_VERSION } from "@/components/dashboard/preset";
import { TestOrdersToggle } from "@/components/studio/test-orders-toggle";
import { dashboardData } from "@/server/dashboard";
import { testOrdersSwitch } from "@/server/run-context";
import { currentSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Seller dashboard on AG Studio (Phase 5, D-023): live widgets, the editable ledger, and the insights agent.
export default async function DashboardPage() {
  const seller = await currentSeller();
  if (!seller) redirect("/studio");
  const [data, testSwitch] = await Promise.all([dashboardData(seller.id), testOrdersSwitch(seller.id)]);
  const saved = seller.dashboardState as { preset?: string; state?: unknown } | null;
  return (
    <main className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-canvas">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
        <div className="flex items-baseline gap-3">
          <Link href="/studio" className="font-display text-lg font-semibold">
            {seller.displayName}
          </Link>
          <h1 className="text-sm font-medium text-ink-2">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {testSwitch.available && <TestOrdersToggle on={testSwitch.on} />}
          <SellerNav handle={seller.handle} current="dashboard" />
        </div>
      </header>
      <div className="min-h-0 p-2">
        <DashboardClient initialData={data} savedState={saved?.preset === PRESET_VERSION ? saved.state : null} />
      </div>
    </main>
  );
}
