import "server-only";
import { createHash } from "node:crypto";
import { and, eq, isNull, schema } from "@shopfront/db";
import { env } from "./env";
import { recordEvent } from "./events";
import { services } from "./services";

// Outbound Telegram (Phase 10, D-092). Messages use Telegram HTML; buttons carry an action id (money and catalog
// changes, D-072) or a read-only menu key ("m:…"). Every send is logged as a `telegram_sent` event (the chat id is
// hashed, the text kept short), so the live wire shows the seller copilot at work and the ATs can check what the bot
// said even to a made-up chat. The bot token is never logged.

export type Button = { text: string; data?: string; url?: string };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = (await r.json()) as { ok: boolean; result?: T; description?: string };
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description ?? r.status}`);
  return j.result as T;
}

export const chatHash = (chatId: number | string) => createHash("sha256").update(`tg:${chatId}`).digest("hex").slice(0, 16);
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Send one message (optionally with a photo) and log it. Never throws: a dead chat must not break a sale. */
export async function send(
  chatId: number,
  html: string,
  o: { buttons?: Button[][]; photoUrl?: string; sellerId?: string; checkoutId?: string; kind?: string; isTest?: boolean } = {},
): Promise<boolean> {
  const reply_markup = o.buttons?.length ? { inline_keyboard: o.buttons.map((row) => row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }))) } : undefined;
  let ok = true;
  try {
    if (o.photoUrl) await tg("sendPhoto", { chat_id: chatId, photo: o.photoUrl, caption: html.slice(0, 1000), parse_mode: "HTML", reply_markup });
    else await tg("sendMessage", { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true, reply_markup });
  } catch {
    ok = false;
  }
  await recordEvent(services().db, {
    actor: "ops_agent",
    kind: "telegram_sent",
    sellerId: o.sellerId ?? null,
    checkoutId: o.checkoutId ?? null,
    summary: `Telegram · ${o.kind ?? "message"} sent to the seller${ok ? "" : " (chat unreachable)"}`,
    data: { chat: chatHash(chatId), kind: o.kind ?? "message", text: plain(html).slice(0, 280), buttons: o.buttons?.flat().map((b) => b.text) ?? [], delivered: ok },
    isTest: o.isTest,
  }).catch(() => {});
  return ok;
}

/** Every chat linked to a seller (a judge-mode shop can have several judges' chats). */
export async function chatsFor(sellerId: string): Promise<number[]> {
  const rows = await services()
    .db.select({ chatId: schema.telegramLinks.chatId })
    .from(schema.telegramLinks)
    .where(and(eq(schema.telegramLinks.sellerId, sellerId), isNull(schema.telegramLinks.revokedAt)));
  return rows.map((r) => Number(r.chatId));
}
