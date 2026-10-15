import type { Metadata } from "next";
import Link from "next/link";
import { desc, schema } from "@shopfront/db";
import { ShopChat, ShopTimeline } from "@/components/shop/shop-chat";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop with an agent" };

// The hosted buyer agent (Phase 6) beside the live wire: the split-screen judges see.
export default async function ShopPage() {
  // The timeline starts at "now": only this visit's events stream in.
  const [last] = await services().db.select({ id: schema.events.id }).from(schema.events).orderBy(desc(schema.events.id)).limit(1);
  return (
    <main className="mx-auto grid h-dvh max-w-[90rem] grid-rows-[auto_minmax(0,1fr)] gap-4 px-4 py-4 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div className="grid gap-0.5">
          <Link href="/" className="w-fit font-display text-lg font-semibold text-ink-2 hover:text-ink">
            Shopfront
          </Link>
          <h1 className="font-display text-2xl font-medium">Shop with an AI agent</h1>
        </div>
        <p className="max-w-[60ch] text-sm text-ink-2">Sandbox demo: approve with the PayPal sandbox buyer from the README. No real money moves.</p>
      </header>
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <ShopChat />
        <div className="hidden min-h-0 lg:block">
          <ShopTimeline after={last?.id ?? 0} />
        </div>
      </div>
    </main>
  );
}
