import { describe, expect, it } from 'vitest';
import { toProviderError } from './providers';

describe('toProviderError (D-114)', () => {
  it('does not retry our own timeout on the same provider', () => {
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    expect(toProviderError('gemini', timeout).retryable).toBe(false);
    expect(toProviderError('gemini', new Error('Request timeout after 60000ms')).retryable).toBe(false);
  });

  it('retries quick network failures', () => {
    expect(toProviderError('groq', new TypeError('fetch failed')).retryable).toBe(true);
    expect(toProviderError('groq', new Error('read ECONNRESET')).retryable).toBe(true);
  });

  it('does not retry schema or parse errors', () => {
    expect(toProviderError('groq', new Error('No object generated: response did not match schema')).retryable).toBe(false);
  });
});
