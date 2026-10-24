import { newId } from "@shopfront/core";
import { and, desc, eq, schema } from "@shopfront/db";
import type { AttackResult } from "@/lib/gauntlet";
import { runGauntlet } from "@/server/gauntlet";
import { rateLimit } from "@/server/rate-limit";
import { isTestRun, runHeaders } from "@/server/run-context";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// The Gauntlet (D-102). POST runs all 31 attacks and streams one JSON line per attack (NDJSON), then a summary.
// One run at a time on this instance; a public run at most every 3 minutes (the free LLM tier and the sandbox).
const g = globalThis as unknown as { __gauntlet?: { running: boolean; lastPublic: number } };
const state = (g.__gauntlet ??= { running: false, lastPublic: 0 });
const COOLDOWN_MS = 3 * 60_000;

export async function GET() {
  const test = await isTestRun();
  const [row] = await services()
    .db.select()
    .from(schema.gauntletRuns)
    .where(and(eq(schema.gauntletRuns.status, "done"), test ? undefined : eq(schema.gauntletRuns.isTest, false)))
    .orderBy(desc(schema.gauntletRuns.createdAt))
    .limit(1);
  return Response.json({ run: row ?? null, running: state.running }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const test = await isTestRun();
  if (!test) {
    const limited = rateLimit(req, "gauntlet");
    if (limited) return limited;
  }
  if (state.running) return Response.json({ error: { code: "BUSY", message: "A Gauntlet run is in progress. Watch it finish, then run again." } }, { status: 409 });
  const wait = state.lastPublic + COOLDOWN_MS - Date.now();
  if (!test && wait > 0) return Response.json({ error: { code: "COOLDOWN", message: `The Gauntlet just ran. Next run in ${Math.ceil(wait / 1000)} s.`, retry_after_s: Math.ceil(wait / 1000) } }, { status: 429 });

  state.running = true;
  if (!test) state.lastPublic = Date.now();
  const headers = await runHeaders();
  const { db } = services();
  const runId = newId("gauntletRun");
  await db.insert(schema.gauntletRuns).values({ id: runId, status: "running", isTest: test });
  const results: AttackResult[] = [];
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => {
        try {
          controller.enqueue(enc.encode(`${JSON.stringify(o)}\n`));
        } catch {
          /* the browser left; the run still finishes and is stored */
        }
      };
      send({ type: "start", runId });
      try {
        const summary = await runGauntlet({
          runId,
          headers,
          emit: (r) => {
            results.push(r);
            send({ type: "attack", result: r });
          },
        });
        await db.update(schema.gauntletRuns).set({ status: "done", results: results as unknown as Array<Record<string, unknown>>, summary: summary as unknown as Record<string, unknown>, finishedAt: new Date() }).where(eq(schema.gauntletRuns.id, runId));
        send({ type: "done", runId, summary });
      } catch (e) {
        console.error("gauntlet", e);
        await db.update(schema.gauntletRuns).set({ status: "failed", results: results as unknown as Array<Record<string, unknown>>, finishedAt: new Date() }).where(eq(schema.gauntletRuns.id, runId));
        send({ type: "error", message: "The run stopped early. Try again in a minute." });
      } finally {
        state.running = false;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
