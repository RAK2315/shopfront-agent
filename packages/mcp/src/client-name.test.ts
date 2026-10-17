import { describe, expect, it } from 'vitest';
import { clientNameFromHeaders } from './client-name';

const h = (o: Record<string, string>) => new Headers(o);

describe('clientNameFromHeaders', () => {
  it('prefers the explicit x-shopfront-client header', () => {
    expect(clientNameFromHeaders(h({ 'x-shopfront-client': 'shopfront-web-agent', 'user-agent': 'node' }))).toBe('shopfront-web-agent');
  });
  it('strips characters that do not belong in a label and caps the length', () => {
    expect(clientNameFromHeaders(h({ 'x-shopfront-client': '<script>alert(1)</script>' }))).toBe('scriptalert1script');
    expect(clientNameFromHeaders(h({ 'x-shopfront-client': 'a'.repeat(80) }))?.length).toBe(40);
  });
  it('falls back to the first User-Agent product token', () => {
    expect(clientNameFromHeaders(h({ 'user-agent': 'Claude-User/1.0 (+https://example.com)' }))).toBe('Claude-User');
    expect(clientNameFromHeaders(h({ 'user-agent': 'claude-code/2.1.0' }))).toBe('claude-code');
  });
  it('ignores generic runtime and browser user agents', () => {
    for (const ua of ['node', 'undici', 'python-httpx/0.27.0', 'axios/1.7.0', 'Mozilla/5.0 (Windows NT 10.0)', 'curl/8.4.0', 'Go-http-client/1.1']) {
      expect(clientNameFromHeaders(h({ 'user-agent': ua }))).toBeUndefined();
    }
  });
  it('returns undefined with no usable header', () => {
    expect(clientNameFromHeaders(h({}))).toBeUndefined();
    expect(clientNameFromHeaders(h({ 'x-shopfront-client': '***' }))).toBeUndefined();
  });
});
