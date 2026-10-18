"use client";

import { useSyncExternalStore, useState } from "react";
import { Activity, X } from "lucide-react";
import { ShopTimeline } from "@/components/shop/shop-chat";

/** Phones (walkthrough #9): the live wire is one tap away in a bottom sheet, so shopping keeps the screen. */
const QUERY = "(max-width: 1023px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function MobileWire({ after }: { after: number }) {
  const [open, setOpen] = useState(false);
  // Only phones and tablets mount it: desktop already shows the wire beside the chat (one SSE stream per page).
  const narrow = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  if (!narrow) return null;
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-ink-panel px-3 text-sm font-medium text-ink-panel-text"
        data-testid="mobile-wire-open"
      >
        <Activity aria-hidden className="size-4 text-success" /> Live wire
      </button>
      <div className={open ? "fixed inset-0 z-40 flex flex-col justify-end bg-ink/30" : "hidden"} onClick={() => setOpen(false)}>
        <div className="relative h-[75dvh] rounded-t-lg bg-ink-panel p-2" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-pill bg-ink-panel-2 text-ink-panel-text" aria-label="Close live wire">
            <X aria-hidden className="size-4" />
          </button>
          {/* Mounted from the start so it collects this visit's events even while closed. */}
          <ShopTimeline after={after} />
        </div>
      </div>
    </div>
  );
}

/** The desktop column's wire: not mounted on phones, where the sheet above owns the stream. */
export function DesktopWire({ after }: { after: number }) {
  const narrow = useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
  if (narrow) return null;
  return <ShopTimeline after={after} />;
}
