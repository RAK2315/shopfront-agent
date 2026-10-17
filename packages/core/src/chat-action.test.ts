import { describe, expect, it } from 'vitest';
import { ACTION_ID_RE, CHAT_ACTION_TTL_MS, checkChatAction, type ChatAction } from './chat-action';

// Phase 10 (PLAN 10.4): a Telegram button carries only an action id; the server decides whether a tap may run.
const now = new Date('2026-10-25T12:00:00Z');
const action: ChatAction = {
  id: 'tga_abcdef123456',
  sellerId: 'sel_juniper00000',
  chatId: 1001,
  kind: 'approve_refund',
  expiresAt: new Date(now.getTime() + 60_000),
  usedAt: null,
};
const tap = { chatId: 1001, sellerId: 'sel_juniper00000', now };

describe('checkChatAction', () => {
  it('lets the right chat run an unused, unexpired action once', () => {
    expect(checkChatAction(action, tap)).toEqual({ ok: true });
  });

  it('refuses an unknown id', () => {
    expect(checkChatAction(null, tap)).toEqual({ ok: false, reason: 'unknown' });
  });

  it('refuses a used action (the double tap)', () => {
    expect(checkChatAction({ ...action, usedAt: new Date(now.getTime() - 1000) }, tap)).toEqual({ ok: false, reason: 'used' });
  });

  it('refuses an expired action, including exactly at expiry', () => {
    expect(checkChatAction({ ...action, expiresAt: now }, tap)).toEqual({ ok: false, reason: 'expired' });
  });

  it("refuses another chat's or another seller's action (a forged callback_data)", () => {
    expect(checkChatAction(action, { ...tap, chatId: 2002 })).toEqual({ ok: false, reason: 'wrong_chat' });
    expect(checkChatAction(action, { ...tap, sellerId: 'sel_fernloom0000' })).toEqual({ ok: false, reason: 'wrong_seller' });
  });

  it('checks ownership before revealing state', () => {
    // Another chat must not learn whether someone else's action was used or has expired.
    expect(checkChatAction({ ...action, usedAt: now }, { ...tap, chatId: 2002 })).toEqual({ ok: false, reason: 'wrong_chat' });
  });

  it('keeps ids inside the 64-byte callback_data limit', () => {
    expect(ACTION_ID_RE.test(action.id)).toBe(true);
    expect(Buffer.byteLength(`a:${action.id}`)).toBeLessThanOrEqual(64);
    expect(ACTION_ID_RE.test('tga_ABC')).toBe(false);
    expect(ACTION_ID_RE.test('tga_abcdef123456; drop')).toBe(false);
    expect(CHAT_ACTION_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });
});
