import "server-only";
import {
  MISMATCH_LABEL,
  MONEY_CAPTURE_STATUSES,
  PAID_STATUSES,
  centsToValue,
  mismatchKey,
  reconcileLedger,
  valueToCents,
  type CheckoutStatus,
  type LedgerCapture,
  type Mismatch,
  type PayPalSeen,
} from "@shopfront/core";
import { desc, schema, sql } from "@shopfront/db";
import { isPayPalApiError } from "@shopfront/paypal";
import { recordEvent } from "./events";
import { services } from "./services";

// Reconciliation with PayPal (D-095). On boot, once a day while the server is up, when a dashboard finds the last run
// stale, and from `pnpm reconcile`. Compares PayPal's captures (Transaction Search, verified webhooks, GET for the rest)
// with our orders, flags captures with no paid order and paid orders with no capture. It only reports: it never
// changes an order or moves money. Added after two captures sat unnoticed on cancelled orders (D-094).

const WINDOW_DAYS = 30; // Transaction Search allows at most 31 days per query
const MAX_GETS = 15; // captures neither Transaction Search nor a webhook confirmed, asked one by one
const DAY_MS = 86_400_000;

/** Captures with no order in our DB by design, each with the decision that explains it. Shown, never hidden. */
export const EXPLAINED_CAPTURES: Record<string, string> = {
  "3G13556369039540R": "Payee-routing spike run outside the app (D-076): a $37 order created directly at PayPal to prove a capture lands in seller 2's PayPal.",
  "9Y508584GP8179434": "Spike C (D-098): a $12 authorize → capture-on-ship test on the platform account, created directly at PayPal and refunded.",
  "6H110925U9603183E": "Spike C (D-098): a $12 authorize → capture-on-ship test paid to seller 2; our app may not refund another seller's capture (D-076).",
};

export type Trigger = "boot" | "daily" | "dashboard" | "script" | "webhook";
export type ReconciliationRun = typeof schema.reconciliationRuns.$inferSelect;
type StoredMismatch = Mismatch & { label: string };

const PAID_SQL = sql.raw([...PAID_STATUSES].map((s) => `'${s}'`).join(", "));
const g = globalThis as unknown as { __reconcile?: Promise<ReconciliationRun>; __reconcileTimer?: ReturnType<typeof setInterval> };

/** One run at a time per process: a second caller gets the run already in flight. */
export function runReconciliation(trigger: Trigger): Promise<ReconciliationRun> {
  g.__reconcile ??= reconcile(trigger).finally(() => {
    g.__reconcile = undefined;
  });
  return g.__reconcile;
}

/** Boot run (deferred) plus a daily timer. unref'd: it never keeps the process, Render or Neon awake (D-022). */
export function scheduleReconciliation() {
  setTimeout(() => void runReconciliation("boot").catch((e) => console.error("[reconcile] boot run failed", e)), 20_000).unref?.();
  if (!g.__reconcileTimer) {
    g.__reconcileTimer = setInterval(() => void runReconciliation("daily").catch((e) => console.error("[reconcile] daily run failed", e)), DAY_MS);
    g.__reconcileTimer.unref?.();
  }
}

