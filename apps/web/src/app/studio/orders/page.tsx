import type { Metadata } from "next";
import Link from "next/link";
import { SellerNav } from "@/components/studio/seller-nav";
import { SiteNav } from "@/components/site/site-nav";
import { redirect } from "next/navigation";
import { OrderList, RefundQueue } from "@/components/studio/orders";
import { TestOrdersToggle } from "@/components/studio/test-orders-toggle";
import { sellerOrders } from "@/server/orders";
import { testOrdersSwitch } from "@/server/run-context";
import { currentSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false } };

// Post-sale ops (Phase 4): refund decisions first (human decisions lead), then orders to ship.
export default async function OrdersPage() {
  const seller = await currentSeller();
  if (!seller) redirect("/studio");
  const [{ orders, refunds }, testSwitch] = await Promise.all([sellerOrders(seller.id), testOrdersSwitch(seller.id)]);
  return (
    <>
    <SiteNav tone="bar" />
    <main className="mx-auto grid min-h-dvh max-w-[60rem] content-start gap-10 px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1">
          <Link href="/studio" className="w-fit text-sm font-medium text-ink-2 hover:text-ink">
            ← {seller.displayName}
          </Link>
          <h1 className="font-display text-display font-medium tracking-[-0.02em]">Orders</h1>
        </div>
        <SellerNav handle={seller.handle} current="orders" />
      </header>
      {testSwitch.available && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <TestOrdersToggle on={testSwitch.on} count={orders.filter((o) => o.isTest).length} />
          <p className="text-sm text-ink-2">This demo shop&apos;s history is real PayPal sandbox orders placed by our automated test runs.</p>
        </div>
      )}
      <RefundQueue refunds={refunds} />
      <OrderList orders={orders} />
    </main>
    </>
  );
}
