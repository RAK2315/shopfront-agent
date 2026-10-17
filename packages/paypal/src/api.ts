// Typed wrappers for the PayPal endpoints Shopfront uses (Orders v2, Payments v2, Webhooks v1, Catalog v1).
// Only the fields we read are typed; PayPal returns more.
import type { PayPalClient, RequestOptions } from './client';

export interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface PayPalCapture {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
  amount: { currency_code: string; value: string };
  create_time?: string;
  update_time?: string;
  custom_id?: string;
  status_details?: { reason?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
  links?: PayPalLink[];
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links?: PayPalLink[];
  payer?: { email_address?: string; payer_id?: string; name?: { given_name?: string; surname?: string }; address?: { country_code?: string } };
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    shipping?: { name?: { full_name?: string }; address?: Record<string, string>; trackers?: Array<{ id: string; status?: string }> };
    payments?: { captures?: PayPalCapture[] };
  }>;
}

export interface PayPalRefund {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'FAILED';
  amount?: { currency_code: string; value: string };
  /** Cumulative across every refund of the capture (Payments v2 refund schema). */
  seller_payable_breakdown?: { total_refunded_amount?: { currency_code: string; value: string } };
  links?: PayPalLink[];
}

/** The capture a refund belongs to: its `up` link points at /v2/payments/captures/{id}. */
export function refundCaptureId(refund: Pick<PayPalRefund, 'links'>): string | undefined {
  const up = refund.links?.find((l) => l.rel === 'up' && /\/v2\/payments\/captures\//.test(l.href));
  return up?.href.split('/').pop() || undefined;
}

export interface PayPalWebhook {
  id: string;
  url: string;
  event_types: Array<{ name: string }>;
}

export interface WebhookVerificationHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

type Ctx = Pick<RequestOptions, 'context' | 'headers'>;

export function approveLink(order: PayPalOrder): string | undefined {
  return order.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
}

export function firstCapture(order: PayPalOrder): PayPalCapture | undefined {
  return order.purchase_units?.[0]?.payments?.captures?.[0];
}

export function createPayPalApi(c: PayPalClient) {
  return {
    createOrder: (body: unknown, requestId: string, o: Ctx = {}) =>
      c.request<PayPalOrder>('POST', '/v2/checkout/orders', { body, requestId, ...o }),

    getOrder: (orderId: string, o: Ctx = {}) => c.request<PayPalOrder>('GET', `/v2/checkout/orders/${encodeURIComponent(orderId)}`, o),

    captureOrder: (orderId: string, requestId: string, o: Ctx = {}) =>
      c.request<PayPalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { body: {}, requestId, ...o }),

    /** Orders v2 tracking (verified against the published Orders v2 spec, 2026-10-15; D-019). */
    addTracking: (
      orderId: string,
      body: { capture_id: string; tracking_number: string; carrier: string; carrier_name_other?: string; notify_payer?: boolean },
      requestId: string,
      o: Ctx = {},
    ) => c.request<PayPalOrder>('POST', `/v2/checkout/orders/${encodeURIComponent(orderId)}/track`, { body, requestId, ...o }),

    getCapture: (captureId: string, o: Ctx = {}) => c.request<PayPalCapture>('GET', `/v2/payments/captures/${encodeURIComponent(captureId)}`, o),

    getRefund: (refundId: string, o: Ctx = {}) => c.request<PayPalRefund>('GET', `/v2/payments/refunds/${encodeURIComponent(refundId)}`, o),

    refundCapture: (captureId: string, body: { amount: { value: string; currency_code: string }; note_to_payer?: string }, requestId: string, o: Ctx = {}) =>
      c.request<PayPalRefund>('POST', `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { body, requestId, ...o }),

    /**
     * Verifies a webhook with PayPal. The event is forwarded byte-for-byte (rawBody) because re-serialising
     * the parsed JSON can change it and break verification.
     */
    async verifyWebhookSignature(h: WebhookVerificationHeaders, rawEventBody: string, webhookId: string, requestId: string) {
      const prefix = JSON.stringify({
        auth_algo: h.authAlgo,
        cert_url: h.certUrl,
        transmission_id: h.transmissionId,
        transmission_sig: h.transmissionSig,
        transmission_time: h.transmissionTime,
        webhook_id: webhookId,
      });
      const rawBody = `${prefix.slice(0, -1)},"webhook_event":${rawEventBody}}`;
      const r = await c.request<{ verification_status: 'SUCCESS' | 'FAILURE' }>('POST', '/v1/notifications/verify-webhook-signature', {
        rawBody,
        requestId,
      });
      return r.data.verification_status === 'SUCCESS';
    },

    /** Ask PayPal to deliver a past event again (Dashboard "Resend"). Same event id, new transmission. */
    resendWebhookEvent: (eventId: string, webhookIds: string[], requestId: string) =>
      c.request<{ id: string }>('POST', `/v1/notifications/webhooks-events/${encodeURIComponent(eventId)}/resend`, {
        body: { webhook_ids: webhookIds },
        requestId,
      }),

    updateWebhookUrl: (webhookId: string, url: string) =>
      c.request<PayPalWebhook>('PATCH', `/v1/notifications/webhooks/${encodeURIComponent(webhookId)}`, {
        body: [{ op: 'replace', path: '/url', value: url }],
      }),

    /** Transaction Search (G6; verified against the published v1 spec 2026-10-15). Range at most 31 days; data lags (D-007). */
    listTransactions: (startIso: string, endIso: string) =>
      c.request<{
        transaction_details?: Array<{
          transaction_info: { transaction_id: string; transaction_event_code?: string; transaction_initiation_date?: string; transaction_amount?: { currency_code: string; value: string }; transaction_status?: string };
        }>;
        last_refreshed_datetime?: string;
      }>('GET', `/v1/reporting/transactions?start_date=${encodeURIComponent(startIso)}&end_date=${encodeURIComponent(endIso)}&fields=transaction_info&page_size=500`),

    listWebhooks: () => c.request<{ webhooks: PayPalWebhook[] }>('GET', '/v1/notifications/webhooks'),

    createWebhook: (url: string, eventTypes: string[], requestId: string) =>
      c.request<PayPalWebhook>('POST', '/v1/notifications/webhooks', {
        body: { url, event_types: eventTypes.map((name) => ({ name })) },
        requestId,
      }),

    createCatalogProduct: (
      body: { id?: string; name: string; description?: string; type: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'; category?: string; image_url?: string; home_url?: string },
      requestId: string,
    ) => c.request<{ id: string; name: string }>('POST', '/v1/catalogs/products', { body, requestId }),

    getCatalogProduct: (productId: string) => c.request<{ id: string; name: string; description?: string; image_url?: string; home_url?: string }>('GET', `/v1/catalogs/products/${encodeURIComponent(productId)}`),

    /** JSON Patch; PayPal allows replacing description, category, image_url and home_url. */
    updateCatalogProduct: (productId: string, ops: Array<{ op: 'replace' | 'add' | 'remove'; path: string; value?: unknown }>) =>
      c.request<void>('PATCH', `/v1/catalogs/products/${encodeURIComponent(productId)}`, { body: ops }),
  };
}

export type PayPalApi = ReturnType<typeof createPayPalApi>;