async function reconcile(trigger: Trigger): Promise<ReconciliationRun> {
  const started = Date.now();
  const { db, paypal } = services();
  const since = new Date(started - WINDOW_DAYS * DAY_MS);
  const sinceIso = since.toISOString();

  const ours = (
    await db.execute<LedgerCapture & Record<string, unknown>>(sql`
      select cp.paypal_capture_id "captureId", k.id "checkoutId", k.seller_id "sellerId", k.status "orderStatus",
             cp.status "captureStatus", cp.amount_cents "amountCents", k.total_cents "orderTotalCents", k.is_test "isTest"
      from ${schema.captures} cp join ${schema.checkouts} k on k.id = cp.checkout_id
      where cp.captured_at >= ${sinceIso}`)
  ).rows;
  const paidWithoutCaptureRow = (
    await db.execute<{ checkoutId: string; sellerId: string; orderStatus: CheckoutStatus; totalCents: number; isTest: boolean }>(sql`
      select k.id "checkoutId", k.seller_id "sellerId", k.status "orderStatus", k.total_cents "totalCents", k.is_test "isTest"
      from ${schema.checkouts} k
      where k.status in (${PAID_SQL}) and k.created_at >= ${sinceIso}
        and not exists (select 1 from ${schema.captures} cp where cp.checkout_id = k.id)`)
  ).rows;

  // PayPal's side, 1: verified PAYMENT.CAPTURE.COMPLETED webhooks (they cover sellers paid into their own PayPal too).
  const seen: PayPalSeen[] = (
    await db.execute<{ id: string; value: string | null; payee: string | null }>(sql`
      select resource_id id, payload->'resource'->'amount'->>'value' value, payload->'resource'->'payee'->>'merchant_id' payee
      from ${schema.webhookEvents}
      where verified and event_type = 'PAYMENT.CAPTURE.COMPLETED' and resource_id is not null and received_at >= ${sinceIso}`)
  ).rows.map((w) => ({ captureId: w.id, amountCents: w.value ? valueToCents(w.value) : undefined, source: "webhook", payeeMerchantId: w.payee ?? undefined }));
  const webhookCount = seen.length;

  // 2: Transaction Search on the platform account (lags up to ~3 h, D-007). Its sales are T00xx with a positive amount.
  let tsError: string | null = null;
  let tsCount = 0;
  let tsRefreshed: string | undefined;
  try {
    const end = new Date(started).toISOString().replace(/\.\d+Z$/, "Z");
    const start = sinceIso.replace(/\.\d+Z$/, "Z");
    for (let page = 1, pages = 1; page <= pages && page <= 10; page++) {
      const { data } = await paypal.listTransactions(start, end, page);
      pages = data.total_pages ?? 1;
      tsRefreshed = data.last_refreshed_datetime;
      for (const { transaction_info: t } of data.transaction_details ?? []) {
        if (!/^T00\d\d$/.test(t.transaction_event_code ?? "") || !(Number(t.transaction_amount?.value ?? 0) > 0)) continue;
        seen.push({ captureId: t.transaction_id, amountCents: valueToCents(t.transaction_amount!.value), source: "transaction_search" });
        tsCount++;
      }
    }
  } catch (e) {
    tsError = isPayPalApiError(e) ? `Transaction Search ${e.status} ${e.issue} (debug ${e.debugId ?? "?"})` : `Transaction Search: ${e instanceof Error ? e.message : "failed"}`;
  }

  // 3: our captures PayPal hasn't confirmed either way (newer than Transaction Search, no webhook): ask PayPal directly.
  const confirmed = new Set(seen.map((s) => s.captureId));
  const toAsk = ours.filter((c) => MONEY_CAPTURE_STATUSES.has(c.captureStatus) && !confirmed.has(c.captureId));
  const unknownAtPayPal: Record<string, string> = {};
  let asked = 0;
  for (const c of toAsk.slice(0, MAX_GETS)) {
    asked++;
    try {
      const { data } = await paypal.getCapture(c.captureId, { context: { checkoutId: c.checkoutId } });
      if (MONEY_CAPTURE_STATUSES.has(data.status)) seen.push({ captureId: c.captureId, amountCents: valueToCents(data.amount.value), source: "get", payeeMerchantId: data.payee?.merchant_id });
      else unknownAtPayPal[c.captureId] = data.status;
    } catch (e) {
      if (isPayPalApiError(e) && e.status === 404) unknownAtPayPal[c.captureId] = `404 ${e.issue}`;
      // Any other error: unchecked this run, never reported as a mismatch.
    }
  }

  const result = reconcileLedger({ ours, paidWithoutCaptureRow, paypal: seen, unknownAtPayPal, explained: EXPLAINED_CAPTURES });

  // A capture with no order belongs to the seller PayPal names as payee; with no payee it's the platform account's.
  const sellers = await db.select({ id: schema.sellers.id, merchant: schema.sellers.paypalMerchantId }).from(schema.sellers);
  const byMerchant = new Map(sellers.filter((s) => s.merchant).map((s) => [s.merchant!, s.id]));
  const mismatches: StoredMismatch[] = result.mismatches.map((m) => ({ ...m, sellerId: m.sellerId ?? (m.payeeMerchantId ? byMerchant.get(m.payeeMerchantId) : undefined), label: MISMATCH_LABEL[m.kind] }));
  const explained = result.explained.map((x) => ({ ...x, sellerId: x.sellerId ?? (x.payeeMerchantId ? byMerchant.get(x.payeeMerchantId) : undefined) }));

  const [previous] = await db.select({ mismatches: schema.reconciliationRuns.mismatches }).from(schema.reconciliationRuns).orderBy(desc(schema.reconciliationRuns.id)).limit(1);
  const known = new Set((previous?.mismatches ?? []).map((m) => mismatchKey(m as unknown as Mismatch)));

  const [run] = await db
    .insert(schema.reconciliationRuns)
    .values({
      trigger,
      ok: tsError === null,
      matched: result.matched,
      mismatches: mismatches as unknown as Array<Record<string, unknown>>,
      explained: explained as unknown as Array<Record<string, unknown>>,
      sources: {
        windowDays: WINDOW_DAYS,
        ourCaptures: ours.length,
        transactionSearch: tsCount,
        transactionSearchRefreshed: tsRefreshed,
        webhooks: webhookCount,
        askedPayPal: asked,
        unchecked: Math.max(0, toAsk.length - MAX_GETS),
        matchedBySeller: result.matchedBySeller,
      },
      error: tsError,
      durationMs: Date.now() - started,
    })
    .returning();

  // A mismatch the previous run didn't have goes on the seller's timeline once, so it can't go unnoticed.
  for (const m of mismatches.filter((x) => !known.has(mismatchKey(x))).slice(0, 10)) {
    await recordEvent(db, {
      actor: "server",
      kind: "reconcile_mismatch",
      sellerId: m.sellerId ?? null,
      checkoutId: m.checkoutId ?? null,
      isTest: m.isTest,
      summary: `Reconciliation with PayPal · ${m.label} · ${m.captureId ? `capture ${m.captureId}` : `order ${m.checkoutId}`}${m.amountCents !== undefined ? ` · $${centsToValue(m.amountCents)}` : ""} · needs a look`,
      data: { kind: m.kind, captureId: m.captureId, detail: m.detail, runId: run!.id },
    });
  }
  console.log(`[reconcile] ${trigger}: ${result.matched} matched, ${mismatches.length} mismatch(es), ${explained.length} explained${tsError ? `; ${tsError}` : ""}`);
  return run!;
}

