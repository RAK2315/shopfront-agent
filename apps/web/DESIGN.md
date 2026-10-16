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
- **SellerNav:** the one navigation on seller pages (Listings, Orders, Dashboard, Storefront, Live wire). The current page is ink with a clay underline and `aria-current="page"`; the others are ink-2.
- **TimelineEvent:** actor glyph and name, summary, IDs, AI source badge, relative time. Slides in. Rendered on the ink panel.

## Z-index scale

`--z-sticky 10` · `--z-dropdown 20` · `--z-overlay 30` · `--z-modal 40` · `--z-toast 50` · `--z-tooltip 60`

## Phases 9–13: screens, states and motion (planned 2026-10-16; PLAN.md Phases 9–13)

Rules for every new screen:
- **One primary message per screen.** A judge must get it in under 3 seconds, at 1080p in the video and on a phone.
- **Same tokens, no new colours.** Clay is the single accent. PayPal blue only on real PayPal elements and ids. Status is never shown by colour alone: there's always an icon and a label.
- **Two registers:**
  - **Craft retail:** seller and storefront pages, the buyer's consent page.
  - **Live ops console:** the wire, the arena, the agent views. Rendered on the ink panel.
- **Three layouts for every screen:**
  - **Desktop:** 1440 wide.
  - **Mobile:** 390 wide. Single column; primary actions in the thumb zone; no horizontal scroll.
  - **Capture:** 1920×1080, as a `/capture` pane (960 px each) or full-bleed.
- **Reduced motion:** every animation below falls back to an instant change or a 150 ms crossfade.

### Phase 9: review fixes
| Screen / state | Register | 3-second message | Notes |
|---|---|---|---|
| `/live` and the landing hero, grouped expiries | Console | "Real payments, verified": paid, verified and refunded rows on top | Repeated "Checkout expired" collapses into one row with a count chip ("6 unpaid checkouts expired · nothing charged"), expandable. |
| Source badges | Console | Which AI answered, in plain words | "Live · Groq", "Live · Gemini", "Answered before" (cache), "Replayed recording" (replay mode only, with a tooltip saying why). The `panel` tone. |
| `/shop` timeline scope | Console | "This is your session" | A segmented control, "Your session · Everyone", at the top right of the ink panel. Defaults to the visitor's session. |
| Hack-demo result | Product | **"Protected: 3 of 3 blocked"** | A success-tone card with a shield icon. Each attempt is a row with a check and "blocked by server · unknown field `price`". No error pink. |
| Dashboard view mode | Console + AG Studio | "What sold, from where" | The Compose panel is collapsed, nothing is selected, and an "Edit layout" ghost button sits in the header. Loading uses a skeleton of the layout (4 tiles, 2 charts, ledger rows), not text. |
| Seller page frame | Craft retail | Where am I in my shop | One header across Listings, Orders and Dashboard: shop name in Alegreya, `SellerNav`, and the same max width (76 rem; the dashboard is full-bleed under the same header). |
| Orders grouping | Craft retail | "What do I ship today" | "To ship · N" first, then "Done", which is collapsed and shows a count. |

### Phase 10: agent reorder with Vault
| Screen / state | Register | 3-second message | Layout |
|---|---|---|---|
| **Consent step** (on `/pay/[id]` after "Payment complete") | Craft retail | **"Let your agent reorder, up to $X"** | A card under the receipt: a cap stepper ($25 / $50 / $100, or custom), a period ("every 30 days"), an expiry (90 days), then the PayPal save button (PayPal blue, the PayPal element) and "Not now" (ghost). Copy: "Your agent can buy again without a popup, only up to this cap. Revoke any time." |
| **`/consent/[token]`** | Craft retail | **"$37 of $100 used · active"** | A big cap meter at the top, status pill, expiry, and **Revoke** (danger, full width on mobile, bottom of the screen). Below: the per-agent audit log, a list of `agent · item · amount · decision · time · PayPal order id` with decision badges (charged, over cap, revoked, expired, declined). |
| Revoked state | Craft retail | **"Revoked: your agent needs the popup again"** | The meter greys out to the line colour, a pill reads "Revoked · PayPal token deleted", and a RequestId chip holds the deleted token id. |
| **Wire row: popup-free reorder** | Console | **"Paid with no popup · inside consent"** | Agent → MCP → PayPal → webhook glyphs on one rail, a clay "no popup" badge, and "inside consent · $37 of $100". |

**Motion:**
- **The cap filling up:** the meter's fill animates from the old used amount to the new one (420 ms, ease-out-expo). The number counts up in tabular figures. Passing 80% switches the tone to warning, with an icon and the label "near cap".
- **A popup-free reorder flowing through the wire:** a small clay packet travels the 4-node rail (agent → MCP → PayPal → webhook) in about 900 ms. Each node lights up as its real event arrives over SSE. The motion follows the events and is never a timer. The row then settles with "no popup".
- **Over the cap:** the packet stops at the MCP node with a calm "cap reached → popup" label, and the pay card appears in the chat.

