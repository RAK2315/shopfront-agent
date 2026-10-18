import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SellerNav } from "@/components/studio/seller-nav";
import { SiteNav } from "@/components/site/site-nav";
import { TestOrdersToggle } from "@/components/studio/test-orders-toggle";
import { DashboardClient, DashboardV2Client } from "@/components/dashboard/dashboard-client";
import { PRESET_VERSION } from "@/components/dashboard/preset";
import { dashboardData } from "@/server/dashboard";
import { kpisFrom, listingsGrid, ordersGrid } from "@/server/dashboard-v2";
import { testOrdersSwitch } from "@/server/run-context";
import { currentSeller } from "@/server/seller-session";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Seller dashboard (walkthrough #3, D-089). Overview: KPIs, the Ask bar, the orders grid with drill-down, a linked
// chart and editable listings (AG Grid + AG Charts). Builder: AG Studio with its own AI agents (D-023), where the
// seller composes custom views; configuration lives there, never on the overview.
export default async function DashboardPage({ searchParams }: PageProps<"/studio/dashboard">) {
  const seller = await currentSeller();
  if (!seller) redirect("/studio");
  const tab = (await searchParams).tab === "builder" ? "builder" : "overview";
  const testSwitch = await testOrdersSwitch(seller.id);
  const tabs = (
    <nav aria-label="Dashboard views" className="flex gap-1 rounded-md bg-surface-2 p-1 text-sm font-medium">
      {(["overview", "builder"] as const).map((t) => (
        <Link key={t} href={t === "overview" ? "/studio/dashboard" : "/studio/dashboard?tab=builder"} aria-current={tab === t ? "page" : undefined} className={cn("rounded-sm px-3 py-1.5 transition-colors", tab === t ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")} data-testid={`tab-${t}`}>
          {t === "overview" ? "Overview" : "Builder · AG Studio"}
        </Link>
      ))}
    </nav>
  );
  const header = (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/studio" className="font-display text-lg font-semibold">
          {seller.displayName}
        </Link>
        <h1 className="sr-only">Dashboard</h1>
        {tabs}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {testSwitch.available && <TestOrdersToggle on={testSwitch.on} />}
        <SellerNav handle={seller.handle} current="dashboard" />
      </div>
    </header>
  );

  if (tab === "builder") {
    const data = await dashboardData(seller.id);
    const saved = seller.dashboardState as { preset?: string; state?: unknown } | null;
    return (
      <main className="grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)] bg-canvas">
        <SiteNav tone="bar" />
        {header}
        <div className="min-h-0 p-2">
          <DashboardClient initialData={data} savedState={saved?.preset === PRESET_VERSION ? saved.state : null} />
        </div>
      </main>
    );
  }
  const [orders, listings] = await Promise.all([ordersGrid(seller.id), listingsGrid(seller.id)]);
  return (
    <main className="min-h-dvh bg-canvas">
      <SiteNav tone="bar" />
      {header}
      <DashboardV2Client initial={{ orders, kpis: kpisFrom(orders), listings }} />
    </main>
  );
}
