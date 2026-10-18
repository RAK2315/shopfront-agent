import { z } from 'zod';

// The dashboard's "Ask" bar (walkthrough #3, D-089; PLAN AG Grid feature 4). A model turns the seller's words into
// this closed view description and nothing else: filters, grouping, sort, visible columns and one chart preset.
// Deterministic code applies it to the grid and charts. It can never change orders, prices or refunds.

export const GRID_COLUMNS = ['date', 'order', 'product', 'status', 'total', 'refunded', 'shipped', 'ship_by', 'note', 'paypal'] as const;
export const GRID_STATUSES = ['paid', 'shipped', 'partially_refunded', 'refunded', 'reversed'] as const;
export const GROUP_FIELDS = ['product', 'status', 'day', 'buyer_country'] as const;
export const SORT_FIELDS = ['date', 'total', 'refunded', 'product', 'status'] as const;
export const CHART_PRESETS = ['revenue_by_day', 'revenue_by_product', 'orders_by_status', 'refunds_by_product'] as const;

export const GridView = z.strictObject({
  last_days: z.number().int().min(1).max(90).nullable().describe('Only orders from the last N days; null = all'),
  statuses: z.array(z.enum(GRID_STATUSES)).max(5).nullable().describe('Only these order statuses; null = all'),
  product_contains: z.string().max(60).nullable().describe('Only orders whose product name contains this text'),
  min_total: z.number().min(0).max(100000).nullable(),
  max_total: z.number().min(0).max(100000).nullable(),
  shipped: z.enum(['yes', 'no']).nullable(),
  group_by: z.enum(GROUP_FIELDS).nullable(),
  sort: z.strictObject({ field: z.enum(SORT_FIELDS), dir: z.enum(['asc', 'desc']) }).nullable(),
  columns: z.array(z.enum(GRID_COLUMNS)).min(2).max(10).nullable().describe('Columns to show, in order; null = keep'),
  chart: z.enum(CHART_PRESETS).nullable().describe('The chart beside the grid'),
});
export type GridView = z.infer<typeof GridView>;

export const DashboardIntent = z.strictObject({
  kind: z.enum(['view', 'question']).describe('view = show/filter/group/sort/chart something; question = asks for figures (what sold, how much, how many)'),
  question_days: z.number().int().min(1).max(31).nullable().describe('For a question: the period in days (this week = 7, today = 1)'),
  view: GridView.nullable(),
  title: z.string().max(80).describe('A short title for the resulting view, e.g. "Unshipped orders over $50 · 7 days"'),
});
export type DashboardIntent = z.infer<typeof DashboardIntent>;

export const EMPTY_VIEW: GridView = { last_days: null, statuses: null, product_contains: null, min_total: null, max_total: null, shipped: null, group_by: null, sort: null, columns: null, chart: null };

const label = (s: string) => s.replace(/_/g, ' ');

/** "What changed" lines for the banner (and for the AT, which checks state, not pixels). */
export function describeViewChange(prev: GridView, next: GridView): string[] {
  const out: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(prev.last_days, next.last_days)) out.push(next.last_days ? `Filter: last ${next.last_days} day${next.last_days > 1 ? 's' : ''}` : 'Filter removed: any date');
  if (!same(prev.statuses, next.statuses)) out.push(next.statuses?.length ? `Filter: status is ${next.statuses.map(label).join(' or ')}` : 'Filter removed: any status');
  if (!same(prev.product_contains, next.product_contains)) out.push(next.product_contains ? `Filter: product contains "${next.product_contains}"` : 'Filter removed: any product');
  if (!same(prev.min_total, next.min_total) || !same(prev.max_total, next.max_total)) {
    out.push(next.min_total != null && next.max_total != null ? `Filter: total $${next.min_total}–$${next.max_total}` : next.min_total != null ? `Filter: total over $${next.min_total}` : next.max_total != null ? `Filter: total under $${next.max_total}` : 'Filter removed: any total');
  }
  if (!same(prev.shipped, next.shipped)) out.push(next.shipped ? `Filter: ${next.shipped === 'yes' ? 'shipped' : 'not shipped yet'}` : 'Filter removed: shipped or not');
  if (!same(prev.group_by, next.group_by)) out.push(next.group_by ? `Grouped by ${label(next.group_by)}` : 'Grouping removed');
  if (!same(prev.sort, next.sort)) out.push(next.sort ? `Sorted by ${next.sort.field}, ${next.sort.dir === 'desc' ? 'highest first' : 'lowest first'}` : 'Sort reset');
  if (next.columns && !same(prev.columns, next.columns)) out.push(`Columns: ${next.columns.map(label).join(', ')}`);
  if (!same(prev.chart, next.chart)) out.push(next.chart ? `Chart: ${label(next.chart)}` : 'Chart reset');
  return out;
}

/**
 * Apply an Ask result to the current view: what the seller asked for replaces the current value; what they didn't
 * mention stays. A view with nothing set ("show everything", "reset") clears back to the default.
 */
export function mergeView(current: GridView, next: GridView): GridView {
  const keys = Object.keys(EMPTY_VIEW) as Array<keyof GridView>;
  if (keys.every((k) => next[k] === null)) return EMPTY_VIEW;
  const out = { ...current };
  for (const k of keys) if (next[k] !== null) (out as Record<string, unknown>)[k] = next[k];
  return out;
}
