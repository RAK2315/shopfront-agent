import type { Metadata } from "next";
import { desc, schema } from "@shopfront/db";
import { ShopChat } from "@/components/shop/shop-chat";
import { DesktopWire, MobileWire } from "@/components/shop/mobile-wire";
import { SiteNav } from "@/components/site/site-nav";
import { env } from "@/server/env";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop with an agent" };

// The hosted buyer agent (Phase 6) beside the live wire: the split-screen judges see (walkthrough #4, D-088).
export default async function ShopPage() {
  // The timeline starts at "now": only this visit's events stream in.
  const [last] = await services().db.select({ id: schema.events.id }).from(schema.events).orderBy(desc(schema.events.id)).limit(1);
  const e = env();
  // The sandbox test buyer is shown on purpose (D-069): judges need it to approve in PayPal's sandbox.
  const testBuyer = e.SANDBOX_BUYER_EMAIL && e.SANDBOX_BUYER_PASSWORD ? { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD } : undefined;
  const after = last?.id ?? 0;
  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)]">
      <SiteNav tone="bar" />
      <main className="mx-auto grid min-h-0 w-full max-w-[90rem] grid-rows-[auto_minmax(0,1fr)] gap-3 px-3 py-3 sm:px-6 sm:py-4">
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="font-display text-xl font-medium tracking-[-0.01em] sm:text-2xl">Shop with an AI agent</h1>
          <p className="hidden text-sm text-ink-2 sm:block">Sandbox demo · approve with the test buyer · no real money moves</p>
        </header>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <ShopChat clientId={e.PAYPAL_CLIENT_ID} testBuyer={testBuyer} headerExtra={<MobileWire after={after} />} />
          <div className="hidden min-h-0 lg:block">
            <DesktopWire after={after} />
          </div>
        </div>
      </main>
    </div>
  );
}
