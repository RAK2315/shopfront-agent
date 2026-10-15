import { studioTheme } from "ag-studio";
import { themeQuartz } from "ag-grid-community";

// The Shopfront design tokens (globals.css) applied to AG Studio and the ledger grid, so the dashboard reads as
// the same product: neutral off-white, ink text, one clay accent, Geist for data (D-037).
// AG Charts draws on canvas and parses colours itself, so tokens are resolved to concrete hex values at runtime
// (CSS variables and oklch() made its data engine fail: "str.toLowerCase is not a function").

function tokenHex(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const css = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
  if (!css) return fallback;
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return fallback;
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((x) => x!.toString(16).padStart(2, "0")).join("")}`;
}

function fontFamily(): string {
  if (typeof document === "undefined") return "Geist, ui-sans-serif, system-ui, sans-serif";
  const f = getComputedStyle(document.body).fontFamily;
  return f || "Geist, ui-sans-serif, system-ui, sans-serif";
}

function palette(colours: string[]) {
  return Object.fromEntries(colours.flatMap((c, i) => [[`chartPaletteFills${i + 1}Color`, c], [`chartPaletteStrokes${i + 1}Color`, c]]));
}

export function makeStudioTheme() {
  const t = (n: string, f: string) => tokenHex(n, f);
  const clay = t("clay", "#b0532f");
  // Start from Studio's default theme (it carries the icon set); only colours and fonts change.
  return studioTheme.withParams({
    fontFamily: fontFamily(),
    fontSize: 13,
    backgroundColor: t("surface", "#ffffff"),
    textColor: t("ink", "#2b2622"),
    borderColor: t("line", "#e3dfdb"),
    accentColor: clay,
    studioWrapperBackgroundColor: t("canvas", "#fafafa"),
    studioCanvasBackgroundColor: t("canvas", "#fafafa"),
    studioCanvasFontFamily: fontFamily(),
    studioPanelContainerBackgroundColor: t("surface", "#ffffff"),
    studioWidgetBackgroundColor: t("surface", "#ffffff"),
    studioToggleButtonActiveBackgroundColor: clay,
    studioToggleButtonActiveBorderColor: clay,
    studioToggleButtonActiveColor: clay,
    // One accent, then warm neutrals and the status hues: charts stay inside the palette (D-031).
    ...palette([clay, t("ink-2", "#5c544e"), t("success", "#3f7a52"), t("warning", "#8a6a1f"), t("clay-strong", "#93432a"), t("muted", "#7a726c")]),
    chartFontFamily: fontFamily(),
    chartTextColor: t("ink", "#2b2622"),
    chartSubtleTextColor: t("ink-2", "#5c544e"),
  } as never);
}

export function makeLedgerTheme() {
  const t = (n: string, f: string) => tokenHex(n, f);
  return themeQuartz.withParams({
    fontFamily: fontFamily(),
    fontSize: 13,
    backgroundColor: t("surface", "#ffffff"),
    foregroundColor: t("ink", "#2b2622"),
    borderColor: t("line", "#e3dfdb"),
    headerBackgroundColor: t("surface-2", "#f3f0ed"),
    headerFontWeight: 600,
    accentColor: t("clay", "#b0532f"),
    rowHoverColor: t("clay-soft", "#fbefea"),
    selectedRowBackgroundColor: t("clay-soft", "#fbefea"),
    wrapperBorderRadius: 8,
    spacing: 6,
  });
}
