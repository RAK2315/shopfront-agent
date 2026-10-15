// Prefixed, URL-safe IDs: `prd_k3j9x0a1b2c3`. 12 chars of [a-z0-9] ≈ 62 bits.

export const ID_PREFIXES = {
  seller: 'sel',
  product: 'prd',
  variant: 'var',
  checkout: 'chk',
  capture: 'cap',
  refundRequest: 'rfr',
  shipment: 'shp',
  message: 'msg',
  event: 'evt',
  agentRun: 'run',
  extraction: 'ext',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const BODY_LEN = 12;

export function newId(kind: IdKind): string {
  const bytes = new Uint8Array(BODY_LEN);
  crypto.getRandomValues(bytes);
  let body = '';
  for (const b of bytes) body += ALPHABET[b % ALPHABET.length];
  return `${ID_PREFIXES[kind]}_${body}`;
}

export function idPattern(kind: IdKind): RegExp {
  return new RegExp(`^${ID_PREFIXES[kind]}_[a-z0-9]{${BODY_LEN}}$`);
}

/** Secret bearer token for a checkout (returned once to the buyer agent; only its hash is stored). */
export function newOrderToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url without Buffer, so this module stays importable from the browser bundle.
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}
