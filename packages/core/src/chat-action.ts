// Phase 10 (D-072, PLAN 10.4): every catalog or money change from Telegram is a tap on a single-use, seller-scoped,
// expiring action row created by deterministic code. The button carries only the action id (64-byte callback_data);
// this check decides whether a tap may run. The caller then runs it under a row lock and marks it used.

export const ACTION_ID_RE = /^tga_[a-z0-9]{12}$/;
export const CHAT_ACTION_TTL_MS = 24 * 60 * 60 * 1000;

export type ChatActionKind = 'confirm_price' | 'publish' | 'add_tracking' | 'approve_refund' | 'decline_refund';

export interface ChatAction {
  id: string;
  sellerId: string;
  chatId: number;
  kind: ChatActionKind;
  expiresAt: Date;
  usedAt: Date | null;
}

export type ChatActionCheck = { ok: true } | { ok: false; reason: 'unknown' | 'wrong_chat' | 'wrong_seller' | 'used' | 'expired' };

/** Ownership first, so a forged tap from another chat learns nothing about the action's state. */
export function checkChatAction(action: ChatAction | null, tap: { chatId: number; sellerId: string; now: Date }): ChatActionCheck {
  if (!action) return { ok: false, reason: 'unknown' };
  if (action.chatId !== tap.chatId) return { ok: false, reason: 'wrong_chat' };
  if (action.sellerId !== tap.sellerId) return { ok: false, reason: 'wrong_seller' };
  if (action.usedAt) return { ok: false, reason: 'used' };
  if (tap.now.getTime() >= action.expiresAt.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true };
}
