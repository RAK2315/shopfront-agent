// Thin typed PayPal REST client (D-010/STACK): server-side OAuth with cached + auto-refreshed token,
// PayPal-Request-Id on every POST, PayPal-Debug-Id captured on every response, 429/5xx backoff,
// and a call hook so every request shows up on the timeline with its real ids.

export interface PayPalConfig {
  baseUrl: string; // https://api-m.sandbox.paypal.com
  clientId: string;
  clientSecret: string;
  /** Observability hook (timeline + paypal_calls table). Never receives secrets or tokens. */
  onCall?: (c: PayPalCallRecord) => void | Promise<void>;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

export interface PayPalCallRecord {
  method: string;
  path: string;
  status: number;
  paypalRequestId?: string;
  debugId?: string;
  durationMs: number;
  context?: Record<string, string | undefined>;
}

export class PayPalApiError extends Error {
  constructor(
    readonly status: number,
    readonly issue: string,
    message: string,
    readonly debugId: string | undefined,
    readonly details: unknown,
  ) {
    super(message);
    this.name = 'PayPalApiError';
  }
}

/**
 * Use this, not `instanceof`: the server's PayPal client is a globalThis singleton shared by Next's separate bundles
 * (instrumentation and route handlers), so an error thrown by one bundle's class fails `instanceof` in another.
 * That silently skipped every PayPal error branch on Render until D-081 (found by the decline AT).
 */
export function isPayPalApiError(e: unknown): e is PayPalApiError {
  if (e instanceof PayPalApiError) return true;
  const x = e as Partial<PayPalApiError> | null;
  return e instanceof Error && x!.name === 'PayPalApiError' && typeof x!.status === 'number' && typeof x!.issue === 'string';
}

export interface RequestOptions {
  body?: unknown;
  /** Raw JSON string body (webhook verification must forward the event byte-for-byte). */
  rawBody?: string;
  /** Required for POST. Reuse the same value when retrying the same logical operation. */
  requestId?: string;
  headers?: Record<string, string>;
  context?: Record<string, string | undefined>;
}

export interface PayPalResponse<T> {
  status: number;
  data: T;
  debugId?: string;
  paypalRequestId?: string;
}

export class PayPalClient {
  private token: { value: string; expiresAt: number } | null = null;
  private tokenInflight: Promise<string> | null = null;
  private readonly f: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly cfg: PayPalConfig) {
    if (!/sandbox/.test(cfg.baseUrl) && process.env.PAYPAL_ALLOW_LIVE !== 'true') {
      throw new Error('Refusing to start: PAYPAL_BASE_URL is not the sandbox (sandbox only, CLAUDE.md).');
    }
    this.f = cfg.fetch ?? fetch;
    this.sleep = cfg.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Cached client-credentials token, refreshed 5 minutes before `expires_in`. Concurrent callers share one fetch. */
  async accessToken(force = false): Promise<string> {
    if (!force && this.token && Date.now() < this.token.expiresAt) return this.token.value;
    if (!this.tokenInflight) {
      this.tokenInflight = (async () => {
        const basic = Buffer.from(`${this.cfg.clientId}:${this.cfg.clientSecret}`).toString('base64');
        const res = await this.f(`${this.cfg.baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
          throw new PayPalApiError(res.status, 'AUTHENTICATION_FAILURE', 'Could not obtain PayPal access token.', res.headers.get('paypal-debug-id') ?? undefined, null);
        }
        const j = (await res.json()) as { access_token: string; expires_in: number };
        this.token = { value: j.access_token, expiresAt: Date.now() + Math.max(60, j.expires_in - 300) * 1000 };
        return j.access_token;
      })().finally(() => {
        this.tokenInflight = null;
      });
    }
    return this.tokenInflight;
  }

  async request<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, o: RequestOptions = {}): Promise<PayPalResponse<T>> {
    if (method === 'POST' && !o.requestId) throw new Error(`PayPal-Request-Id is required for POST ${path}`);
    const maxRetries = this.cfg.maxRetries ?? 2;
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      const token = await this.accessToken();
      const t0 = Date.now();
      const res = await this.f(`${this.cfg.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          ...(o.requestId ? { 'PayPal-Request-Id': o.requestId } : {}),
          ...o.headers,
        },
        body: o.rawBody ?? (o.body === undefined ? undefined : JSON.stringify(o.body)),
      });
      const debugId = res.headers.get('paypal-debug-id') ?? undefined;
      const text = await res.text();
      const data = text ? safeJson(text) : null;
      await this.cfg.onCall?.({
        method,
        path: path.split('?')[0]!,
        status: res.status,
        paypalRequestId: o.requestId,
        debugId,
        durationMs: Date.now() - t0,
        context: o.context,
      });

      if (res.status === 401 && !refreshed) {
        refreshed = true;
        await this.accessToken(true);
        continue;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < maxRetries) {
        const ra = Number(res.headers.get('retry-after'));
        await this.sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 500 * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        const d = (data ?? {}) as { name?: string; message?: string; details?: unknown; error?: string };
        throw new PayPalApiError(res.status, d.name ?? d.error ?? `HTTP_${res.status}`, d.message ?? `PayPal ${method} ${path} failed`, debugId, d.details ?? null);
      }
      return { status: res.status, data: data as T, debugId, paypalRequestId: o.requestId };
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
