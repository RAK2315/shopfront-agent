import type { Metadata } from "next";
import Link from "next/link";
import { LiveWire } from "@/components/console/live-wire";
import { RequestId } from "@/components/ui/request-id";
import { recentCheckouts, recentEvents } from "@/server/console";
import { appUrl } from "@/server/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live wire" };

// Live ops console v0 (Phase 2): every agent call, PayPal request and webhook as it happens.
export default async function LivePage() {
  const [events, checkouts] = await Promise.all([recentEvents(), recentCheckouts()]);
  return (
    <main className="mx-auto grid min-h-dvh max-w-[90rem] grid-cols-[minmax(0,1fr)] content-start gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1">
          <Link href="/" className="w-fit font-display text-lg font-semibold text-ink-2 hover:text-ink">
            Shopfront
          </Link>
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em]">Live wire</h1>
          <p className="max-w-[62ch] text-base text-ink-2">
            Every agent call, PayPal request and webhook, as it happens. The IDs are real PayPal sandbox IDs; click one to copy it.
          </p>
        </div>
        <RequestId label="MCP endpoint" value={appUrl("/mcp")} max={48} />
      </header>
      <LiveWire initialEvents={events} initialCheckouts={checkouts} />
    </main>
  );
}
