import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { ACTION_ID_RE, parseStart } from "@shopfront/core";
import { env } from "@/server/env";
import { claimUpdate, linkChat, linkedSeller, markUpdateProcessed, runChatAction, type TapResult } from "@/server/telegram";
import { esc, send, tg } from "@/server/telegram-api";
import { onMenuTap, onPhoto, onText, welcome } from "@/server/telegram-bot";

export const dynamic = "force-dynamic";

// Telegram webhook (Phase 10, D-082, D-092). Verified by Telegram's secret-token header, deduped on update_id in the
// database, answered 200 at once (Render cold starts, D-076), work in after(). Linking, the five seller jobs (order
// pings and refund approvals are pushed from the payment and refund paths), photo → listing, label → tracking,
// questions, and judge mode. The file URL contains the bot token, so it is never logged or echoed.

type TgPhoto = { file_id: string; file_size?: number; width: number; height: number };
type Update = {
  update_id: number;
  message?: { message_id: number; date: number; chat: { id: number }; text?: string; caption?: string; photo?: TgPhoto[] };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
};

function secretOk(req: Request) {
  const want = Buffer.from(env().TELEGRAM_WEBHOOK_SECRET);
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") ?? "");
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

const NOT_LINKED = "👋 This chat isn't linked to a shop yet.\nSellers: open <b>Connect Telegram</b> in your Shopfront Studio.\nJudges: use the judge-mode link in the README to try a practice shop.";

const TAP_TEXT: Record<Exclude<TapResult, { ok: true }>["reason"], string> = {
  unknown: "That button isn't valid.",
  wrong_chat: "That button isn't valid.",
  wrong_seller: "That button isn't valid.",
  used: "Already done.",
  expired: "That button has expired.",
  unlinked: "Link this chat to your shop first.",
  unavailable: "That action isn't available.",
  failed: "That didn't go through. Nothing was changed by this tap.",
};

async function tapFollowUp(chatId: number, sellerId: string, r: Extract<TapResult, { ok: true }>) {
  const x = r.result as Record<string, string | null | undefined>;
  if (r.kind === "approve_refund") return send(chatId, x.status === "handoff" ? "✅ <b>Refund approved.</b> This shop is paid directly, so send it from your PayPal; I'll mark it done when PayPal confirms." : "✅ <b>Refund approved and sent.</b> PayPal returned the money to the buyer.", { sellerId, kind: "refund_done" });
  if (r.kind === "decline_refund") return send(chatId, "Refund declined. The buyer's agent sees your decision on the order page.", { sellerId, kind: "refund_declined" });
  if (r.kind === "publish") return send(chatId, `🎉 <b>${esc(x.title ?? "Your listing")} is live.</b>\nIn your storefront now, ${x.catalogId ? "mirrored to PayPal's catalog, " : ""}and AI shopping agents can find it over MCP.`, { sellerId, kind: "published", buttons: x.url ? [[{ text: "See it in your shop", url: x.url }]] : undefined });
  if (r.kind === "add_tracking") return send(chatId, `🚚 <b>Tracking added:</b> ${esc(x.carrier ?? "")} ${esc(x.trackingNumber ?? "")}\nIt's on the PayPal order, and the buyer has a note on their order page.`, { sellerId, checkoutId: x.checkoutId ?? undefined, kind: "tracking_added" });
}

async function handle(u: Update) {
  if (u.message) {
    const chat_id = u.message.chat.id;
    const start = u.message.text ? parseStart(u.message.text) : null;
    const link = await linkedSeller(chat_id);
    if (start && !(start.kind === "none" && link)) {
      const r = await linkChat(chat_id, start);
      if (r.ok) return welcome(chat_id, r.sellerId);
      return send(chat_id, r.reason === "expired_or_used" ? "That link has expired or was already used. Make a new one in your Studio." : NOT_LINKED, { kind: "link_failed" });
    }
    if (!link) return send(chat_id, NOT_LINKED, { kind: "not_linked" });
    if (u.message.photo?.length) {
      const biggest = u.message.photo.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
      const file = await tg<{ file_path?: string }>("getFile", { file_id: biggest.file_id });
      const bytes = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${env().TELEGRAM_BOT_TOKEN}/${file.file_path}`)).arrayBuffer());
      return onPhoto(chat_id, link.sellerId, bytes, u.message.caption);
    }
    return onText(chat_id, link.sellerId, u.message.text ?? "");
  }
  if (u.callback_query) {
    const q = u.callback_query;
    const chatId = q.message?.chat.id;
    const data = q.data ?? "";
    if (chatId !== undefined && data.startsWith("m:")) {
      await tg("answerCallbackQuery", { callback_query_id: q.id }).catch(() => {});
      const link = await linkedSeller(chatId);
      if (!link) return send(chatId, NOT_LINKED, { kind: "not_linked" });
      return onMenuTap(chatId, link.sellerId, data);
    }
    const r: TapResult = chatId !== undefined && ACTION_ID_RE.test(data) ? await runChatAction(data, chatId) : { ok: false, reason: "unknown" };
    await tg("answerCallbackQuery", { callback_query_id: q.id, text: r.ok ? "Done" : TAP_TEXT[r.reason] }).catch(() => {});
    if (r.ok && q.message && chatId !== undefined) {
      await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
      const link = await linkedSeller(chatId);
      if (link) await tapFollowUp(chatId, link.sellerId, r);
    } else if (!r.ok && r.reason === "failed" && chatId !== undefined) {
      await send(chatId, `⚠️ ${esc(r.message ?? TAP_TEXT.failed)}`, { kind: "tap_failed" });
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