**Capture (1080p):** left pane `/shop` ("restock my usual"), right pane `/consent/[token]` with the meter, or `/live` with the rail.

### Phase 11: dispute defense agent
| Screen / state | Register | 3-second message | Layout |
|---|---|---|---|
| **`/studio/disputes` list** | Craft retail | **"1 dispute needs your answer by Nov 2"** | Rows: item photo, reason in plain words ("Buyer says it never arrived"), amount, due date and stage pill. Open disputes first. |
| **Dispute detail** | Craft retail with a console strip | **"Evidence ready: approve to send"** | Left: the evidence pack as stacked cards (tracking + carrier + PayPal tracker id; delivery status; the chat transcript excerpt; listing photo; order snapshot). Each card carries a `db`/`paypal` source chip. Right (bottom on mobile): the draft, labelled "AI draft · you approve", the facts line appended by code in tabular figures, then **Approve and submit** (primary) and "Accept claim instead" (secondary). |
| Gap state | Craft retail | **"No tracking: the agent suggests accepting"** | The missing card is an outlined placeholder ("No tracking on this order") with a warning icon. The recommendation is text; the seller decides. |
| Submitted / resolved | Craft retail | **"Sent to PayPal · under review"**, then **"Resolved in your favour"** or **"Refunded to buyer"** | Status pill plus PayPal ids (PayPal tone). |

**Motion:**
- **The evidence pack assembling card by card:** each card slides in as its fetch resolves (opacity plus 8 px, 220 ms, staggered by real arrival, not a fixed delay). Its source chip ticks from "fetching" to `db` or `paypal`.
- When the pack is complete, the draft fades in.
- Approve sends a packet along the wire to "PayPal · provide-evidence".

**Capture (1080p):** full-bleed detail, the pack on the left, the draft on the right.

### Phase 12: multi-seller payouts
| Screen / state | Register | 3-second message | Layout |
|---|---|---|---|
| **`/studio/payouts`** (not connected) | Craft retail | **"Get paid directly: connect PayPal"** | One PayPal-blue "Connect PayPal" button (a PayPal element), and three plain steps (connect, confirm email, done). |
| Connected | Craft retail | **"Payments go straight to your PayPal"** | A success pill, the merchant id chip (PayPal tone), and the fee rule in plain words ("Shopfront keeps 5%, minimum $0.30"). Below: the fee ledger (AG Grid, the console density inside the craft frame). |
| Storefront line | Craft retail | "Paid directly to Fern & Loom through PayPal" | One quiet line under the shop meta. |
| **Wire row: split** | Console | **"$42 → Fern & Loom · $2.10 fee → Shopfront"** | Two PayPal-tone chips: payee and fee. |

**Motion:** the capture row splits into two chips (payee and fee), with widths proportional to the amounts, 300 ms. No other new motion.

**Capture (1080p):** right pane `/live` shows the split row while the left pane buys from seller 2.

### Phase 13: adversarial agent arena
| Screen / state | Register | 3-second message | Layout |
|---|---|---|---|
| **`/arena` idle** | Console | **"50 attacks. Run them live."** | Ink panel. The pass-rate figure from the last run ("50 / 50 blocked · Nov 3 14:02"), a **Run the arena** button (primary; disabled during cooldown, with a countdown), and the grid of 50 tiles grouped by category headings (7 groups). |
| Running | Console | **"Attack 23 of 50 · all blocked so far"** | A progress line, the current tile pulsing, a counter in tabular figures. |
| Tile states | Console | BLOCKED or ALLOWED | **Blocked:** success tone, shield icon, "BLOCKED", and the guardrail ("schema: unknown field `price`"). **Allowed:** danger tone, warning icon, "ALLOWED", pinned to the top as a bug. Pending: line colour. |
| Tile detail (click or Enter) | Console | What was tried, what caught it | A drawer: the request (redacted), the response, the guardrail, and the PayPal request id and debug id chips where relevant. |

**Motion:**
- **Attacks flipping to BLOCKED:** each tile flips (rotateX 180°, 320 ms, ease-out-quart) the moment its result event arrives. The back face shows the result.
- The pass-rate figure counts up.
- Reduced motion: a crossfade with no rotation.

**Layouts:**
- **Capture (1080p):** full-bleed board, 10 × 5 tiles, readable at 1080p (tile text ≥ 18 px).
- **Desktop:** 10 columns.
- **Mobile:** 2 columns grouped by category, with a sticky pass-rate bar.
