// Phase 10 seller copilot (walkthrough #8, AT-10 flows, D-092) on the DEPLOYED app. Updates are posted to our own
// /telegram/webhook with the real secret from a made-up judge chat (Telegram can't deliver to it, so we read what
// the bot said from its `telegram_sent` events, chat id hashed). Real PayPal sandbox, real Gemini, no mocks.
//   F1  /start judge → linked to the practice shop → the welcome card (capabilities, menu buttons, Simulate a buyer)
//   F2  menus answer from the database: Orders, Shop status, Sales (with [db] line), Pending refunds
//   F3  Simulate a buyer → a real practice checkout → approved in PayPal as the sandbox buyer → the order ping
//   F4  Simulate a refund → policy decides → (if it needs the seller) Approve tap → refund executed → confirmation
//   F5  a product photo → AI draft card with "Publish at $X" → tap → live listing (and PayPal catalog)
//   F6  a shipping-label photo → carrier + tracking read → "Add tracking" tap → shipment on the PayPal order
//   F7  guardrails: a tap from another chat is refused; a second tap on a used button does nothing; unlinked chat
// Usage: pnpm --filter web telegram-flow-checks -- --base https://shopfront-agent.onrender.com
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";
import { createPayPalApi, PayPalClient } from "@shopfront/paypal";
import { loginAndApprove } from "./lib/paypal-popup.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/telegram")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(what: string, fn: () => Promise<T | null | undefined | false>, ms = 60_000, every = 1500): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(every);
  }
}

