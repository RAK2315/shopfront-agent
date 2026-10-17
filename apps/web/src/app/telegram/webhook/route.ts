import { createHash, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

// SPIKE T (PLAN Phase 10, 2026-10-17): proves the four things Phase 10 depends on, on Render, before any build.
//   1 a webhook verified by Telegram's secret-token header   2 a photo downloaded server-side via getFile
//   3 an inline keyboard → callback_query → answerCallbackQuery + editMessageText   4 delivery delay after a cold start
// Nothing is stored and nothing touches sellers, orders or money. The reply shows only sizes, a hash prefix and
// delays. The file URL contains the bot token, so it is never logged or echoed. Phase 10 replaces this route.

const seen = new Set<number>(); // spike only: Phase 10 dedupes on update_id in the telegram_updates table

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

export async function POST(req: Request) {
  if (!env().TELEGRAM_BOT_TOKEN) return new Response("Telegram is not configured", { status: 503 });
  if (!secretOk(req)) return new Response("Unauthorized", { status: 401 });
  const receivedAt = Date.now();
  const u = (await req.json().catch(() => null)) as Update | null;
  if (!u || typeof u.update_id !== "number") return new Response("Bad update", { status: 400 });
  if (seen.has(u.update_id)) return new Response("ok"); // a re-delivery: answered once already
  seen.add(u.update_id);
  console.log("[spike-t] update", u.update_id, u.message?.photo ? "photo" : u.message?.text ? "text" : u.callback_query ? "callback" : "other");

  // Answer 200 at once; the work runs after the response (Render cold starts, Telegram's retry on non-2xx).
  after(async () => {
    try {
      if (u.message) {
        const chat_id = u.message.chat.id;
        const delayS = Math.round(receivedAt / 1000 - u.message.date);
        if (u.message.photo?.length) {
          const t0 = Date.now();
          const sent = await tg<{ message_id: number }>("sendMessage", { chat_id, text: "Reading your photo…" });
          const biggest = u.message.photo.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
          const file = await tg<{ file_path?: string; file_size?: number }>("getFile", { file_id: biggest.file_id });
          const bytes = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${env().TELEGRAM_BOT_TOKEN}/${file.file_path}`)).arrayBuffer());
          const sha = createHash("sha256").update(bytes).digest("hex");
          await tg("editMessageText", {
            chat_id,
            message_id: sent.message_id,
            text: `Spike T: photo downloaded server-side\n${biggest.width}×${biggest.height} · ${Math.round(bytes.length / 1024)} KB · sha256 ${sha.slice(0, 12)}…\nDelivered ${delayS} s after you sent it · handled in ${Date.now() - t0} ms`,
            reply_markup: { inline_keyboard: [[{ text: "Confirm $32", callback_data: `spk_confirm_${u.update_id}` }, { text: "Discard", callback_data: `spk_discard_${u.update_id}` }]] },
          });
        } else {
          await tg("sendMessage", { chat_id, text: `Spike T: got your message. Delivered ${delayS} s after you sent it (update ${u.update_id}).` });
        }
      } else if (u.callback_query) {
        const q = u.callback_query;
        const confirm = q.data?.startsWith("spk_confirm_");
        await tg("answerCallbackQuery", { callback_query_id: q.id, text: confirm ? "Confirmed (spike: nothing published)" : "Discarded" });
        if (q.message) {
          await tg("editMessageText", {
            chat_id: q.message.chat.id,
            message_id: q.message.message_id,
            text: confirm ? "✓ Confirmed · spike only, nothing was published" : "Discarded · spike only",
          });
        }
      }
    } catch (e) {
      console.log("[spike-t] error", u.update_id, e instanceof Error ? e.message.replace(/bot[0-9]+:[A-Za-z0-9_-]+/g, "bot<redacted>") : "unknown");
    }
  });
  return new Response("ok");
}
