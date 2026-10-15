import type { Attempt, ProviderId } from './types';

/** Thrown by provider implementations. `retryable` covers 429, 5xx (503 overload) and timeouts. */
export class LlmProviderError extends Error {
  constructor(
    readonly provider: ProviderId,
    message: string,
    readonly status?: number,
    readonly retryable = status === 429 || (status !== undefined && status >= 500),
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}

/** Every option (cache, providers, replay) is exhausted. The UI shows a "needs manual input" state. */
export class LlmUnavailableError extends Error {
  constructor(
    message: string,
    readonly attempts: Attempt[],
  ) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}