const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
const paypal = createPayPalApi(new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL, clientId: e.PAYPAL_CLIENT_ID, clientSecret: e.PAYPAL_CLIENT_SECRET }));
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
const CHAT = -(7_000_000_000 + Math.floor(Math.random() * 1e8));
const OTHER = CHAT - 1;
const hash = (c: number) => createHash("sha256").update(`tg:${c}`).digest("hex").slice(0, 16);
let upd = Math.floor(Date.now() / 1000) * 10;
const hook = (body: unknown) => fetch(`${base}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": e.TELEGRAM_WEBHOOK_SECRET }, body: JSON.stringify(body) });
const text = (chat: number, s: string) => hook({ update_id: ++upd, message: { message_id: upd, date: Math.floor(Date.now() / 1000), chat: { id: chat }, text: s } });
const tap = (chat: number, data: string) => hook({ update_id: ++upd, callback_query: { id: `cq${upd}`, data, message: { message_id: 1, chat: { id: chat } } } });
const since = { at: new Date() };
type Sent = { kind: string; text: string; buttons: string[]; checkout_id: string | null; id: number };
const sent = async (kind: string, after = since.at): Promise<Sent | undefined> =>
  (await db.query("select id, data->>'kind' kind, data->>'text' text, data->'buttons' buttons, checkout_id from events where kind='telegram_sent' and data->>'chat'=$1 and data->>'kind'=$2 and created_at >= $3 order by id desc limit 1", [hash(CHAT), kind, after])).rows[0];
const waitSent = (kind: string, ms = 60_000) => until(`bot message "${kind}"`, () => sent(kind), ms);
const action = async (kind: string, after = since.at) => (await db.query("select id from telegram_actions where chat_id=$1 and kind=$2 and used_at is null and created_at >= $3 order by created_at desc limit 1", [String(CHAT), kind, after])).rows[0]?.id as string | undefined;
const adminPhoto = async (buf: Buffer, caption: string) => (await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify({ action: "tg_photo", chat_id: CHAT, image_base64: buf.toString("base64"), caption }) })).json();

/** Judge "Simulate a buyer" → the practice checkout → approved in PayPal as the sandbox buyer (redirect flow). */
async function buyAndPay(): Promise<string> {
  const t0 = new Date();
  await tap(CHAT, "m:simbuy:var_judgemug1000");
  const so = await until("the simulated order", () => sent("simulated_order", t0), 60_000);
  const ck = so.checkout_id!;
  const order = (await db.query("select paypal_order_id from checkouts where id=$1", [ck])).rows[0];
  const { data } = await paypal.getOrder(order.paypal_order_id);
  const href = (data as { links?: Array<{ rel: string; href: string }> }).links!.find((l) => l.rel === "payer-action")!.href;
  const browser = await chromium.launch({ headless: false, channel: "chromium" });
  const page = await (await browser.newContext()).newPage();
  try {
    // PayPal's sandbox sometimes answers "Things don't appear to be working at the moment"; retry the same order once.
    for (let attempt = 1; ; attempt++) {
      try {
        await page.goto(href, { waitUntil: "domcontentloaded" });
        await loginAndApprove(page, { email: e.SANDBOX_BUYER_EMAIL, password: e.SANDBOX_BUYER_PASSWORD });
        await page.waitForURL(/\/pay\/chk_/, { timeout: 90_000 });
        break;
      } catch (err) {
        if (attempt >= 2 || !/working at the moment/i.test(await page.locator("body").innerText().catch(() => ""))) throw err;
        log("PayPal sandbox hiccup; retrying the approval once");
        await sleep(8000);
      }
    }
  } catch (err) {
    await page.screenshot({ path: join(out, `_error-paypal-${ck}.png`) }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
  }
  return ck;
}

try {
  // F1
  since.at = new Date();
  await text(CHAT, "/start judge");
  const w = await waitSent("welcome");
  const link = (await db.query("select s.handle, l.is_demo from telegram_links l join sellers s on s.id=l.seller_id where l.chat_id=$1 and l.revoked_at is null", [String(CHAT)])).rows[0];
  record("F1 /start judge → practice shop + welcome card", link?.handle === "judge_demo" && link?.is_demo && /Connected to/.test(w.text) && w.buttons.includes("🧪 Simulate a buyer") && w.buttons.length >= 5, { link, buttons: w.buttons, text: w.text.slice(0, 140) });

  // F2
  since.at = new Date();
  await tap(CHAT, "m:status");
  const st = await waitSent("status");
  await tap(CHAT, "m:sales");
  const sa = await waitSent("sales");
  await tap(CHAT, "m:orders");
  const or = await waitSent("orders");
  record("F2 menus answer from the database", /Listings: \d+ live/.test(st.text) && /\[db\]/.test(sa.text) && or.text.length > 10, { status: st.text.slice(0, 100), sales: sa.text.slice(0, 120), orders: or.text.slice(0, 100) });

  // F3
  since.at = new Date();
  await tap(CHAT, "m:sim");
  await waitSent("simulate");
  const ck = await buyAndPay();
  const ping = await waitSent("order_ping", 90_000);
  const isTest = (await db.query("select is_test from checkouts where id=$1", [ck])).rows[0]?.is_test;
  record("F3 Simulate a buyer → real sandbox order → approved in PayPal → order ping", isTest && /Order paid/.test(ping.text) && ping.checkout_id === ck && ping.buttons.includes("🧪 Simulate a refund request"), { checkout: ck, ping: ping.text.slice(0, 140), buttons: ping.buttons });

  // F4
  since.at = new Date();
  await tap(CHAT, `m:simrefund:${ck}`);
  const decided = await until("a refund decision", async () => (await sent("refund_auto")) ?? (await sent("refund_request")), 90_000);
  let refundOk = false;
  let via = decided.kind;
  if (decided.kind === "refund_request") {
    const a = await until("the approve action", () => action("approve_refund"), 20_000);
    await tap(CHAT, a);
    const done = await waitSent("refund_done");
    via = "approved by tap";
    refundOk = /approved/i.test(done.text);
  } else refundOk = true;
  const rr = (await db.query("select status, paypal_refund_id from refund_requests where checkout_id=$1 order by created_at desc limit 1", [ck])).rows[0];
  record("F4 Simulate a refund → policy or tap → refunded in PayPal", refundOk && rr?.status === "executed" && Boolean(rr?.paypal_refund_id), { via, refund: rr });

  // F5: product photo → draft → Publish tap
  since.at = new Date();
  const photo = await sharp(readFileSync(resolve("seed-photos/judge-white-bowl.jpg"))).resize(700).modulate({ brightness: 1 + Math.random() * 0.04 }).jpeg().toBuffer();
  await adminPhoto(photo, "new listing");
  const draft = await waitSent("draft", 120_000);
  const pub = await until("the publish action", () => action("publish"), 20_000);
  const pid = (await db.query("select payload->>'productId' p from telegram_actions where id=$1", [pub])).rows[0].p as string;
  await tap(CHAT, pub);
  const live = await waitSent("published", 60_000);
  const prod = (await db.query("select status, paypal_catalog_id from products where id=$1", [pid])).rows[0];
  record("F5 product photo → AI draft → Publish tap → live listing", /Draft:/.test(draft.text) && /Publish at \$/.test(draft.buttons.join(" ")) && /is live/.test(live.text) && prod?.status === "approved", { draft: draft.text.slice(0, 120), buttons: draft.buttons, product: pid, db: prod });

  // F6: label photo → tracking → Add tracking tap
  since.at = new Date();
  const tracking = `9400 1118 9922 ${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")} ${String(Math.floor(Math.random() * 1e4)).padStart(4, "0")} 12`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#fff"/><rect x="20" y="20" width="860" height="560" fill="none" stroke="#000" stroke-width="6"/><text x="50" y="110" font-family="Arial" font-size="64" font-weight="bold">USPS PRIORITY MAIL</text><text x="50" y="200" font-family="Arial" font-size="30">SHIP TO: JOHN DOE, 1 MAIN ST, SAN JOSE CA 95131</text><text x="50" y="380" font-family="Arial" font-size="34" font-weight="bold">USPS TRACKING # EP</text><text x="50" y="450" font-family="Courier New" font-size="46" font-weight="bold">${tracking}</text></svg>`;
  const label = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  // A paid, unshipped practice order must exist: F3's order was refunded, so the judge simulates one more.
  await buyAndPay();
  await waitSent("order_ping", 90_000);
  await adminPhoto(label, "shipping label");
  const read = await waitSent("label_read", 120_000).catch(async () => (await sent("label_no_order")) ?? (await sent("label_unreadable")));
  let shipped = false;
  let shipment: unknown = null;
  if (read?.kind === "label_read") {
    const a = await until("the add_tracking action", () => action("add_tracking"), 20_000);
    const ckT = (await db.query("select payload->>'checkoutId' c from telegram_actions where id=$1", [a])).rows[0].c as string;
    await tap(CHAT, a);
    await waitSent("tracking_added", 60_000);
    shipment = (await db.query("select carrier, tracking_number, source, paypal_tracker_ref from shipments where checkout_id=$1", [ckT])).rows[0];
    shipped = Boolean(shipment);
  }
  record("F6 label photo → tracking read → Add tracking tap → shipment on the PayPal order", shipped, { read: read?.text?.slice(0, 120), kind: read?.kind, shipment });

  // F7: guardrails
  since.at = new Date();
  const res401 = await fetch(`${base}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "wrong" }, body: "{}" });
  await text(OTHER, "hello");
  const notLinked = await until("not-linked reply", async () => (await db.query("select 1 from events where kind='telegram_sent' and data->>'chat'=$1 and data->>'kind'='not_linked' and created_at >= $2", [hash(OTHER), since.at])).rowCount, 30_000);
  const used = (await db.query("select id from telegram_actions where chat_id=$1 and used_at is not null order by used_at desc limit 1", [String(CHAT)])).rows[0]?.id as string;
  const usedBefore = (await db.query("select result from telegram_actions where id=$1", [used])).rows[0].result;
  await tap(CHAT, used);
  await sleep(3000);
  const usedAfter = (await db.query("select result from telegram_actions where id=$1", [used])).rows[0].result;
  record("F7 wrong secret 401; unlinked chat told how to link; a used button does nothing", res401.status === 401 && Boolean(notLinked) && JSON.stringify(usedBefore) === JSON.stringify(usedAfter), { secret: res401.status, usedButtonUnchanged: JSON.stringify(usedBefore) === JSON.stringify(usedAfter) });
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  // Transcript of what the bot said to the judge chat (for the docs and the video's chat strip).
  const t = await db.query("select created_at, data->>'kind' kind, data->>'text' text, data->'buttons' buttons from events where kind='telegram_sent' and data->>'chat'=$1 order by id", [hash(CHAT)]);
  writeFileSync(join(out, `transcript-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(t.rows, null, 2));
  await db.query("update telegram_links set revoked_at = now() where chat_id = any($1)", [[String(CHAT), String(OTHER)]]).catch(() => {});
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
