// "What changed" on the AG Studio report (review v2 fix #5): a plain-words list of the durable changes between two
// report states (widgets, layout, filters, pages). View state (the selected page, open panels) is not a change.

type Widget = { type?: string; dataMapping?: unknown; format?: { title?: { text?: string } }; sort?: unknown };
type Page = { id: string; widgets?: Record<string, Widget>; widgetLayout?: Record<string, unknown>; filter?: { page?: unknown[]; widget?: Record<string, unknown[]> } };
export type ReportLike = { pages?: Page[] };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const TYPE_NAMES: Record<string, string> = { value: "KPI", grid: "table", "pivot-grid": "pivot table", text: "text", "date-filter": "date filter", "button-filter": "filter buttons" };
export const widgetName = (w: Widget | undefined, id: string) =>
  w?.format?.title?.text?.trim() || (w?.type ? (TYPE_NAMES[w.type] ?? w.type.replace(/^shopfront-/, "").replace(/-/g, " ")) : id);

/** Every durable change, in reading order. `pageLabel` names a page for the reader. */
export function diffReport(before: ReportLike, after: ReportLike, pageLabel: (id: string) => string = (id) => id): string[] {
  const out: string[] = [];
  const prev = new Map((before.pages ?? []).map((p) => [p.id, p]));
  const next = new Map((after.pages ?? []).map((p) => [p.id, p]));
  for (const [id] of prev) if (!next.has(id)) out.push(`Removed page ${pageLabel(id)}`);
  for (const [id, p] of next) {
    const q = prev.get(id);
    const where = pageLabel(id);
    if (!q) {
      out.push(`Added page ${where}`);
      continue;
    }
    const a = q.widgets ?? {};
    const b = p.widgets ?? {};
    let moved = 0;
    for (const w of Object.keys(b)) {
      if (!(w in a)) out.push(`${where}: added “${widgetName(b[w], w)}”`);
      else if (!same({ ...a[w], format: undefined, title: undefined }, { ...b[w], format: undefined, title: undefined }) || !same(a[w]?.format, b[w]?.format)) {
        const renamed = widgetName(a[w], w) !== widgetName(b[w], w);
        out.push(renamed ? `${where}: renamed “${widgetName(a[w], w)}” to “${widgetName(b[w], w)}”` : `${where}: changed “${widgetName(b[w], w)}”`);
      } else if (!same(q.widgetLayout?.[w], p.widgetLayout?.[w])) moved++;
    }
    for (const w of Object.keys(a)) if (!(w in b)) out.push(`${where}: removed “${widgetName(a[w], w)}”`);
    if (moved) out.push(`${where}: moved or resized ${moved} widget${moved === 1 ? "" : "s"}`);
    if (!same(q.filter?.page, p.filter?.page)) out.push(`${where}: ${(p.filter?.page ?? []).length ? "changed the page filters" : "cleared the page filters"}`);
    const wf = new Set([...Object.keys(q.filter?.widget ?? {}), ...Object.keys(p.filter?.widget ?? {})]);
    for (const w of wf) {
      if (!(w in b)) continue; // a removed widget's filter goes with it
      const had = q.filter?.widget?.[w] ?? [];
      const has = p.filter?.widget?.[w] ?? [];
      if (!same(had, has)) out.push(`${where}: ${has.length ? "filtered" : "unfiltered"} “${widgetName(b[w], w)}”`);
    }
  }
  return out;
}
