// Postgres schema (ARCHITECTURE.md §4). Money = integer cents + currency. IDs = prefixed text.
import {
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { CHECKOUT_STATUSES, REFUND_REASON_CODES, type ProductExtraction, type RefundPolicy } from '@shopfront/core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const createdAt = () => ts('created_at').notNull().defaultNow();

export const productStatus = pgEnum('product_status', ['draft', 'approved', 'archived']);
export const checkoutStatus = pgEnum('checkout_status', CHECKOUT_STATUSES);
export const refundReason = pgEnum('refund_reason', REFUND_REASON_CODES);
export const refundDecision = pgEnum('refund_decision', ['auto_approve', 'needs_seller', 'deny']);
export const refundStatus = pgEnum('refund_status', ['pending', 'approved', 'executed', 'rejected', 'failed']);
export const eventActor = pgEnum('event_actor', [
  'buyer_agent',
  'mcp',
  'server',
  'paypal',
  'webhook',
  'poller',
  'seller',
  'ops_agent',
  'llm',
]);

export const sellers = pgTable('sellers', {
  id: text('id').primaryKey(),
  handle: text('handle').notNull().unique(),
  displayName: text('display_name').notNull(),
  bio: text('bio').notNull().default(''),
  paypalMerchantId: text('paypal_merchant_id'), // production path only (D-006)
  currency: text('currency').notNull().default('USD'),
  flatShippingCents: integer('flat_shipping_cents').notNull().default(500),
  shipsTo: jsonb('ships_to').$type<string[]>().notNull().default(['US']),
  refundPolicy: jsonb('refund_policy').$type<RefundPolicy>().notNull(),
  dashboardState: jsonb('dashboard_state'), // the seller's saved AG Studio layout (Phase 5)
  demoResetAt: ts('demo_reset_at'), // judge mode (D-011): last reset; per-buyer refund counts start here
  // Telegram judge mode (D-073): every order of this seller is test-flagged, so its own views include test rows (D-074).
  testOnly: boolean('test_only').notNull().default(false),
  createdAt: createdAt(),
});

export const images = pgTable('images', {
  sha256: text('sha256').primaryKey(),
  mime: text('mime').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  bytes: bytea('bytes').notNull(),
  createdAt: createdAt(),
});

export const aiExtractions = pgTable(
  'ai_extractions',
  {
    id: text('id').primaryKey(),
    imageSha256: text('image_sha256').notNull().references(() => images.sha256),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    output: jsonb('output').$type<ProductExtraction>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('ai_extractions_cache_key').on(t.imageSha256, t.model, t.promptVersion)],
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    sellerId: text('seller_id').notNull().references(() => sellers.id),
    status: productStatus('status').notNull().default('draft'),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull().default(''),
    attributes: jsonb('attributes').$type<Record<string, string>>().notNull().default({}),
    fieldConfidence: jsonb('field_confidence').$type<Record<string, number>>().notNull().default({}),
    extractionId: text('extraction_id').references(() => aiExtractions.id),
    priceConfirmed: boolean('price_confirmed').notNull().default(false),
    version: integer('version').notNull().default(1),
    paypalCatalogId: text('paypal_catalog_id'),
    approvedAt: ts('approved_at'),
    createdAt: createdAt(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('products_seller_status').on(t.sellerId, t.status)],
);

export const productImages = pgTable(
  'product_images',
  {
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    imageSha256: text('image_sha256').notNull().references(() => images.sha256),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.imageSha256] })],
);

