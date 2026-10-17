// Acceptance checks for the owner's Step 1 fixes (2026-10-16), data isolation (D-070). Real calls, no mocks.
//   I1 a test run (signed header, added by the test-run preload) creates a checkout: it and all its events are
//      flagged is_test, and it is absent from the public console, the public event stream, / and /live
//   I2 a real visitor (no header) creates a checkout: it shows on the public console and event stream
//      (afterwards it is archived as test, so it never clutters the public views)
//   I3 everything public (/, /live, /api/console/checkouts, the /api/events backlog) shows 0 test rows
//   I4 events without a request (webhooks, timers) inherit the flag: every event of the newest paid test checkout
//      is flagged, including the PayPal webhook rows
//   I5 no public event since the cutover says "mode:replay"; a replayed step is badged "Replayed recording" instead
// Usage: pnpm --filter web fixes-checks -- --base https://shopfront-agent.onrender.com [--cutover <ISO time>]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
const cutover = arg("--cutover");

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as R[];

const PUBLIC = { "x-shopfront-public-view": "1" }; // the preload then sends no test header: what anyone sees
const publicText = async (path: string) => (await fetch(`${base}${path}`, { headers: PUBLIC })).text();
const consoleIds = async (headers: Record<string, string>) =>
  ((await (await fetch(`${base}/api/console/checkouts`, { headers })).json()) as { checkouts: Array<{ id: string }> }).checkouts.map((c) => c.id);
