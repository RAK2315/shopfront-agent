// Phase 10 backend ATs (part of AT-10 "Link" and "Guardrails"), run against the DEPLOYED app. They post updates to
// our own /telegram/webhook with the real secret, as Telegram would, from made-up chat ids. The bot's replies to those
// chats fail at Telegram ("chat not found"), which is expected: we check what our server did in the database.
//   T1  wrong or missing secret token → 401
//   T2  the same update_id twice → processed once (telegram_updates)
//   T3  link codes: the demo seller needs the owner's token; a code links once; reused or expired codes are refused
//   T4  /start judge links to the isolated judge_demo seller (is_demo)
//   T5  the action executor: another chat's or an expired action is refused; a valid tap is claimed once (double tap)
//   T6  judge_demo stays isolated: not in global search or llms.txt; its checkouts are is_test with no test header
// Usage: pnpm --filter web telegram-checks -- --base https://shopfront-agent.onrender.com
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/phase-10")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, timeoutMs = 30_000): Promise<T> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(1500);
  }
}

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const q1 = async <R = Record<string, unknown>,>(sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows[0] as R | undefined;

// Made-up private chat ids far outside Telegram's real range for users, unique per run.
const runTag = Date.now() % 1_000_000;
const CHAT_OWNER = 9_100_000_000_000 + runTag;
const CHAT_OTHER = 9_200_000_000_000 + runTag;
const CHAT_JUDGE = 9_300_000_000_000 + runTag;
let nextUpdate = 900_000_000 + runTag * 10;

const hook = (body: unknown, secret: string | null = e.TELEGRAM_WEBHOOK_SECRET) =>
  fetch(`${base}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", ...(secret === null ? {} : { "x-telegram-bot-api-secret-token": secret }) }, body: JSON.stringify(body) });
const text = (chatId: number, s: string, updateId = nextUpdate++) => ({ update_id: updateId, message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: chatId }, text: s } });
const tap = (chatId: number, data: string, updateId = nextUpdate++) => ({ update_id: updateId, callback_query: { id: `cq${updateId}`, data, message: { message_id: 1, chat: { id: chatId } } } });
const processed = (updateId: number) => until(`update ${updateId} processed`, () => q1("select 1 from telegram_updates where update_id = $1 and processed_at is not null", [String(updateId)]));
const link = (chatId: number) => q1<{ seller_id: string; is_demo: boolean; revoked_at: Date | null }>("select seller_id, is_demo, revoked_at from telegram_links where chat_id = $1", [String(chatId)]);

try {
  // ---------- T1 ----------
  {
    const wrong = await hook(text(CHAT_OTHER, "hi"), "wrong-secret");
    const none = await hook(text(CHAT_OTHER, "hi"), null);
    record("T1 wrong or missing secret → 401", wrong.status === 401 && none.status === 401, { wrong: wrong.status, none: none.status });
  }

  // ---------- T2 ----------
  {
    const id = nextUpdate++;
    const a = await hook(text(CHAT_OTHER, "hello", id));
    const b = await hook(text(CHAT_OTHER, "hello", id));
    await processed(id);
    const n = Number((await q1<{ n: number }>("select count(*)::int n from telegram_updates where update_id = $1", [String(id)]))?.n);
    record("T2 duplicate update_id → processed once", a.status === 200 && b.status === 200 && n === 1, { first: a.status, second: b.status, rows: n });
  }

  // ---------- T3 ----------
  {
    const signIn = await fetch(`${base}/api/seller/session`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: "juniper_clay" }) });
    const cookie = (signIn.headers.get("set-cookie") ?? "").split(";")[0]!;
    const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
    const noSession = await fetch(`${base}/api/seller/telegram-link`, { method: "POST" });
    const noAdmin = await fetch(`${base}/api/seller/telegram-link`, { method: "POST", headers: { cookie } });
    const ok = await fetch(`${base}/api/seller/telegram-link`, { method: "POST", headers: { cookie, authorization: `Bearer ${admin}` } });
    const body = (await ok.json()) as { code?: string; deepLink?: string | null };
    const code = body.code ?? "";
    const u1 = nextUpdate++;
    await hook(text(CHAT_OWNER, `/start ${code}`, u1));
    await processed(u1);
    const linked = await link(CHAT_OWNER);
    const u2 = nextUpdate++;
    await hook(text(CHAT_OTHER, `/start ${code}`, u2)); // the same code from another chat
    await processed(u2);
    const reused = await link(CHAT_OTHER);
    // An expired code, written straight to the table as the Studio would have 11 minutes ago.
    const old = randomBytes(18).toString("base64url");
    const jc = await q1<{ id: string }>("select id from sellers where handle = 'juniper_clay'");
    await db.query("insert into telegram_link_codes (code_hash, seller_id, expires_at) values ($1, $2, now() - interval '1 minute')", [createHash("sha256").update(old).digest("hex"), jc!.id]);
    const u3 = nextUpdate++;
    await hook(text(CHAT_OTHER, `/start ${old}`, u3));
    await processed(u3);
    const expired = await link(CHAT_OTHER);
    record("T3 link codes: owner-only for the demo seller; single use; expiry", noSession.status >= 400 && noAdmin.status === 403 && ok.status === 200 && /^https:\/\/t\.me\/\w+\?start=/.test(body.deepLink ?? "") && linked?.seller_id === jc!.id && !reused && !expired, {
      noSession: noSession.status,
      noAdmin: noAdmin.status,
      withAdmin: ok.status,
      deepLinkShape: (body.deepLink ?? "").replace(code, "<code>"),
      linkedToDemoSeller: linked?.seller_id === jc!.id,
      reusedCodeLinked: Boolean(reused),
      expiredCodeLinked: Boolean(expired),
    });
  }

  // ---------- T4 ----------
  const judge = await q1<{ id: string; test_only: boolean }>("select id, test_only from sellers where handle = 'judge_demo'");
  {
    const u = nextUpdate++;
    await hook(text(CHAT_JUDGE, "/start judge", u));
    await processed(u);
    const l = await link(CHAT_JUDGE);
    record("T4 /start judge → judge_demo, is_demo", Boolean(judge?.test_only) && l?.seller_id === judge?.id && l?.is_demo === true, { judgeSellerTestOnly: judge?.test_only, link: l && { isJudge: l.seller_id === judge?.id, isDemo: l.is_demo } });
  }

  // ---------- T5 ----------
  {
    const mk = async (chatId: number, sellerId: string, expiresSql: string) => {
      const id = `tga_${randomBytes(9).toString("hex").slice(0, 12).replace(/[^a-z0-9]/g, "a")}`;
      // A refund request id that doesn't exist: a claimed tap runs the handler, which refuses it (no money involved).
      await db.query(`insert into telegram_actions (id, seller_id, chat_id, kind, payload, expires_at) values ($1, $2, $3, 'decline_refund', $4, ${expiresSql})`, [id, sellerId, String(chatId), JSON.stringify({ refundRequestId: "rfr_doesnotexist" })]);
      return id;
    };
    const jcId = (await q1<{ id: string }>("select id from sellers where handle = 'juniper_clay'"))!.id;
    const judgeAction = await mk(CHAT_JUDGE, judge!.id, "now() + interval '1 hour'");
    const expiredAction = await mk(CHAT_JUDGE, judge!.id, "now() - interval '1 minute'");
    const ownerAction = await mk(CHAT_OWNER, jcId, "now() + interval '1 hour'");
    const send = async (chatId: number, data: string) => {
      const u = nextUpdate++;
      await hook(tap(chatId, data, u));
      await processed(u);
    };
    await send(CHAT_JUDGE, ownerAction); // a judge forging the owner's action id
    await send(CHAT_OWNER, judgeAction); // the owner's chat tapping the judge's action
    await send(CHAT_JUDGE, expiredAction);
    await send(CHAT_JUDGE, "tga_notarealone"); // unknown id
    await send(CHAT_JUDGE, judgeAction); // the valid tap
    const first = await q1<{ used_at: Date | null; result: unknown }>("select used_at, result from telegram_actions where id = $1", [judgeAction]);
    await send(CHAT_JUDGE, judgeAction); // double tap
    const second = await q1<{ used_at: Date | null; result: unknown }>("select used_at, result from telegram_actions where id = $1", [judgeAction]);
    const owner = await q1<{ used_at: Date | null }>("select used_at from telegram_actions where id = $1", [ownerAction]);
    const exp = await q1<{ used_at: Date | null }>("select used_at from telegram_actions where id = $1", [expiredAction]);
    const firstResult = first?.result as { ok?: boolean; error?: string } | null;
    record(
      "T5 executor: forged and expired taps refused; a valid tap claimed exactly once",
      !owner?.used_at && !exp?.used_at && Boolean(first?.used_at) && firstResult?.ok === false && /not found/i.test(firstResult?.error ?? "") && second?.used_at?.getTime() === first?.used_at?.getTime() && JSON.stringify(second?.result) === JSON.stringify(first?.result),
      { ownerActionUsedByJudgeTap: Boolean(owner?.used_at), expiredUsed: Boolean(exp?.used_at), validClaimed: Boolean(first?.used_at), handlerResult: firstResult, doubleTapChangedNothing: second?.used_at?.getTime() === first?.used_at?.getTime() },
    );
  }

  // ---------- T6 ----------
  {
    // Searches run as a test run (off the public wire). Only the checkout goes out as a public visitor, to show that a
    // test_only seller's checkout is is_test even without the test header.
    const open = async (publicView: boolean) => {
      const c = new Client({ name: "telegram-checks", version: "1.0.0" });
      await c.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { "x-shopfront-client": "telegram-checks", ...(publicView ? { "x-shopfront-public-view": "1" } : {}) } } }));
      return c;
    };
    const call = async (c: Client, name: string, a: Record<string, unknown>) => JSON.parse(((await c.callTool({ name, arguments: a })).content as Array<{ text: string }>)[0]!.text);
    const test = await open(false);
    const global = await call(test, "search_products", { query: "practice" });
    const named = await call(test, "search_products", { query: "practice", seller_handle: "judge_demo" });
    await test.close();
    const visitor = await open(true);
    const ck = await call(visitor, "create_checkout", { items: [{ variant_id: "var_judgemug1000", quantity: 1 }], client_request_id: randomUUID() });
    await visitor.close();
    const row = await q1<{ is_test: boolean }>("select is_test from checkouts where id = $1", [ck.checkout_id]);
    const llms = await (await fetch(`${base}/llms.txt`, { headers: { "x-shopfront-public-view": "1" } })).text();
    const fromJudge = (r: { results: Array<{ seller: { handle: string } }> }) => r.results.filter((x) => x.seller.handle === "judge_demo").length;
    record("T6 judge_demo isolated: not in global search or llms.txt; checkouts is_test without a test header", fromJudge(global) === 0 && fromJudge(named) === 2 && row?.is_test === true && !llms.includes("judge_demo"), {
      globalJudgeResults: fromJudge(global),
      namedJudgeResults: fromJudge(named),
      checkoutIsTest: row?.is_test,
      llmsListsJudge: llms.includes("judge_demo"),
    });
  }
} finally {
  // Remove this run's made-up chats (links only; updates and actions stay as the audit trail).
  await db.query("update telegram_links set revoked_at = now() where chat_id = any($1)", [[CHAT_OWNER, CHAT_OTHER, CHAT_JUDGE].map(String)]);
  await db.end();
}

writeFileSync(join(out, "telegram-backend-results.json"), JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
log(failed.length ? `${failed.length} FAILED` : `ALL ${results.length} PASSED`);
process.exit(failed.length ? 1 : 0);
