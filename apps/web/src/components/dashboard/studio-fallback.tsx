"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Kpis, ListingRow, OrderRow } from "@/server/dashboard-v2";
import { DashboardV2 } from "./v2/dashboard-v2";

type Data = { orders: OrderRow[]; kpis: Kpis; listings: ListingRow[] };

const WHY = {
  "no-key": "This deployment has no AG Studio licence key",
  invalid: "This deployment's AG Studio licence key isn't valid",
  expired: "This deployment's AG Studio trial licence has ended",
} as const;

/**
 * The report tab without a valid AG Studio licence (D-100): Studio is never mounted, so there is no watermark and no
 * licence banner in the console. The seller gets the same data on the Community overview (AG Grid + AG Charts).
 */
export function StudioFallback({ reason }: { reason: keyof typeof WHY }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/seller/dashboard/v2", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="h-full overflow-y-auto" data-testid="studio-fallback" data-reason={reason}>
      <div role="status" className="mx-auto mt-3 flex max-w-[1760px] flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm sm:mx-6 2xl:mx-auto">
        <p className="text-ink-2">
          <span className="font-semibold text-ink">The AG Studio report is paused.</span> {WHY[reason]}, so this tab shows the standard dashboard instead: the same orders, payouts and stock.
        </p>
        <Link href="/studio/dashboard" className="font-medium text-clay underline-offset-4 hover:underline">
          Open the overview
        </Link>
      </div>
      {data ? <DashboardV2 initial={data} /> : <p className="p-6 text-sm text-muted">{failed ? "The dashboard data didn't load. Reload the page to try again." : "Loading the dashboard…"}</p>}
    </div>
  );
}
