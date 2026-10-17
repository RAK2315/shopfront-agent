import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { ACTION_ID_RE, parseStart } from "@shopfront/core";
import { env } from "@/server/env";
import { claimUpdate, linkChat, linkedSeller, markUpdateProcessed, runChatAction, type TapResult } from "@/server/telegram";

export const dynamic = "force-dynamic";

// Telegram webhook (PLAN Phase 10; replaces the Spike T route, D-076). Verified by Telegram's secret-token header,
// deduped on update_id in the database, answered 200 at once (Render cold starts, D-076), work in after().
// So far: linking (/start <code>, /start judge) and button taps through the action executor. The five seller jobs
// (photo → listing, order pings, label → tracking, refund approval, questions) arrive in the Phase 10 build.
// The file URL contains the bot token, so it is never logged or echoed.

type TgPhoto = { file_id: string; file_size?: number; width: number; height: number };
type Update = {
  update_id: number;
  message?: { message_id: number; date: number; chat: { id: number }; text?: string; photo?: TgPhoto[] };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
};

async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as { ok: boolean; result?: T; description?: string };
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description ?? r.status}`);
  return j.result as T;
}

function secretOk(req: Request) {
  const want = Buffer.from(env().TELEGRAM_WEBHOOK_SECRET);
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

const NOT_LINKED = "This chat isn't linked to a shop yet. Open the Connect Telegram link in your Shopfront Studio, or the judge-mode link in the README.";

const TAP_TEXT: Record<Exclude<TapResult, { ok: true }>["reason"], string> = {
  unknown: "That button isn't valid.",
  wrong_chat: "That button isn't valid.",
  wrong_seller: "That button isn't valid.",
  used: "Already done.",
  expired: "That button has expired.",
  unlinked: "Link this chat to your shop first.",
  unavailable: "That action isn't available yet.",
  failed: "That didn't go through. Nothing was changed by this tap.",
};

async function handle(u: Update) {
  if (u.message) {
    const chat_id = u.message.chat.id;
    const start = u.message.text ? parseStart(u.message.text) : null;
    const link = await linkedSeller(chat_id);
    if (start && !(start.kind === "none" && link)) {
      const r = await linkChat(chat_id, start);
      const text = r.ok
        ? `Linked to ${r.displayName}${r.isDemo ? " (judge mode: an isolated demo shop, sandbox only)" : ""}. Order pings, refund approvals and photo listings will arrive here.`
        : r.reason === "expired_or_used"
          ? "That link has expired or was already used. Make a new one in your Studio."
          : NOT_LINKED;
      await tg("sendMessage", { chat_id, text });
      return;
    }
    if (!link) {
      await tg("sendMessage", { chat_id, text: NOT_LINKED });
      return;
    }
    if (u.message.photo?.length) {
      // Proven in Spike T: the photo is downloaded server-side. Listings from photos arrive in the Phase 10 build.
      const biggest = u.message.photo.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
      const file = await tg<{ file_path?: string }>("getFile", { file_id: biggest.file_id });
      const bytes = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${env().TELEGRAM_BOT_TOKEN}/${file.file_path}`)).arrayBuffer());
      const sha = createHash("sha256").update(bytes).digest("hex");
      await tg("sendMessage", { chat_id, text: `Got your photo (${biggest.width}×${biggest.height}, sha256 ${sha.slice(0, 12)}…). Listings from photos are coming soon.` });
      return;
    }
    await tg("sendMessage", { chat_id, text: "Got it. Questions and listings from photos are coming soon; order pings and refund approvals will arrive here." });
    return;
  }
  if (u.callback_query) {
    const q = u.callback_query;
    const chatId = q.message?.chat.id;
    const data = q.data ?? "";
    const r: TapResult = chatId !== undefined && ACTION_ID_RE.test(data) ? await runChatAction(data, chatId) : { ok: false, reason: "unknown" };
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: r.ok ? "Done" : TAP_TEXT[r.reason] });
    if (r.ok && q.message) {
      const what = r.kind === "approve_refund" ? "Refund approved" : r.kind === "decline_refund" ? "Refund declined" : "Done";
      await tg("editMessageReplyMarkup", { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
      await tg("sendMessage", { chat_id: q.message.chat.id, text: `✓ ${what}` });
    }
  }
}

export async function POST(req: Request) {
  if (!env().TELEGRAM_BOT_TOKEN) return new Response("Telegram is not configured", { status: 503 });
  if (!secretOk(req)) return new Response("Unauthorized", { status: 401 });
  const u = (await req.json().catch(() => null)) as Update | null;
  if (!u || typeof u.update_id !== "number") return new Response("Bad update", { status: 400 });
  if (!(await claimUpdate(u.update_id))) return new Response("ok"); // a re-delivery: processed once already
  after(async () => {
    try {
      await handle(u);
    } catch (e) {
      console.log("[telegram] error", u.update_id, e instanceof Error ? e.message.replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, "bot<redacted>") : "unknown");
    } finally {
      await markUpdateProcessed(u.update_id).catch(() => {});
    }
  });
  return new Response("ok");
}
