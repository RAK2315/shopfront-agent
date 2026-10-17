// Phase 10 linking (PLAN "Linking", D-072): a Telegram chat is tied to a seller only through a one-time code from
// the seller's Studio (deep link t.me/<bot>?start=<code>), or to the isolated judge seller through `start=judge`.

/** Telegram deep-link payloads allow A-Z, a-z, 0-9, _ and -, up to 64 characters. */
export const LINK_CODE_RE = /^[A-Za-z0-9_-]{20,64}$/;
export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const JUDGE_START = 'judge';

export type StartPayload = { kind: 'code'; code: string } | { kind: 'judge' } | { kind: 'none' } | { kind: 'invalid' };

/** Parse a `/start` message (optionally `/start@botname`). Returns null for any other message. */
export function parseStart(text: string): StartPayload | null {
  const m = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(.*))?$/.exec(text.trim());
  if (!m) return null;
  const payload = (m[1] ?? '').trim();
  if (!payload) return { kind: 'none' };
  if (payload === JUDGE_START) return { kind: 'judge' };
  return LINK_CODE_RE.test(payload) ? { kind: 'code', code: payload } : { kind: 'invalid' };
}
