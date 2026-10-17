import { and, desc, eq, gt, schema } from "@shopfront/db";
import { bus, toShopEvent, type ShopEvent } from "@/server/events";
import { isTestRun } from "@/server/run-context";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

const REPLAY = 60;
const HEARTBEAT_MS = 20_000;

// Live timeline feed (Server-Sent Events). On connect it replays recent events from the `events` table
// (or everything after Last-Event-ID on a reconnect), then streams new ones from the in-process bus.
// Heartbeats are comments and never touch the database.
// Test and script runs are hidden (run-context.ts) everywhere, the seller's dashboard included, except for a test
// run itself (AT-5's dashboard sees its own events).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkoutId = url.searchParams.get("checkout");
  if (checkoutId && !/^chk_[a-z0-9]{12}$/.test(checkoutId)) return new Response("Bad checkout id", { status: 400 });
  const lastId = Number(req.headers.get("last-event-id") ?? url.searchParams.get("after") ?? "") || 0;
  const includeTest = await isTestRun();

  const { db } = services();
  const filter = and(checkoutId ? eq(schema.events.checkoutId, checkoutId) : undefined, includeTest ? undefined : eq(schema.events.isTest, false));
  const backlog = (
    await db
      .select()
      .from(schema.events)
      .where(and(filter, lastId ? gt(schema.events.id, lastId) : undefined))
      .orderBy(desc(schema.events.id))
      .limit(REPLAY)
  )
    .reverse()
    .map(toShopEvent);

  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let lastSent = 0;
      const send = (ev: ShopEvent) => {
        if (ev.id <= lastSent) return; // an event can be both in the backlog and on the bus
        lastSent = ev.id;
        controller.enqueue(enc.encode(`id: ${ev.id}\nevent: shop\ndata: ${JSON.stringify(ev)}\n\n`));
      };
      controller.enqueue(enc.encode(`retry: 3000\n: connected\n\n`));
      // Subscribe before flushing the backlog so nothing recorded in between is lost.
      const queued: ShopEvent[] = [];
      let flushing = true;
      const onEvent = (ev: ShopEvent) => {
        if (checkoutId && ev.checkoutId !== checkoutId) return;
        if (ev.isTest && !includeTest) return;
        if (flushing) queued.push(ev);
        else send(ev);
      };
      bus.on("event", onEvent);
      for (const ev of backlog) send(ev);
      flushing = false;
      for (const ev of queued.sort((a, b) => a.id - b.id)) send(ev);

      const beat = setInterval(() => {
        try {
          controller.enqueue(enc.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_MS);
      cleanup = () => {
        clearInterval(beat);
        bus.off("event", onEvent);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression middleware from buffering the stream; X-Accel-Buffering for proxies.
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
