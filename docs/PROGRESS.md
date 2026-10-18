# Progress log (D-085 autonomous run)

One 5-line report per item: done, tests, screenshots, risks, next. Newest last.

## #13 + #12: approval bug, refund re-walk, "link incomplete or expired" page (2026-10-18)
- **Done:**
  - Found and fixed the bug that left the owner's walkthrough order unpaid: v6 `presentationMode: "auto"` opened no PayPal window on about 1 in 5 fresh pay pages, and the button then stayed dead.
  - Now an explicit popup, a redirect fallback when it's blocked, and a "Continue in this tab" link (D-086).
  - Branded "This payment link is incomplete or expired" page, a branded site 404, and a "nothing was charged" message after a redirect cancel.
  - Render no longer redeploys on docs-only pushes (D-085).
- **Tests:**
  - `approval-checks` on Render. AP1 popup via `/shop` paid; AP1b refund re-walk (PayPal refund `1AN57176SK298430G` COMPLETED); AP2 redirect approval paid through `/pay/return`; AP4 dead ends 404 and branded, no order shown, no mobile overflow.
  - **On the fix deploy `06449ab`: 6/6.** AP1 popup on the first click; AP1b refund `12X63911H3080041X` COMPLETED; AP2 redirect; AP3 redirect cancel says nothing was charged and the checkout stays `created`; AP4 dead ends; **AP5 8 of 8 first clicks open PayPal**, and the escape link equals the order's `payer-action` link.
  - Unit tests: `paypal-presentation`.
- **Screenshots:** `docs/screenshots/approval/`.
- **Risks:** "auto" was PayPal's recommended mode. If the explicit popup is ever blocked, the redirect path carries the payment (proven by AP2).
- **Next:** #1 photos.

## #1: photos for every seeded listing (2026-10-18)
- **Done:**
  - CC0 museum photographs (Art Institute of Chicago, LACMA, The Met, via rawpixel/Openverse), a consistent look per seller.
  - Two more Fern & Loom listings; the seed uses the same photo pipeline as uploads.
  - PayPal's catalog now carries `image_url`, after a fix: `add`, not `replace` (D-087).
  - Credits in `apps/web/seed-photos/CREDITS.md` and the README.
- **Tests:** the seed ran on the production DB; `sync_catalog` 4/4 for Juniper Clay and 3/3 for Fern & Loom. `shop-checks` S2 checks that every product card's photo loads from `/img/`.
- **Screenshots:** `docs/screenshots/shop/S2-results-*.png`. The storefront and studio screens come in their own items.
- **Risks:** the photos are museum objects standing in for the sellers' work; the README says so. The owner's own photos (OWNER-TODO #3) go into the live photo-to-store and Telegram demos.
- **Next:** #2.

## #2: demo order history (2026-10-18)
- **Done:**
  - The demo seller's "Include test orders" switch (on by default; a cookie preference) and a "Test run" badge on each such order, in Orders and the dashboard.
  - `demo-history`: 8 new real sandbox orders (3 shipped with USPS tracking, 1 refunded by the seller).
- **Tests:** the dashboard AT G0 checks for orders and badges; real sellers never see test rows (`includeTestRowsFor`).
- **Screenshots:** in `docs/screenshots/dashboard/G0-*` with #3.
- **Risks:** nothing is backdated, so the 14-day charts fill up as the ATs keep running.
- **Next:** #4.

## #4: /shop rebuild (2026-10-18)
- **Done:**
  - Site nav; a 5-step rail that names its actors; photo-led product cards with "Buy this".
  - The checkout card with the PayPal button inline, turning into the paid state in place.
  - MCP calls collapsed to one line; suggestion cards; a mobile live-wire sheet (D-088).
- **Tests:** `shop-checks` on Render, 4/4 (S1 empty state, S2 results, S3 inline PayPal → paid, S4 closing PayPal charges nothing). The inner mobile sideways-scroll fix is re-run with #3's deploy.
- **Screenshots:** `docs/screenshots/shop/` (S1–S4 at desktop, 1920 and mobile).
- **Risks:** the hosted agent sometimes sets up the checkout straight from a search; the AT accepts both paths.
- **Next:** #3, the dashboard.
