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

## Phases 9–13: screens, states and motion (re-planned 2026-10-17 in the owner's order, D-071; PLAN.md Phases 9–13)

Rules for every new screen:
- **One primary message per screen.** A judge must get it in under 3 seconds, at 1080p in the video and on a phone.
- **Same tokens, no new colours.** Clay is the single accent. PayPal blue only on real PayPal elements and ids. Status is never shown by colour alone: there's always an icon and a label.
- **Two registers:**
  - **Craft retail:** seller and storefront pages, the buyer's consent page.
  - **Live ops console:** the wire, the arena, the agent views. Rendered on the ink panel.
  - **The seller's phone (Phase 10):** Telegram messages and buttons. Our words, our buttons; Telegram's chrome is never shown in the video (S6.4).
- **Three layouts for every screen:**
  - **Desktop:** 1440 wide.
  - **Mobile:** 390 wide. Single column; primary actions in the thumb zone; no horizontal scroll.
  - **Capture:** 1920×1080, as a `/capture` pane (960 px each) or full-bleed.
- **Reduced motion:** every animation below falls back to an instant change or a 150 ms crossfade.

### Review-fix lane (REVIEW-1 leftovers; PLAN "Review-fix lane")
| Screen / state | Register | 3-second message | Notes |
|---|---|---|---|
| `/live` and the landing hero, grouped expiries | Console | "Real payments, verified": paid, verified and refunded rows on top | Repeated "Checkout expired" collapses into one row with a count chip ("6 unpaid checkouts expired · nothing charged"), expandable. |
| Source badges ✅ (D-070, 2026-10-17) | Console | Which AI answered, in plain words | "Live · Groq", "Live · Gemini", "Answered before" (cache), "Replayed recording" (only when a recording served the step). The `panel` tone. |
| `/shop` timeline scope | Console | "This is your session" | A segmented control, "Your session · Everyone", at the top right of the ink panel. Defaults to the visitor's session. |
| Hack-demo result | Product | **"Protected: 3 of 3 blocked"** | A success-tone card with a shield icon. Each attempt is a row with a check and "blocked by server · unknown field `price`". No error pink. |
| Dashboard view mode | Console + AG Studio | "What sold, from where" | The Compose panel is collapsed, nothing is selected, and an "Edit layout" ghost button sits in the header. Loading uses a skeleton of the layout (4 tiles, 2 charts, ledger rows), not text. |
| Seller page frame | Craft retail | Where am I in my shop | One header across Listings, Orders and Dashboard: shop name in Alegreya, `SellerNav`, and the same max width (76 rem; the dashboard is full-bleed under the same header). |
| Orders grouping | Craft retail | "What do I ship today" | "To ship · N" first, then "Done", which is collapsed and shows a count. |

### Phase 9: each seller paid directly (the Partial path, D-076; screens wait for the owner's UI review)
No partner "Connect PayPal" button: Partner Referrals is gated for us (D-075). No fee anywhere: Shopfront takes no cut.

| Screen / state | Register | 3-second message | Layout |
|---|---|---|---|
| **Studio "Get paid" card**, not set | Craft retail | **"Where should buyers pay you?"** | One field (your PayPal email or merchant id), a primary "Save", and three plain steps: add your PayPal, first sale confirms it, done. Not PayPal blue: it's our form, not a PayPal element. |
| Set, unverified | Craft retail | "Saved: your first sale confirms it" | A warning-tone pill with an icon, "Unverified until your first sale". |
| Verified | Craft retail | **"Payments go straight to your PayPal"** | A success pill, the merchant id chip (PayPal tone: a real PayPal id), and "Shopfront takes no cut". |
| Storefront line | Craft retail | "Paid directly to Fern & Loom through PayPal" | One quiet line under the shop meta. |
| **Orders: refund handoff** | Craft retail | **"Refund $28.00 in your PayPal"** | The policy decision in words ("Wrong size · inside your policy"), then one primary button, **"Refund in your PayPal ↗"** (opens the PayPal transaction), then "We'll mark it done when PayPal tells us". Once done: "✓ Refunded by you in PayPal · refund `9CW…`". |
| **Wire row: direct payment** | Console | **"$37.00 → Fern & Loom's PayPal"** | A PayPal-tone payee chip with the merchant id. No fee chip. |
| Wire row: seller refund | Console | "Refunded by the seller in PayPal · $28.00" | Actor "Seller · PayPal", with the PayPal refund id chip. |