export const variants = pgTable('variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  options: jsonb('options').$type<Record<string, string>>().notNull().default({}),
  priceCents: integer('price_cents').notNull(),
  currency: text('currency').notNull().default('USD'),
  stock: integer('stock').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

export const checkouts = pgTable(
  'checkouts',
  {
    id: text('id').primaryKey(),
    sellerId: text('seller_id').notNull().references(() => sellers.id),
    orderTokenHash: text('order_token_hash').notNull(),
    clientRequestId: text('client_request_id'),
    source: text('source').notNull(), // web_agent | mcp_external | storefront
    mcpClientName: text('mcp_client_name'),
    /** Created by a test, replay check or script run: hidden from public views (/live, landing hero). */
    isTest: boolean('is_test').notNull().default(false),
    status: checkoutStatus('status').notNull().default('created'),
    itemTotalCents: integer('item_total_cents').notNull(),
    shippingCents: integer('shipping_cents').notNull(),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').notNull().default('USD'),
    paypalOrderId: text('paypal_order_id').unique(),
    approveUrl: text('approve_url'),
    confirmedVia: text('confirmed_via'), // webhook | poll | capture_response (how PAID was first set)
    webhookConfirmedAt: ts('webhook_confirmed_at'), // when a verified PAYMENT.CAPTURE.COMPLETED arrived
    pollConfirmedAt: ts('poll_confirmed_at'), // when a fallback check (D-025) confirmed the capture with PayPal before any webhook
    buyerEmail: text('buyer_email'),
    buyerCountry: text('buyer_country'),
    shippingAddress: jsonb('shipping_address').$type<Record<string, string>>(),
    internalNote: text('internal_note'), // seller-only, edited inline in the ledger
    shipBy: text('ship_by'), // YYYY-MM-DD, edited inline in the ledger
    expiresAt: ts('expires_at').notNull(),
    createdAt: createdAt(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('checkouts_client_request_id').on(t.clientRequestId),
    index('checkouts_seller_status').on(t.sellerId, t.status),
  ],
);

export const checkoutItems = pgTable(
  'checkout_items',
  {
    checkoutId: text('checkout_id').notNull().references(() => checkouts.id, { onDelete: 'cascade' }),
    variantId: text('variant_id').notNull().references(() => variants.id),
    sku: text('sku').notNull(),
    titleSnapshot: text('title_snapshot').notNull(),
    optionsSnapshot: jsonb('options_snapshot').$type<Record<string, string>>().notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    quantity: integer('quantity').notNull(),
    lineTotalCents: integer('line_total_cents').notNull(),
  },
  (t) => [primaryKey({ columns: [t.checkoutId, t.variantId] })],
);

export const captures = pgTable('captures', {
  id: text('id').primaryKey(),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id),
  paypalCaptureId: text('paypal_capture_id').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  refundedCents: integer('refunded_cents').notNull().default(0),
  status: text('status').notNull(),
  capturedAt: ts('captured_at').notNull(),
});

export const shipments = pgTable('shipments', {
  id: text('id').primaryKey(),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id),
  carrier: text('carrier').notNull(),
  trackingNumber: text('tracking_number').notNull(),
  source: text('source').notNull(), // label_photo | manual
  paypalTrackerRef: text('paypal_tracker_ref'),
  createdAt: createdAt(),
});

export const refundRequests = pgTable('refund_requests', {
  id: text('id').primaryKey(),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id),
  captureId: text('capture_id').references(() => captures.id),
  source: text('source').notNull(), // buyer_agent | seller
  reasonCode: refundReason('reason_code').notNull(),
  details: text('details'),
  aiReasonSuggestion: jsonb('ai_reason_suggestion'),
  items: jsonb('items').$type<{ variant_id: string; quantity: number }[]>(),
  amountCents: integer('amount_cents').notNull(),
  decision: refundDecision('decision').notNull(),
  decisionTrace: jsonb('decision_trace').notNull(),
  status: refundStatus('status').notNull().default('pending'),
  paypalRefundId: text('paypal_refund_id'),
  createdAt: createdAt(),
  decidedAt: ts('decided_at'),
  executedAt: ts('executed_at'),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id),
  kind: text('kind').notNull(), // thank_you | shipped | refund
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('draft'),
  agentRunId: text('agent_run_id'),
  createdAt: createdAt(),
});

export const webhookEvents = pgTable('webhook_events', {
  eventId: text('event_id').primaryKey(), // PayPal event id → idempotency key
  eventType: text('event_type').notNull(),
  resourceId: text('resource_id'),
  verified: boolean('verified').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: ts('received_at').notNull().defaultNow(),
  processedAt: ts('processed_at'),
  attempts: integer('attempts').notNull().default(0), // processing claims
  deliveries: integer('deliveries').notNull().default(1), // times PayPal delivered this event id (retries, Dashboard resends)
  lastDeliveryAt: ts('last_delivery_at').notNull().defaultNow(),
  error: text('error'),
});

