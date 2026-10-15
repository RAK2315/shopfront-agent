// The MCP layer depends only on this port. The app implements it with the DB + PayPal client;
// tests implement it in memory. Inputs arrive already validated by the strict Zod contracts.
import type { z } from 'zod';
import type {
  CreateCheckoutInput,
  CreateCheckoutOutput,
  GetCheckoutStatusInput,
  GetProductInput,
  ProductDetail,
  RequestRefundInput,
  SearchProductsInput,
  SearchProductsOutput,
} from '@shopfront/core';

export interface CallContext {
  /** e.g. "claude-desktop", "shopfront-web-agent", from the MCP client info. */
  clientName?: string;
  /** Per-call correlation id that shows up on the timeline. */
  requestId: string;
}

export interface CheckoutStatusView {
  checkout_id: string;
  status: string;
  status_label: string;
  paid_at: string | null;
  confirmed_via: string | null;
  totals: z.infer<typeof CreateCheckoutOutput>['totals'];
  tracking: { carrier: string; tracking_number: string } | null;
  refunds: Array<{ id: string; status: string; amount: string }>;
  seller_message: { subject: string; body: string } | null;
}

export interface RefundRequestView {
  refund_request_id: string;
  decision: 'auto_approve' | 'needs_seller' | 'deny';
  amount: { value: string; currency_code: 'USD' };
  status: string;
  explanation: string;
}

export interface ShopPort {
  searchProducts(input: SearchProductsInput, ctx: CallContext): Promise<z.infer<typeof SearchProductsOutput>>;
  getProduct(input: GetProductInput, ctx: CallContext): Promise<z.infer<typeof ProductDetail>>;
  createCheckout(input: CreateCheckoutInput, ctx: CallContext): Promise<z.infer<typeof CreateCheckoutOutput>>;
  getCheckoutStatus(input: GetCheckoutStatusInput, ctx: CallContext): Promise<CheckoutStatusView>;
  requestRefund(input: RequestRefundInput, ctx: CallContext): Promise<RefundRequestView>;
}