export interface SellerReconciliation {
  state: "ok" | "mismatch" | "incomplete" | "pending";
  checkedAt?: string;
  matched: number;
  mismatches: StoredMismatch[];
  explained: Array<{ captureId: string; reason: string; amountCents?: number }>;
  sources?: Record<string, unknown>;
  error?: string | null;
}

/** The seller's view of the latest run. A run older than a day starts a fresh one in the background. */
export async function reconciliationFor(seller: { id: string; paypalMerchantId: string | null; payoutStatus: string }): Promise<SellerReconciliation> {
  const { db } = services();
  const [last] = await db.select().from(schema.reconciliationRuns).orderBy(desc(schema.reconciliationRuns.id)).limit(1);
  if (!last || Date.now() - last.createdAt.getTime() > DAY_MS) void runReconciliation("dashboard").catch((e) => console.error("[reconcile] dashboard run failed", e));
  if (!last) return { state: "pending", matched: 0, mismatches: [], explained: [] };
  // Unattributed items landed in the platform account, which is where every shop not paid directly is paid (D-006).
  const mine = (x: { sellerId?: string; payeeMerchantId?: string }) =>
    x.sellerId ? x.sellerId === seller.id : x.payeeMerchantId ? x.payeeMerchantId === seller.paypalMerchantId : seller.payoutStatus !== "verified";
  const mismatches = (last.mismatches as unknown as StoredMismatch[]).filter(mine);
  const explained = (last.explained as unknown as Array<{ captureId: string; reason: string; amountCents?: number; sellerId?: string; payeeMerchantId?: string }>).filter(mine);
  const bySeller = (last.sources as { matchedBySeller?: Record<string, number> }).matchedBySeller ?? {};
  return {
    state: mismatches.length ? "mismatch" : last.ok ? "ok" : "incomplete",
    checkedAt: last.createdAt.toISOString(),
    matched: bySeller[seller.id] ?? 0,
    mismatches,
    explained,
    sources: last.sources,
    error: last.error,
  };
}