/** The SSE backlog (recent events) as one viewer sees it. */
async function streamEvents(path: string, headers: Record<string, string>, ms = 3500) {
  const ctl = new AbortController();
  const r = await fetch(`${base}${path}`, { headers, signal: ctl.signal });
  const reader = r.body!.getReader();
  let txt = "";
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const { value, done } = await Promise.race([reader.read(), sleep(500).then(() => ({ value: undefined, done: false }))]);
    if (done) break;
    if (value) txt += new TextDecoder().decode(value);
  }
  ctl.abort();
  return txt
    .split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => JSON.parse(l.slice(6)) as { id: number; checkoutId: string | null; summary: string; isTest: boolean });
}
async function checkout(name: string, headers: Record<string, string>) {
  const c = new Client({ name, version: "1.0.0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers } }));
  const r = await c.callTool({ name: "create_checkout", arguments: { items: [{ variant_id: "var_cobalt120000", quantity: 1 }] } });
  await c.close();
  return JSON.parse((r.content as Array<{ text: string }>)[0]!.text) as { checkout_id: string };
}
const testIds = async (ids: string[]) =>
  ids.length ? (await q<{ id: string }>("select id from checkouts where id = any($1) and is_test", [ids])).map((r) => r.id) : [];
const idsIn = (html: string) => [...new Set(html.match(/chk_[a-z0-9]{12}/g) ?? [])];

try {
  // ── I1 ──
  {
    const c = await checkout("isolation-test-run", {});
    await sleep(2500);
    const [row] = await q<{ is_test: boolean }>("select is_test from checkouts where id=$1", [c.checkout_id]);
    const evs = await q<{ is_test: boolean; kind: string }>("select is_test, kind from events where checkout_id=$1", [c.checkout_id]);
    const pubConsole = await consoleIds(PUBLIC);
    const testConsole = await consoleIds({});
    const pubStream = await streamEvents(`/api/events?after=0`, PUBLIC);
    const [home, live] = await Promise.all([publicText("/"), publicText("/live")]);
    const detail = {
      checkout: c.checkout_id,
      flagged: row?.is_test,
      events: evs.length,
      eventsFlagged: evs.filter((e) => e.is_test).length,
      inPublicConsole: pubConsole.includes(c.checkout_id),
      inPublicStream: pubStream.some((e) => e.checkoutId === c.checkout_id),
      onLanding: home.includes(c.checkout_id),
      onLive: live.includes(c.checkout_id),
      visibleToTestRun: testConsole.includes(c.checkout_id),
    };
    record(
      "I1 a test run's checkout and all its events are flagged and absent from every public view",
      detail.flagged === true && detail.events > 0 && detail.eventsFlagged === detail.events && !detail.inPublicConsole && !detail.inPublicStream && !detail.onLanding && !detail.onLive && detail.visibleToTestRun,
      detail,
    );
  }

  // ── I2 ──
  {
    const c = await checkout("isolation-real-visitor", PUBLIC);
    await sleep(2500);
    const [row] = await q<{ is_test: boolean }>("select is_test from checkouts where id=$1", [c.checkout_id]);
    const pubConsole = await consoleIds(PUBLIC);
    const pubStream = await streamEvents(`/api/events?after=0`, PUBLIC);
    const detail = { checkout: c.checkout_id, flagged: row?.is_test, inPublicConsole: pubConsole.includes(c.checkout_id), inPublicStream: pubStream.some((e) => e.checkoutId === c.checkout_id) };
    // It was only a probe: archive it as test so the public views stay real-only.
    await db.query("update checkouts set is_test = true where id=$1", [c.checkout_id]);
    await db.query("update events set is_test = true where checkout_id=$1", [c.checkout_id]);
    record("I2 a real visitor's checkout shows on the public console and stream (then archived)", detail.flagged === false && detail.inPublicConsole && detail.inPublicStream, detail);
  }

  // ── I3 ──
  {
    const [home, live] = await Promise.all([publicText("/"), publicText("/live")]);
    const pubConsole = await consoleIds(PUBLIC);
    const pubStream = await streamEvents(`/api/events?after=0`, PUBLIC);
    const streamTest = pubStream.filter((e) => e.isTest).length;
    const detail = {
      landingIds: idsIn(home).length,
      landingTestIds: await testIds(idsIn(home)),
      liveIds: idsIn(live).length,
      liveTestIds: await testIds(idsIn(live)),
      consoleRows: pubConsole.length,
      consoleTestIds: await testIds(pubConsole),
      streamRows: pubStream.length,
      streamTestRows: streamTest,
      streamTestCheckouts: await testIds(pubStream.flatMap((e) => (e.checkoutId ? [e.checkoutId] : []))),
    };
    record(
      "I3 public /, /live, console and event backlog show 0 test rows",
      !detail.landingTestIds.length && !detail.liveTestIds.length && !detail.consoleTestIds.length && streamTest === 0 && !detail.streamTestCheckouts.length,
      detail,
    );
  }

  // ── I4 ──
  {
    const [paid] = await q<{ id: string }>("select id from checkouts where is_test and status in ('paid','shipped','partially_refunded','refunded') and created_at > coalesce($1::timestamptz, now() - interval '1 day') order by created_at desc limit 1", [cutover ?? null]);
    if (!paid) record("I4 webhook and timer events inherit the flag", false, "no paid test checkout since the cutover: run phase6-checks --only 8 first");
    else {
      const evs = await q<{ actor: string; kind: string; is_test: boolean }>("select actor, kind, is_test from events where checkout_id=$1 order by id", [paid.id]);
      const webhook = evs.filter((e) => e.actor === "webhook");
      record("I4 webhook and timer events inherit the flag from the checkout", evs.length > 0 && evs.every((e) => e.is_test) && webhook.length > 0, {
        checkout: paid.id,
        events: evs.length,
        webhookEvents: webhook.length,
        unflagged: evs.filter((e) => !e.is_test).map((e) => `${e.actor}:${e.kind}`),
      });
    }
  }

  // ── I5 ──
  {
    const rows = await q<{ n: number }>("select count(*)::int n from events where not is_test and summary like '%mode:replay%' and created_at > coalesce($1::timestamptz, now() - interval '1 hour')", [cutover ?? null]);
    record("I5 no public event since the cutover says 'mode:replay'", rows[0]!.n === 0, { publicModeReplayRows: rows[0]!.n, since: cutover ?? "1 hour" });
  }
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  await db.end();
}
const failed = results.filter((r) => !r.ok);
log(failed.length ? `FIXES: ${failed.length} FAILED` : "FIXES: all checks passed");
process.exit(failed.length ? 1 : 0);
