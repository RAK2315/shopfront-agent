import { describe, expect, it } from 'vitest';
import { DashboardIntent, describeViewChange, EMPTY_VIEW, GridView, mergeView } from './grid-view';

describe('GridView (dashboard Ask bar, D-089)', () => {
  it('accepts a full view and rejects anything that is not view state', () => {
    const v = { ...EMPTY_VIEW, last_days: 7, shipped: 'no', min_total: 50, group_by: 'product' };
    expect(GridView.parse(v)).toEqual(v);
    expect(() => GridView.parse({ ...v, price: 0 })).toThrow();
    expect(() => GridView.parse({ ...v, statuses: ['free'] })).toThrow();
    expect(() => DashboardIntent.parse({ kind: 'refund', question_days: null, view: null, title: 'x' })).toThrow();
  });
  it('describes what changed in plain words', () => {
    const next = { ...EMPTY_VIEW, last_days: 7, shipped: 'no' as const, min_total: 50, group_by: 'product' as const, sort: { field: 'total' as const, dir: 'desc' as const } };
    expect(describeViewChange(EMPTY_VIEW, next)).toEqual(['Filter: last 7 days', 'Filter: total over $50', 'Filter: not shipped yet', 'Grouped by product', 'Sorted by total, highest first']);
    expect(describeViewChange(next, next)).toEqual([]);
    expect(describeViewChange(next, EMPTY_VIEW)).toContain('Grouping removed');
  });
  it('keeps the current columns when the model leaves them out', () => {
    const cur = { ...EMPTY_VIEW, columns: ['date', 'total'] as GridView['columns'] };
    expect(mergeView(cur, { ...EMPTY_VIEW, last_days: 1 }).columns).toEqual(['date', 'total']);
  });
});
