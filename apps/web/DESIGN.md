# Design system — Shopfront Agent

> Seed v1 (2026-10-15). The source of truth for tokens is `src/app/globals.css`; this file explains them. Living style guide: `/design`.

## Theme

- **Scene:** a maker at a bench-side laptop in daylight, checking orders between firings. A judge watches a split-screen video on a monitor. Light theme.
- **Live feed:** the timeline uses an inverted **ink panel**, the one place where the console "window" looks like a running system.
- **Colour strategy:** *Restrained.* Neutral off-white surfaces, ink text, **one clay accent** (at most ~10% of any screen) for primary actions, selection and the agent's own activity.
- **Blue is reserved for PayPal.**

## Colour (OKLCH)

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `oklch(0.985 0 0)` | page background (neutral off-white, chroma 0) |
| `--color-surface` | `oklch(1 0 0)` | raised content (product cards, panels) |
| `--color-surface-2` | `oklch(0.962 0.006 45)` | second neutral layer: sidebars, toolbars, grid headers |
| `--color-line` / `--color-line-strong` | `oklch(0.905 0.006 45)` / `oklch(0.84 0.008 45)` | hairlines, dividers |
| `--color-ink` | `oklch(0.22 0.012 45)` | primary text |
| `--color-ink-2` | `oklch(0.42 0.012 45)` | secondary text (~7:1 on canvas) |
| `--color-muted` | `oklch(0.52 0.01 45)` | tertiary text and placeholders (≥4.5:1 on canvas) |
| `--color-clay` | `oklch(0.56 0.14 40)` | THE accent: primary buttons, selection, agent actor |
| `--color-clay-strong` | `oklch(0.49 0.14 40)` | hover/pressed; clay text on light backgrounds |
| `--color-clay-soft` | `oklch(0.955 0.03 40)` | selected rows, clay badges |
| `--color-success` / `-soft` | `oklch(0.50 0.11 150)` / `oklch(0.955 0.035 150)` | paid, verified, webhook |
| `--color-warning` / `-soft` | `oklch(0.50 0.11 70)` / `oklch(0.96 0.055 85)` | **low AI confidence**, pending, needs seller |
| `--color-danger` / `-soft` | `oklch(0.53 0.17 27)` / `oklch(0.955 0.03 27)` | declined, conflict, refund denied |
| `--color-paypal` / `-bright` / `-soft` | `oklch(0.33 0.13 262)` / `oklch(0.55 0.19 255)` / `oklch(0.955 0.025 255)` | **only** PayPal elements and PayPal IDs |
| `--color-ink-panel` / `-text` / `-muted` / `-line` | `oklch(0.19 0.01 45)` / `oklch(0.94 0.004 45)` / `oklch(0.72 0.01 45)` / `oklch(0.30 0.01 45)` | live timeline panel |

## Typography

| Role | Family | Use |
|---|---|---|
| Display / storefront headings | **Alegreya** (variable serif, calligraphic, book-like warmth) | onboarding, storefront, product names on cards, page titles |
| UI and data | **Geist** (sans, tabular figures) | everything in the console: labels, buttons, tables, numbers |
| Identifiers | **Geist Mono** | request IDs, PayPal order and capture IDs, debug IDs, SKUs. Never decoration. |

- **Scale (1.2, fixed rem):** 0.75 / 0.8125 / 0.875 (UI base) / 1 / 1.2 / 1.44 / 1.728 rem.
- **Display steps (brand surfaces only):** `clamp(2rem, 1.4rem + 2.6vw, 3.75rem)` and `clamp(2.6rem, 1.6rem + 4vw, 5.25rem)`.
- Numbers always use `font-variant-numeric: tabular-nums`. `text-wrap: balance` on headings, `pretty` on prose. Prose max width is 68ch.

## Shape and depth

- **Radius (shared):** `--radius-sm 6px` (chips, inputs), `--radius-md 10px` (buttons, panels), `--radius-lg 16px` (product cards, photo tiles), `--radius-pill`.
- **Elevation:** hairline borders first. Shadows only for floating layers: `--shadow-float` for popovers and the drag preview of the photo→card morph.

## Motion

- `--ease-out-quart cubic-bezier(0.25,1,0.5,1)`, `--ease-out-expo cubic-bezier(0.16,1,0.3,1)`. Durations: `--dur-fast 150ms`, `--dur-base 220ms`, `--dur-slow 420ms`.
- **Console:** motion conveys state only (a new timeline event slides in, status pills crossfade, a live dot pulses while connected).
- **Brand:** one orchestrated moment, the photo → product-card morph (Motion `layoutId`).
- `prefers-reduced-motion`: transitions become instant or opacity-only, and the pulse stops.

## Components (base set, see `/design`)

- **Button:** primary (clay) / secondary / ghost / danger / paypal (reserved). States: hover, focus-visible ring, active, disabled, loading.
- **Badge:** neutral / clay / success / warning / danger / paypal. Always text, optionally an icon.
- **StatusPill:** checkout status → tone, icon and label. Animates on change.
- **Money:** integer cents → `$28.00`, tabular, optional currency code.
- **ConfidenceField:** AI-extracted value with a confidence meter. Below 0.75 it gets a warning tint, an icon and a "Check this" label. Prices always show "AI guess" until confirmed.
- **RequestId:** mono chip with a kind label, middle truncation and a copy button. PayPal IDs use the PayPal tone.
- **TimelineEvent:** actor glyph and name, summary, IDs, AI source badge, relative time. Slides in. Rendered on the ink panel.

## Z-index scale

`--z-sticky 10` · `--z-dropdown 20` · `--z-overlay 30` · `--z-modal 40` · `--z-toast 50` · `--z-tooltip 60`
