"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { cn } from "@/lib/cn";

// AG Studio and AG Grid touch `window` on import, so the dashboard renders in the browser only.
const StudioReport = dynamic(() => import("./dashboard").then((m) => m.StudioReport), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading the dashboard…</p>,
});

const PHONE = "(max-width: 767.98px)";

/**
 * The report tab. On a phone (< 768 px) it shows one line pointing to the Overview, and Studio is never loaded or
 * mounted. If Studio is already open and the window narrows, it is hidden rather than unmounted, so no work is lost.
 */
export function DashboardClient(props: ComponentProps<typeof StudioReport>) {
  const [narrow, setNarrow] = useState<boolean | null>(null);
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(PHONE);
    const on = () => {
      setNarrow(m.matches);
      if (!m.matches) setOpened(true);
    };
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  if (narrow === null) return null;
  return (
    <>
      {narrow && (
        <p role="status" data-testid="report-phone-note" className="mx-auto mt-3 max-w-xl rounded-md border border-line bg-surface px-4 py-3 text-md text-ink-2">
          Best viewed on desktop.{" "}
          <Link href="/studio/dashboard" className="font-medium text-clay underline underline-offset-4">
            Open the overview
          </Link>
        </p>
      )}
      {opened && (
        <div className={cn("h-full min-w-0", narrow && "hidden")}>
          <StudioReport {...props} />
        </div>
      )}
    </>
  );
}

// Dashboard v2 (D-089): AG Grid + AG Charts, client-only for the same reason.
export const DashboardV2Client = dynamic(() => import("./v2/dashboard-v2").then((m) => m.DashboardV2), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted">Loading the dashboard…</p>,
});
