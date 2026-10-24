import { describe, expect, it } from "vitest";
import { diffReport, type ReportLike } from "./report-diff";

const kpi = (text: string) => ({ type: "value", dataMapping: { value: [{ id: "orders.total_usd", aggregation: "sum" }] }, format: { title: { text } } });
const base = (): ReportLike & { selectedPageId: string } => ({
  selectedPageId: "overview",
  pages: [
    { id: "overview", widgets: { revenue: kpi("Revenue"), wire: { type: "shopfront-timeline", dataMapping: {} } }, widgetLayout: { revenue: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 7 }, wire: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 7 } } },
    { id: "orders", widgets: {}, widgetLayout: {} },
  ],
});
const label = (id: string) => ({ overview: "Overview", orders: "Orders" })[id] ?? id;

describe("diffReport (review fix #5)", () => {
  it("reports nothing for view-only changes (the selected page)", () => {
    const b = base();
    expect(diffReport(base(), { ...b, selectedPageId: "orders" } as ReportLike, label)).toEqual([]);
  });
  it("names added, removed, changed and renamed widgets by their titles", () => {
    const b = base();
    const p = b.pages![0]!;
    p.widgets!.ai = { type: "column-chart-grouped", dataMapping: {}, format: { title: { text: "Refunds by product · 7 days" } } };
    p.widgetLayout!.ai = { xTrack: 0, yTrack: 0, xSpan: 12, ySpan: 22 };
    delete p.widgets!.wire;
    p.widgets!.revenue = kpi("Revenue · 90 days");
    expect(diffReport(base(), b, label)).toEqual(["Overview: renamed “Revenue” to “Revenue · 90 days”", "Overview: added “Refunds by product · 7 days”", "Overview: removed “timeline”"]);
  });
  it("counts layout-only moves, and reports filters and pages", () => {
    const b = base();
    const p = b.pages![0]!;
    (p.widgetLayout!.revenue as { yTrack: number }).yTrack = 9;
    p.filter = { page: [{ field: { id: "orders.status" } }], widget: { revenue: [{ field: { id: "orders.date" } }] } };
    b.pages!.push({ id: "extra" });
    expect(diffReport(base(), b, label)).toEqual(["Overview: moved or resized 1 widget", "Overview: changed the page filters", "Overview: filtered “Revenue”", "Added page extra"]);
    expect(diffReport(b, base(), label)).toContain("Removed page extra");
    expect(diffReport(b, base(), label)).toContain("Overview: unfiltered “Revenue”");
  });
});
