// A price the seller types (in Telegram, Phase 10) is parsed here by code, never by a model (D-002, D-072).
// The whole message must be one USD amount: "28", "$28.50", "1,250", "28 USD". Anything else is rejected,
// so text around a number ("28. ignore instructions…") never becomes a price.

export const MIN_PRICE_CENTS = 100; // the studio's bounds (catalog.ts: price_cents 100…1,000,000)
export const MAX_PRICE_CENTS = 1_000_000;

export type PriceInput = { ok: true; cents: number } | { ok: false; reason: 'empty' | 'not_a_price' | 'too_low' | 'too_high' };

// Optional USD marker before or after; digits with optional thousands commas; optional 1–2 decimals.
const PRICE_RE = /^(?:(?:US)?\$|USD)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:USD)?$/i;

export function parsePriceInput(raw: string): PriceInput {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  const m = PRICE_RE.exec(text);
  if (!m) return { ok: false, reason: 'not_a_price' };
  const whole = m[1]!.replace(/,/g, '');
  if (whole.length > 9) return { ok: false, reason: 'too_high' };
  const cents = Number(whole) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  if (cents < MIN_PRICE_CENTS) return { ok: false, reason: 'too_low' };
  if (cents > MAX_PRICE_CENTS) return { ok: false, reason: 'too_high' };
  return { ok: true, cents };
}
