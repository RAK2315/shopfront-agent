// Unit tests of the client's own behaviour (token cache, headers, retries) with a stubbed transport.
// Real PayPal calls are exercised by the Phase 1 gate against the sandbox, never mocked in the product.
import { describe, expect, it, vi } from 'vitest';
import { isPayPalApiError, PayPalApiError, PayPalClient } from './client';
import { createPayPalApi, refundCaptureId } from './api';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

function setup(responses: Array<(url: string, init: RequestInit) => Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const queue = [...responses];
  const f = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return queue.shift()!(String(url), init ?? {});
  });
  const onCall = vi.fn();
  const client = new PayPalClient({
    baseUrl: 'https://api-m.sandbox.paypal.com',
    clientId: 'id',
    clientSecret: 'secret',
    fetch: f as unknown as typeof fetch,
    sleep: async () => {},
    onCall,
  });
  return { client, calls, onCall };
}

const token = () => json(200, { access_token: 'T1', expires_in: 32400 });

describe('PayPalClient', () => {
  it('caches the OAuth token across calls', async () => {
    const { client, calls } = setup([token, () => json(200, { id: 'A' }), () => json(200, { id: 'B' })]);
    await client.request('GET', '/v2/checkout/orders/A');
    await client.request('GET', '/v2/checkout/orders/B');
    expect(calls.filter((c) => c.url.endsWith('/v1/oauth2/token'))).toHaveLength(1);
  });

  it('refuses POST without PayPal-Request-Id and sends it when given', async () => {
    const { client, calls } = setup([token, () => json(201, { id: 'O1', status: 'CREATED' }, { 'paypal-debug-id': 'dbg1' })]);
    await expect(client.request('POST', '/v2/checkout/orders', { body: {} })).rejects.toThrow(/PayPal-Request-Id/);
    const r = await client.request('POST', '/v2/checkout/orders', { body: {}, requestId: 'checkout-chk_x' });
    expect((calls[1]!.init.headers as Record<string, string>)['PayPal-Request-Id']).toBe('checkout-chk_x');
    expect(r.debugId).toBe('dbg1');
  });

  it('refreshes the token once on 401', async () => {
    const { client, calls } = setup([token, () => json(401, { error: 'invalid_token' }), token, () => json(200, { ok: true })]);
    const r = await client.request('GET', '/v1/notifications/webhooks');
    expect(r.status).toBe(200);
    expect(calls.filter((c) => c.url.endsWith('/v1/oauth2/token'))).toHaveLength(2);
  });

  it('retries 429 then surfaces PayPal errors with debug id', async () => {
    const { client, onCall } = setup([
      token,
      () => json(429, { name: 'RATE_LIMIT_REACHED' }, { 'retry-after': '1' }),
      () => json(422, { name: 'UNPROCESSABLE_ENTITY', message: 'Instrument declined', details: [{ issue: 'INSTRUMENT_DECLINED' }] }, { 'paypal-debug-id': 'dbg9' }),
    ]);
    const err = await client.request('POST', '/v2/checkout/orders/X/capture', { body: {}, requestId: 'capture-x' }).catch((e) => e);
    expect(err).toBeInstanceOf(PayPalApiError);
    expect(err).toMatchObject({ status: 422, issue: 'UNPROCESSABLE_ENTITY', debugId: 'dbg9' });
    expect(onCall).toHaveBeenCalledTimes(2);
  });

  it('forwards the webhook event byte-for-byte when verifying', async () => {
    const { client, calls } = setup([token, () => json(200, { verification_status: 'SUCCESS' })]);
    const api = createPayPalApi(client);
    const raw = '{"id":"WH-1","resource":{"amount":{"value":"10.50"}},"x":1.0}';
    const ok = await api.verifyWebhookSignature(
      { authAlgo: 'SHA256withRSA', certUrl: 'https://api.sandbox.paypal.com/cert', transmissionId: 't', transmissionSig: 's', transmissionTime: 'now' },
      raw,
      'WEBHOOK_ID',
      'verify-WH-1',
    );
    expect(ok).toBe(true);
    const body = String(calls[1]!.init.body);
    expect(body.endsWith(`"webhook_event":${raw}}`)).toBe(true);
    expect(JSON.parse(body).webhook_id).toBe('WEBHOOK_ID');
  });

  it('refuses a live base URL', () => {
    expect(() => new PayPalClient({ baseUrl: 'https://api-m.paypal.com', clientId: 'a', clientSecret: 'b' })).toThrow(/sandbox/);
  });
});

describe('refundCaptureId', () => {
  it('reads the capture id from the refund up link', () => {
    expect(
      refundCaptureId({
        links: [
          { rel: 'self', href: 'https://api.sandbox.paypal.com/v2/payments/refunds/1JU08902781691411' },
          { rel: 'up', href: 'https://api.sandbox.paypal.com/v2/payments/captures/2GG279541U471931P' },
        ],
      }),
    ).toBe('2GG279541U471931P');
  });
  it('is undefined without an up link', () => {
    expect(refundCaptureId({ links: [] })).toBeUndefined();
  });
});

describe('isPayPalApiError', () => {
  it('recognises an error thrown by another bundle copy of the class (instanceof fails there)', () => {
    class OtherBundlePayPalApiError extends Error {
      constructor(readonly status: number, readonly issue: string) {
        super('x');
        this.name = 'PayPalApiError';
      }
    }
    const e = new OtherBundlePayPalApiError(422, 'UNPROCESSABLE_ENTITY');
    expect(e instanceof PayPalApiError).toBe(false);
    expect(isPayPalApiError(e)).toBe(true);
    expect(isPayPalApiError(new PayPalApiError(500, 'INTERNAL', 'x', undefined, null))).toBe(true);
  });
  it('rejects other errors', () => {
    expect(isPayPalApiError(new Error('boom'))).toBe(false);
    expect(isPayPalApiError({ name: 'PayPalApiError', status: 422, issue: 'X' })).toBe(false);
    expect(isPayPalApiError(null)).toBe(false);
  });
});
