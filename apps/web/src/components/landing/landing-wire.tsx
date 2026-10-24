"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShopEvent } from "@/server/events";
import { toTimelineItem } from "@/components/console/event-item";
import { Timeline, type WireState } from "@/components/console/timeline";

/** The landing page's hero image is the product working: the most recent real events, then live ones as they happen. */
export function LandingWire({ initial }: { initial: ShopEvent[] }) {
  const [events, setEvents] = useState(initial);
  const [wire, setWire] = useState<WireState>("connecting");
  const after = initial.reduce((m, e) => Math.max(m, e.id), 0);
  useEffect(() => {
    const es = new EventSource(`/api/events?after=${after}`);
    es.onopen = () => setWire("live");
    es.onerror = () => setWire(es.readyState === EventSource.CLOSED ? "paused" : "reconnecting");
    es.addEventListener("shop", (m) => {
      const ev = JSON.parse((m as MessageEvent<string>).data) as ShopEvent;
      setEvents((all) => (all.some((x) => x.id === ev.id) ? all : [ev, ...all].slice(0, 7)));
    });
    return () => es.close();
  }, [after]);
  const items = useMemo(() => events.map(toTimelineItem), [events]);
  return (
    <Timeline
      items={items}
      state={wire}
      title="Happening on the sandbox right now"
      emptyText="Quiet right now. Start a purchase in the shop and watch it arrive here."
      className="h-full shadow-[var(--shadow-float)]"
      listClassName="max-h-[30rem] overflow-hidden lg:max-h-[32rem]"
    />
  );
}