**Motion:** none new. The direct-payment row slides in like every wire row.

### Phase 10: seller copilot on Telegram (the lead story, D-072)
The chat is a third surface: **the seller's phone.** Telegram draws the chrome; we control the words, the photos we send, and the buttons. The same register rules apply: craft retail for the seller's own shop, plain and warm, with figures in tabular style.

**Message rules:**
- **One job per message,** at most 4 short lines. The first line says what happened ("New order", "Draft ready", "Refund needs you").
- **Money is always the server's figure,** written as `$37.00`. Prices from the AI are written "AI guess $32" until she confirms.
- **IDs go in monospace** (Telegram `code` entity) and only when they are real PayPal ids: the order, capture, catalog or tracker id. Never our internal ids.
- **Buttons are verbs with the amount:** `Confirm $32`, `Approve $95`, `Add tracking`, `Decline`. At most 3 per row, with the primary first. A tapped button is replaced by its result ("✓ Approved · refund 9XY… · 12:04"), so the chat reads as a log.
- **No emoji** except the ✓ and ⚠ status marks, which always come with words (status is never shown by a symbol alone).
- **Low confidence** is written in words: "Check this: material (62% sure)".

| Message / state | 3-second message | Layout (Telegram text and inline keyboard) |
|---|---|---|
| **Draft ready** (after a photo) | **"Draft ready: confirm the price"** | Our photo crop (the seller's own photo, resized), then **Cobalt drip mug**, "Stoneware · 12 oz · blue glaze", "Check this: glaze colour (62% sure)", "Price: AI guess $32". Buttons: `[Confirm $32]` `[Change price]` / `[Discard]`. |
| Live | **"Live: buyable by any AI agent"** | "✓ Live · $32.00 · PayPal catalog `PROD-…`", plus the storefront link. No buttons. |
| **New order** | **"New order · paid, webhook verified"** | "Cobalt drip mug × 1 · $37.00", "Ships to Austin, US", "PayPal order `5O1…`". Buttons: `[Add tracking]` `[Open order]`. |
| Label read | **"UPS 1Z… · confirm?"** | The carrier and number as read, plus "from your label photo". Buttons: `[Confirm and add to PayPal]` `[Edit]`. |
| Tracking added | "Tracking is on the PayPal order" | "✓ UPS 1Z… · PayPal tracker `…`". |
| **Refund needs you** | **"Refund $95.00 needs you"** | The buyer's words in quotes (data, never instructions), then "Policy: over your $50 automatic limit". Buttons: `[Approve $95]` `[Decline]`. |
| Automatic refund (info) | "Refunded $28.00 automatically" | "Wrong size · inside your policy · PayPal refund `…`". No buttons. |
| Answer | Figures with sources | Plain text. Each figure carries `[db]` or `[paypal]`. At most 5 lines, plus "Open dashboard". |
| Refusal | "I can't do that from chat" | "Use the buttons on the order. Money only moves when you tap." |
| Expired or used button | "That button has expired" | It is never silent: answerCallbackQuery shows a toast, and nothing runs. |

**On the web, `/studio` "Connect Telegram" card** (craft retail): "Run your shop from your phone". It shows a QR code (desktop) or an "Open in Telegram" button (mobile), the 10-minute code countdown, and, once linked, "✓ Connected · @handle · Disconnect". The card is ink on surface; the QR is drawn with ink modules, never PayPal blue.

**Wire rows:** actor "Seller · Telegram", with a phone glyph in clay. For example: "Approved refund $95.00 in Telegram". The chat text never goes on the public wire.

**Capture (1080p):**
- A portrait phone clip, cropped to the conversation (S6.4, DEMO-SCRIPT v3), centred on the canvas at 1000 px tall, with the `/live` strip on the right.
- Captions stay in the reserved band (PLAN Phase 8 task 3).

### Phase 11: agent reorder with Vault
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

### Phase 12: dispute defense agent: ✂ CUT (D-079, 2026-10-18; kept for the record only)
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

### Phase 13: adversarial agent arena: replaced by Phase 13 lite (D-079)
> **There's no `/arena` screen.** The `/shop` hack card (DESIGN "Review-fix lane", D-074) grows to about 12 attacks with a pass-rate line ("Protected: 12 of 12 blocked"). Its rows reuse the tile states below: the success tone with a shield for BLOCKED, and the danger tone for ALLOWED, with the guardrail in plain words. The rows reveal in the order their results arrive, with a crossfade under reduced motion. The `/arena` rows below are kept for the record only.

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

### AG Grid "Best Use" (D-077; build Oct 22–24 after the owner's review)
The grid on `/studio/dashboard` is where the seller works. Console density inside the craft frame; the Shopfront ledger theme (`makeLedgerTheme`).

| Element | 3-second message | Notes |
|---|---|---|
| **Editable cells** | "Change it here; PayPal follows" | A ✎ affordance on editable columns. Description, category and image sync to the PayPal Catalog, and each row has a sync cell: a spinner and "syncing", then a ✓ with "synced" and the PayPal request id chip, or a ⚠ with "failed · retry". Price and stock cells carry a small "next order" note: PayPal's catalog has no price field, so we never imply it does. |
| **Live rows** | "Orders arrive by themselves" | A new row flashes with a clay-soft background that fades over 1.2 s. The status cell crossfades PENDING → PAID → SHIPPED → REFUNDED, each with an icon and a label. Reduced motion: no flash, an instant change. |
| **Master-detail** | "Everything PayPal did for this order" | A vertical rail inside the detail row (order → capture → tracking → refund → dispute), each node with its PayPal id chip (PayPal tone), time and status. |
| **Ask the grid** | "Say what you want to see" | One input above the grid ("show unshipped orders over $50 this week"). The resulting state shows as removable chips (filter, group, pivot), so the seller can see and undo what the AI did. The AI changes the view only. |
| **Charts** | "What sells" | A sparkline column per product (ink line, clay last point), and a pivot panel by product × status with `$` totals in tabular figures. |
| **View mode on open** | "What sold, from where" | REVIEW-1 #6: Compose collapsed, a skeleton while loading, KPIs at $0.00 when empty. |

### Visual richness (D-078; owner: "the UI reads as a wireframe"; build Oct 30–31 after the owner's review)
| # | Surface | Before (review pack, 2026-10-17) | After |
|---|---|---|---|
| 1 | **Chat product cards** (`/shop`) | A letter tile, title and "from $32.00" in a small card; no seller and no variants (`shop-checkout-card-desktop.png`) | The photo (4:5) leads. Title in Alegreya, the seller name with a shop glyph, variant chips (glaze or size, sold-out struck through), price in tabular figures, an in-stock dot with a label. Two cards per row on desktop, a horizontal scroller on mobile. |
| 2 | **Inline checkout card** | Totals list plus a navy "Review and pay with PayPal" link that opens `/pay` in a new tab | A card with the item photo thumbnail, line items, a **Items / Shipping / Total** breakdown (total in display size, "set by the shop" underneath), and the real PayPal button inline (the JS SDK v6 button, PayPal's own styling) once the buyer opens the card. `/pay` stays as the fallback and the consent record. |
| 3 | **`/shop` layout** | A chat column with large empty areas; starters in a loose pill cloud; the hack button competes with the header | The chat column max width is 46 rem, with the timeline wider. Starters become 2×2 suggestion cards with an icon each. The empty state shows what the agent can do in 3 lines. The hack button moves to a quieter secondary slot (pending the owner's Q4). |
| 4 | **Live wire weight** | Every row the same: ink panel, small glyphs, PayPal rows blue only in their chips | One muted tint per system, each always with its icon and label: agent (clay), MCP (stone), **PayPal** (PayPal blue: a real PayPal event), webhook (green-grey). **PayPal rows are dominant:** larger title, a left rule in PayPal blue, the order and capture ids on top. A **packet** (a 6 px dot) travels down the rail from step to step, driven only by real SSE arrivals. Reduced motion: no packet, an instant row. |
| 5 | **Photos** | Letter placeholders everywhere (storefront, product page, studio, chat) | The owner's photos the day they land (AT-3). Each tile keeps its 4:5 crop, and a warm empty state stays for listings without a photo. |

Rules: no new accent (the per-system tints are low-chroma and never carry status alone), PayPal blue only on PayPal events and elements, one orchestrated motion per surface.
