import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ACTION_ID_RE, CHAT_ACTION_TTL_MS, checkChatAction, LINK_CODE_TTL_MS, newId, type ChatActionCheck, type ChatActionKind, type StartPayload } from "@shopfront/core";
import { and, eq, gt, isNull, schema } from "@shopfront/db";
import { env } from "./env";
import { recordEvent } from "./events";
import { decideRefundAsSeller } from "./refunds";
import { services } from "./services";

// Phase 10 backend (D-072, PLAN Phase 10): exactly-once updates, one-time linking, and the button-action executor.
// The chat model never moves money (D-002): every catalog or money change is a tap on an action row made here by code.

export const JUDGE_SELLER_HANDLE = "judge_demo";

/** Claim a Telegram update once, in the database (Telegram re-delivers on any non-2xx, and after a cold start). */
export async function claimUpdate(updateId: number): Promise<boolean> {
  const { db } = services();
  const inserted = await db.insert(schema.telegramUpdates).values({ updateId: String(updateId) }).onConflictDoNothing().returning({ id: schema.telegramUpdates.updateId });
  return inserted.length === 1;
}

export async function markUpdateProcessed(updateId: number) {
  const { db } = services();
  await db.update(schema.telegramUpdates).set({ processedAt: new Date() }).where(eq(schema.telegramUpdates.updateId, String(updateId)));
}

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

/** A one-time link code for the seller's Studio card. Only its hash is stored; it lasts 10 minutes. */
export async function createLinkCode(sellerId: string, now = new Date()) {
  const { db } = services();
  const code = randomBytes(18).toString("base64url"); // 24 chars of [A-Za-z0-9_-]
  const expiresAt = new Date(now.getTime() + LINK_CODE_TTL_MS);
  await db.insert(schema.telegramLinkCodes).values({ codeHash: hashCode(code), sellerId, expiresAt });
  const bot = await botUsername();
  return { code, expiresAt, deepLink: bot ? `https://t.me/${bot}?start=${code}` : null };
}

