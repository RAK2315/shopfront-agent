import { describe, expect, it } from 'vitest';
import { LINK_CODE_RE, parseStart } from './telegram-link';

const code = 'Ab3_dE-f9GhIjKlMnOpQrS12'; // 24 chars, base64url

describe('parseStart', () => {
  it('reads a one-time link code from /start', () => {
    expect(parseStart(`/start ${code}`)).toEqual({ kind: 'code', code });
    expect(parseStart(`/start@juniper_clay_copilot_bot ${code}`)).toEqual({ kind: 'code', code });
  });
  it('recognises the judge-mode link', () => {
    expect(parseStart('/start judge')).toEqual({ kind: 'judge' });
  });
  it('treats a bare /start as no payload', () => {
    expect(parseStart('/start')).toEqual({ kind: 'none' });
    expect(parseStart('  /start  ')).toEqual({ kind: 'none' });
  });
  it('rejects malformed payloads and ignores other messages', () => {
    expect(parseStart('/start short')).toEqual({ kind: 'invalid' });
    expect(parseStart(`/start ${code}!`)).toEqual({ kind: 'invalid' });
    expect(parseStart(`/start ${code} extra`)).toEqual({ kind: 'invalid' });
    expect(parseStart('hello')).toBeNull();
    expect(parseStart('/started')).toBeNull();
  });
  it('accepts only Telegram deep-link characters, 20 to 64 long', () => {
    expect(LINK_CODE_RE.test('a'.repeat(20))).toBe(true);
    expect(LINK_CODE_RE.test('a'.repeat(65))).toBe(false);
    expect(LINK_CODE_RE.test('a'.repeat(19))).toBe(false);
  });
});