/** Source of truth for the live timeline (Agent → MCP → PayPal → Webhook → Seller agent). */
export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    sellerId: text('seller_id'),
    checkoutId: text('checkout_id'),
    actor: eventActor('actor').notNull(),
    kind: text('kind').notNull(),
    summary: text('summary').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
    /** Written by a test, replay check or script run: hidden from public views (/live, landing hero). */
    isTest: boolean('is_test').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('events_seller_id').on(t.sellerId, t.id), index('events_checkout').on(t.checkoutId), index('events_public').on(t.isTest, t.id)],
);

export const paypalCalls = pgTable('paypal_calls', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  status: integer('status').notNull(),
  paypalRequestId: text('paypal_request_id'),
  debugId: text('debug_id'),
  durationMs: integer('duration_ms').notNull(),
  checkoutId: text('checkout_id'),
  createdAt: createdAt(),
});

/** Every LLM call: provider + model + route + cache/fallback info (D-028, D-029). Also the response cache. */
export const agentRuns = pgTable(
  'agent_runs',
  {
    id: text('id').primaryKey(),
    route: text('route').notNull(), // cataloger | buyer | ops | insights | grid | label
    provider: text('provider').notNull(), // gemini | groq | cache | replay
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    inputHash: text('input_hash').notNull(),
    replayKey: text('replay_key'), // like input_hash but ignoring tool-result contents (D-055)
    output: jsonb('output').notNull(),
    toolCalls: jsonb('tool_calls'),
    latencyMs: integer('latency_ms').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    cacheHit: boolean('cache_hit').notNull().default(false),
    fallbackReason: text('fallback_reason'),
    confidence: real('confidence'),
    createdAt: createdAt(),
  },
  (t) => [index('agent_runs_input_hash').on(t.inputHash), index('agent_runs_replay_key').on(t.replayKey)],
);

/** Hosted /shop buyer-agent conversations (short transcripts; the agent shops through the public /mcp). */
export const buyerSessions = pgTable('buyer_sessions', {
  id: text('id').primaryKey(),
  transcript: jsonb('transcript').$type<unknown[]>().notNull().default([]),
  checkouts: jsonb('checkouts').$type<Array<{ checkout_id: string; order_token: string }>>().notNull().default([]),
  createdAt: createdAt(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

/** Judge mode (D-011): the frozen demo catalog that a reset restores. */
export const demoSnapshots = pgTable('demo_snapshots', {
  id: text('id').primaryKey(), // seller id
  data: jsonb('data').notNull(),
  createdAt: createdAt(),
});

// ---------- Phase 10: seller copilot on Telegram (D-072, D-076). Webhook mode only; no polling. ----------

/** A Telegram chat linked to one seller. `is_demo` links point at the isolated `judge_demo` seller (D-073). */
export const telegramLinks = pgTable('telegram_links', {
  chatId: text('chat_id').primaryKey(), // Telegram chat ids exceed 32 bits; stored as text
  sellerId: text('seller_id').notNull().references(() => sellers.id),
  isDemo: boolean('is_demo').notNull().default(false),
  linkedAt: ts('linked_at').notNull().defaultNow(),
  revokedAt: ts('revoked_at'),
});

/** One-time link codes from the Studio "Connect Telegram" card (10 minutes). Only the hash is stored. */
export const telegramLinkCodes = pgTable('telegram_link_codes', {
  codeHash: text('code_hash').primaryKey(),
  sellerId: text('seller_id').notNull().references(() => sellers.id),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
  createdAt: createdAt(),
});

/** Exactly-once processing of webhook updates (the D-045 pattern): Telegram re-delivers on any non-2xx. */
export const telegramUpdates = pgTable('telegram_updates', {
  updateId: text('update_id').primaryKey(),
  receivedAt: ts('received_at').notNull().defaultNow(),
  processedAt: ts('processed_at'),
});

/** Single-use, seller-scoped, expiring button actions (checkChatAction in core). The payload holds ids only. */
export const telegramActions = pgTable(
  'telegram_actions',
  {
    id: text('id').primaryKey(), // tga_ + 12 chars, fits the 64-byte callback_data
    sellerId: text('seller_id').notNull().references(() => sellers.id),
    chatId: text('chat_id').notNull(),
    kind: text('kind').notNull(),
    payload: jsonb('payload').$type<Record<string, string>>().notNull().default({}),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
    result: jsonb('result'),
    createdAt: createdAt(),
  },
  (t) => [index('telegram_actions_chat').on(t.chatId, t.createdAt)],
);