let username: string | null = null;
/** The bot's @username from getMe (cached), so the deep link never hard-codes it. */
async function botUsername(): Promise<string | null> {
  if (username) return username;
  if (!env().TELEGRAM_BOT_TOKEN) return null;
  const r = await fetch(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/getMe`);
  const j = (await r.json().catch(() => null)) as { ok?: boolean; result?: { username?: string } } | null;
  username = j?.ok ? (j.result?.username ?? null) : null;
  return username;
}

export type LinkResult = { ok: true; sellerId: string; displayName: string; isDemo: boolean } | { ok: false; reason: "invalid" | "expired_or_used" | "no_judge_seller" };

/** `/start <code>` or `/start judge`. A code is single use and expires; judge mode links to the isolated demo seller. */
export async function linkChat(chatId: number, start: StartPayload, now = new Date()): Promise<LinkResult> {
  const { db } = services();
  let sellerId: string;
  let isDemo = false;
  if (start.kind === "judge") {
    const [s] = await db.select({ id: schema.sellers.id, testOnly: schema.sellers.testOnly }).from(schema.sellers).where(eq(schema.sellers.handle, JUDGE_SELLER_HANDLE));
    if (!s?.testOnly) return { ok: false, reason: "no_judge_seller" }; // never link judges to a real seller
    sellerId = s.id;
    isDemo = true;
  } else if (start.kind === "code") {
    const [used] = await db
      .update(schema.telegramLinkCodes)
      .set({ usedAt: now })
      .where(and(eq(schema.telegramLinkCodes.codeHash, hashCode(start.code)), isNull(schema.telegramLinkCodes.usedAt), gt(schema.telegramLinkCodes.expiresAt, now)))
      .returning({ sellerId: schema.telegramLinkCodes.sellerId });
    if (!used) return { ok: false, reason: "expired_or_used" };
    sellerId = used.sellerId;
  } else {
    return { ok: false, reason: "invalid" };
  }
  await db
    .insert(schema.telegramLinks)
    .values({ chatId: String(chatId), sellerId, isDemo, linkedAt: now })
    .onConflictDoUpdate({ target: schema.telegramLinks.chatId, set: { sellerId, isDemo, linkedAt: now, revokedAt: null } });
  const [s] = await db.select({ displayName: schema.sellers.displayName }).from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  // Account plumbing, not a shop event: kept off public views (like the boot row, D-076).
  await recordEvent(db, { actor: "seller", kind: "telegram_linked", sellerId, summary: `Telegram chat linked${isDemo ? " (judge mode)" : ""}`, data: { isDemo }, isTest: true });
  return { ok: true, sellerId, displayName: s?.displayName ?? "", isDemo };
}

/** The seller a chat acts for, or null if the chat isn't linked (or the link was revoked). */
export async function linkedSeller(chatId: number) {
  const { db } = services();
  const [l] = await db
    .select({ sellerId: schema.telegramLinks.sellerId, isDemo: schema.telegramLinks.isDemo })
    .from(schema.telegramLinks)
    .where(and(eq(schema.telegramLinks.chatId, String(chatId)), isNull(schema.telegramLinks.revokedAt)));
  return l ?? null;
}

/** Payloads hold ids only (never an amount: the server function recomputes everything, D-002). */
type Payloads = {
  approve_refund: { refundRequestId: string };
  decline_refund: { refundRequestId: string };
  confirm_price: { productId: string };
  publish: { productId: string };
  add_tracking: { checkoutId: string; shipmentDraftId: string };
};

/** Made by deterministic code only (an order ping, a refund needing approval, a draft card), never by a model. */
export async function createChatAction<K extends ChatActionKind>(a: { sellerId: string; chatId: number; kind: K; payload: Payloads[K]; ttlMs?: number }, now = new Date()) {
  const { db } = services();
  const id = newId("telegramAction");
  const expiresAt = new Date(now.getTime() + (a.ttlMs ?? CHAT_ACTION_TTL_MS));
  await db.insert(schema.telegramActions).values({ id, sellerId: a.sellerId, chatId: String(a.chatId), kind: a.kind, payload: a.payload, expiresAt });
  return { id, expiresAt };
}

type Handler = (sellerId: string, payload: Record<string, string>) => Promise<Record<string, unknown>>;
const HANDLERS: Partial<Record<ChatActionKind, Handler>> = {
  approve_refund: async (sellerId, p) => {
    const r = await decideRefundAsSeller(sellerId, p.refundRequestId!, true);
    return { refundRequestId: p.refundRequestId, status: r.status };
  },
  decline_refund: async (sellerId, p) => {
    const r = await decideRefundAsSeller(sellerId, p.refundRequestId!, false);
    return { refundRequestId: p.refundRequestId, status: r.status };
  },
  // confirm_price, publish and add_tracking are wired in the Phase 10 build (Oct 25–29) to the same server
  // functions the web studio uses; until then a tap on one is refused as unavailable.
};

export type TapResult = { ok: true; kind: ChatActionKind; result: Record<string, unknown> } | { ok: false; reason: Exclude<ChatActionCheck, { ok: true }>["reason"] | "unlinked" | "unavailable" | "failed"; message?: string };

/**
 * A button tap. The callback_data is only an action id; we check it against the tapping chat's linked seller
 * (ownership first, so a forged tap learns nothing), then claim it with a compare-and-set so a double tap runs the
 * handler exactly once (D-014's money paths add their own row lock and PayPal-Request-Id underneath).
 */
export async function runChatAction(actionId: string, chatId: number, now = new Date()): Promise<TapResult> {
  if (!ACTION_ID_RE.test(actionId)) return { ok: false, reason: "unknown" };
  const link = await linkedSeller(chatId);
  if (!link) return { ok: false, reason: "unlinked" };
  const { db } = services();
  const [row] = await db.select().from(schema.telegramActions).where(eq(schema.telegramActions.id, actionId));
  const check = checkChatAction(row ? { ...row, chatId: Number(row.chatId), kind: row.kind as ChatActionKind } : null, { chatId, sellerId: link.sellerId, now });
  if (!check.ok) return check;
  const kind = row!.kind as ChatActionKind;
  const handler = HANDLERS[kind];
  if (!handler) return { ok: false, reason: "unavailable" };
  const claimed = await db
    .update(schema.telegramActions)
    .set({ usedAt: now })
    .where(and(eq(schema.telegramActions.id, actionId), isNull(schema.telegramActions.usedAt), gt(schema.telegramActions.expiresAt, now)))
    .returning({ id: schema.telegramActions.id });
  if (!claimed.length) return { ok: false, reason: "used" };
  try {
    const result = await handler(link.sellerId, row!.payload);
    await db.update(schema.telegramActions).set({ result: { ok: true, ...result } }).where(eq(schema.telegramActions.id, actionId));
    return { ok: true, kind, result };
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 200) : "failed";
    await db.update(schema.telegramActions).set({ result: { ok: false, error: message } }).where(eq(schema.telegramActions.id, actionId));
    return { ok: false, reason: "failed", message };
  }
}
