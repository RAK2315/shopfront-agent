// Money is always integer minor units (cents) + ISO currency. Never floats.

export const SUPPORTED_CURRENCIES = ['USD'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface Money {
  value: string; // PayPal wire format, e.g. "28.00"
  currency_code: Currency;
}

const VALUE_RE = /^(0|[1-9]\d{0,9})(?:\.(\d{2}))?$/;

export function assertCents(cents: number): void {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`Invalid cents amount: ${cents}`);
  }
}

export function centsToValue(cents: number): string {
  assertCents(cents);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `${whole}.${frac.toString().padStart(2, '0')}`;
}

export function valueToCents(value: string): number {
  const m = VALUE_RE.exec(value);
  if (!m) throw new RangeError(`Invalid money value: "${value}"`);
  return Number(m[1]) * 100 + Number(m[2] ?? '0');
}

export function money(cents: number, currency: Currency = 'USD'): Money {
  return { value: centsToValue(cents), currency_code: currency };
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((acc, v) => {
    assertCents(v);
    return acc + v;
  }, 0);
}
