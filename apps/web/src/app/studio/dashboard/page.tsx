import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { PRESET_VERSION } from "@/components/dashboard/preset";
import { dashboardData } from "@/server/dashboard";
import { currentSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Seller dashboard on AG Studio (Phase 5, D-023): live widgets, the editable ledger, and the insights agent.
export default async function DashboardPage() {
  const seller = await currentSeller();
  if (!seller) redirect("/studio");
  const data = await dashboardData(seller.id);
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
        <nav className="flex items-center gap-4 text-sm font-medium text-ink-2">
          <Link href="/studio/orders" className="hover:text-ink">
            Orders
          </Link>
          <Link href={`/s/${seller.handle}`} className="hover:text-ink">
            Storefront
          </Link>
          <Link href="/live" className="hover:text-ink">
            Live wire
          </Link>
        </nav>
      </header>
      <div className="min-h-0 p-2">
        <DashboardClient initialData={data} savedState={saved?.preset === PRESET_VERSION ? saved.state : null} />
      </div>
    </main>
  );
}
