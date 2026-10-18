import type { Metadata } from "next";
import { LiveWire } from "@/components/console/live-wire";
import { RequestId } from "@/components/ui/request-id";
import { liveStats, recentCheckouts, recentEvents } from "@/server/console";
import { SiteNav } from "@/components/site/site-nav";
import { appUrl } from "@/server/env";
import { isTestRun } from "@/server/run-context";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live wire" };

// Live ops console v0 (Phase 2): every agent call, PayPal request and webhook as it happens.
// `?from=now` starts the timeline empty and streams only new events (the Phase 8 capture, D-058).
export default async function LivePage({ searchParams }: PageProps<"/live">) {
  const fresh = (await searchParams).from === "now";
  // Public: test and script runs are hidden (run-context.ts) unless this request is one.
  const test = await isTestRun();
  const [events, checkouts, stats] = await Promise.all([recentEvents(fresh ? 1 : undefined, test), recentCheckouts(undefined, test), liveStats(test)]);
  return (
    <>
    <SiteNav tone="bar" />
    <main className="mx-auto grid min-h-dvh max-w-[90rem] grid-cols-[minmax(0,1fr)] content-start gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1">
          <h1 className="font-display text-2xl font-medium tracking-[-0.01em]">Live wire</h1>
          <p className="max-w-[62ch] text-base text-ink-2">
            Every agent call, PayPal request and webhook, as it happens. The IDs are real PayPal sandbox IDs; click one to copy it.
          </p>
        </div>
        <RequestId label="MCP endpoint" value={appUrl("/mcp")} max={48} />
      </header>
      <LiveWire initialEvents={fresh ? [] : events} initialCheckouts={checkouts} initialStats={stats} after={fresh ? (events[0]?.id ?? 0) : undefined} />
    </main>
    </>
  );
}
