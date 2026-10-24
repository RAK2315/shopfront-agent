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

## #3: dashboard v2 = AG Grid "Best Use" (2026-10-18)
- **Done:**
  - The Overview tab:
    - an Ask bar (LLM → schema-checked view state; figures written by code), with a what-changed banner and Undo;
    - KPI cards;
    - the orders grid (grouping, drill-down PayPal history, live flashes, inline note/ship-by);
    - a linked AG Charts chart with click-to-drill;
    - the listings grid with PayPal catalog write-back.
  - The Builder tab is AG Studio with its agents. Enterprise modules sit behind the BOTH-key guard (D-089).
- **Tests:**
  - `dashboard-checks` on Render, 9/9: G0 real data / no watermark; G1 write-back + injection refused + price applies to the next checkout; G2 live row in 128 ms; G3 drill-down refund id; G4a Ask/Undo; G4b `[db]`/`[paypal]`; G4c 10 injection prompts with money unchanged; G5 linked totals; G6 no overflow + Builder loads.
  - Bug found and fixed on the way: the sync cell never redrew on error.
- **Screenshots:** `docs/screenshots/dashboard/`.
- **Risks:** Community until the owner's `BOTH` key arrives (OWNER-TODO #1); with it, the guard switches Enterprise on by itself. AT-5 is re-run on the Builder tab in the final regression.
- **Next:** #9.

## #9: studio editor (2026-10-18)
- **Done:** a step rail, a drop zone with real photos, AI markers and a legend, grouped fields, a must-confirm price block, a success panel, a sticky Publish on phones (D-090).
- **Tests:** `studio-checks` 5/5 on Render (real Gemini draft from a fresh photo, AI markers, Publish locked until the price is confirmed, $0 refused, publish → live in the storefront and PayPal's catalog). The demo reset archived the test listing.
- **Screenshots:** `docs/screenshots/studio/`.
- **Risks:** the vision call takes about 5–10 s on the free tier; the rail shows progress meanwhile.
- **Next:** #6.

## #6: landing (2026-10-18)
- **Done:** the owner's headline and CTAs, site nav, a 4-step strip from real listings, a developer MCP card, the honest-scope footer updated (D-090).
- **Tests:** `landing-checks` 5/5 on Render (pitch, doors, strip photos, developer card + feed, nav + phone menu, no overflow at 3 sizes, after one fix for 38 px on mobile).
- **Screenshots:** `docs/screenshots/landing/`.
- **Risks:** the hero feed shows public events only, so a quiet sandbox shows older events.
- **Next:** #7.

## #7: live console (2026-10-18)
- **Done:** a 24 h KPI strip counted live, group-by-checkout, site nav; shared timeline rows with ids behind Details, PayPal emphasis, relative time and per-system accents (D-090).
- **Tests:** `live-checks` 5/5 on Render (KPIs from the DB, ids hidden until Details, a new public MCP call slides in and counts up, grouping + follow one checkout, no overflow).
- **Screenshots:** `docs/screenshots/live/`.
- **Risks:** none known.
- **Next:** #11.

## #11: mobile pass (2026-10-18)
- **Done:** `/pay` padding, the sticky studio Publish, landing and chat grid tracks, the nav sheet menu, the live-wire sheet (D-090).
- **Tests:** `mobile-checks` on Render: 13 routes × 360/390/430 = 39/39 with no sideways scroll (page and chat panel).
- **Screenshots:** `docs/screenshots/mobile/` (every route at 390 px).
- **Risks:** the M2 tap-target count is informational and over-counts id chips; the main actions (Ask, Pay, Publish, Buy) are 44 px.
- **Next:** #5.

## #5: hack card + 13 attacks, Phase 13 lite (2026-10-18)
- **Done:** 13 real attacks in 6 families, including a forged PayPal webhook; checkouts counted in the DB; a proof-first card (D-091).
- **Tests:** `hack-checks` 3/3 on Render.
- **Screenshots:** `docs/screenshots/hack/`.
- **Risks:** the hack route is rate-limited; repeated judge clicks may hit the limit (it answers 429 cleanly).
- **Next:** #10.

## #10: Phase 9 screens + Log in with PayPal (2026-10-18)
- **Done:**
  - The Get paid card; "paid directly to …" lines on `/pay`, storefronts and the live wire.
  - A refund handoff link in Orders.
  - Log in with PayPal end to end in code: a signed single-use state, a server-side code exchange, payer-id verification. The platform shop is only checked, never rerouted.
  - Only verified payees are routed (D-084, D-092).
- **Tests:**
  - `connect-checks` C1 passed (the card).
  - C2 stopped at PayPal's own page, "invalid client_id or redirect_uri": the sandbox app doesn't accept our Return URL yet (OWNER-TODO #4). C3–C6 run once that's fixed.
  - Unit test: an unverified email is no longer routed.
- **Screenshots:** `docs/screenshots/connect/` (C1, and PayPal's error page as evidence).
- **Risks:** until the Return URL is accepted the connect button is hidden (`PAYPAL_LIPP_ENABLED=0`) and verification falls back to the first payment (D-083). A PayPal-side configuration, not code.
- **Next:** #8 + Phase 10.

## #8 + Phase 10: the Telegram seller copilot (2026-10-18)
- **Done:**
  - A welcome card and menus from the DB, order pings with the photo, refund approvals by tap.
  - Photo → AI draft → Publish tap; label photo → tracking → Add tracking tap; sales questions.
  - Judge mode with Simulate a buyer / Simulate a refund; every bot message logged; a Studio card with the judge link (D-092).
- **Tests on Render:**
  - `telegram-flow-checks` 7/7. F3: the simulated buyer paid in PayPal → order ping. F4: refund by tap, PayPal `7TR76520BV342860X`. F5: draft → "Publish at $35.00" → live + catalog. F6: label read USPS `9400111899225853210512` → tracker on the PayPal order. F7: guardrails.
  - `telegram-checks` 6/6 as a regression.
  - The first F3 run failed on a sandbox login timeout, then passed on the re-run.
- **Screenshots:** `docs/screenshots/telegram/` (bot transcripts as JSON; a made-up chat can't be screenshotted, so the real chat goes in the video).
- **Risks:** "Simulate a refund" needs the order made in the same server session (the token is kept in memory); after a restart the bot says so.
- **Next:** #13 README, #14 the final regression.

## #13: README final pass (2026-10-18)
- **Done:** the judge 5-minute path (shop, hack, seller, Telegram, live); how each judging criterion is met, including AG Grid; the what's-real table with links to proof; tools used; updated honest limitations; credits.
- **Tests:** a fresh clone of `8235319` from the README: `pnpm install --frozen-lockfile`, typecheck, 176 unit tests, `pnpm build` and `pnpm start` all pass (`/api/health` ok, `/shop` 200).
- **Screenshots:** —
- **Risks:** the README claims Log in with PayPal is "switching on"; update it once OWNER-TODO #4 is done.
- **Next:** #14.

## #14: final regression (2026-10-18, partial; stopped by the local machine)
- **Done (on Render, `d99f012`, log in `docs/screenshots/final-regression.log`):**
  - approval 6/6, shop 4/4, dashboard 9/9, studio 5/5, landing 5/5, live 5/5, hack 3/3, mobile 39/39, telegram 6/6;
  - telegram-flow 5/6: F1–F5 pass; F6 hit PayPal's own sandbox error page ("Things don't appear to be working at the moment", screenshot `docs/screenshots/telegram/_error-paypal-*.png`). F6 passed in the previous run; the AT now retries that page once.
  - The fresh-clone run from the README passed (install, typecheck, 176 tests, build, start).
- **Not run yet:** Claude Code stopped the background run during `phase2-checks` because this computer was low on memory. Still to run: phase2, phase4, phase5 (AT-5 on the Builder tab, then the demo reset), phase6, recovery, fixes, lane, `final-screens`.
- **Excluded:** `phase9-checks` (superseded by `connect-checks` since D-084, now guarded) and `connect-checks` C2–C6 (OWNER-TODO #4).
- **Risks:** none found in our code during the run.
- **Next:** finish the remaining scripts when the machine has memory.

## #14: final regression, completed (2026-10-18)
- **Done:** every AT on Render, run one at a time (log: `docs/screenshots/final-regression.log`):
  - approval 6/6, shop 4/4, dashboard 9/9, studio 5/5, landing 5/5, live 5/5, hack 3/3, mobile 39/39;
  - telegram-flow 7/7, telegram 6/6;
  - phase2 7/7, phase4 7/7, AT-5 6/6 (Lighthouse 100/100) + the demo reset;
  - AT-6 8/8 (#6 against a local zero-AI replay server);
  - recovery 4/4, fixes (isolation) 6/6, lane 6/6;
  - `connect-checks --skip-lipp` 2/2 (C7: a real Fern & Loom order paid to seller 2);
  - `final-screens`: 45 shots (15 screens × 3 sizes), 0 with sideways scroll.
  - Plus the fresh clone from the README.
- **Tests fixed on the way:** one accessibility regression in the app (the AI badge inside a `<label>`); five ATs updated to behaviour already decided (D-093).
- **Screenshots:** `docs/screenshots/final/` (every screen at desktop, 1920×1080, mobile).
- **Risks:**
  - Log in with PayPal is still rejected by PayPal (OWNER-TODO #4), so `connect-checks` C2–C6 haven't run.
  - The PayPal sandbox's login flakes now and then; the ATs retry it.
- **Next:** the owner's Log in with PayPal setting, then `connect-checks` in full. After that, the video and the submission.

## Owner evening fixes (2026-10-18, D-094)
- **Done:**
  - `/privacy` and `/terms`; demo stock auto-restock; judge "Simulate a refund" survives restarts; the site nav on Studio; account verification status as a Log in with PayPal signal.
  - Fixed on the way: the restock SQL and a capture guard (a captured order can no longer be cancelled as sold out).
- **Tests:** `fixes3-checks` X1–X4 on Render, with X4 proving a fresh process via `booted_at`. Regression: approval 6/6, shop 4/4, phase4 7/7 (headless, `AT_HEADLESS=1`).
- **Screenshots:** `docs/screenshots/fixes-3/`.
- **Risks:** two orphaned sandbox captures from the bug window (owner's call). Visible browsers can't open on this machine right now; headless works.
- **Next:** Log in with PayPal after 21:20 IST (3 h after the owner's save), then review v2 on "start review v2".

## Orphaned captures refunded + reconciliation with PayPal (2026-10-18 night, D-095)
- **Done:**
  - The two D-094 orphaned captures are refunded through the app's refund code. Both orders read "refunded", with a note citing the incident.
  - A reconciliation check now compares PayPal's captures with our orders (Transaction Search, webhooks, GET). It runs on boot, daily, from the dashboard, and at the end of every AT suite. The dashboard badge shows "Reconciled with PayPal ✓" or "N mismatches".
  - A capture webhook on a cancelled order is now logged as a conflict, not "confirms existing state".
- **Tests:**
  - `reconcile-checks` on Render, 6/6: it found exactly the 2 orphans, the badge showed "2 mismatches" at three sizes, both refunds were confirmed REFUNDED by a PayPal GET, a repeat call did nothing, then the badge showed ✓.
  - `shop-checks` 4/4, ending with an automatic reconcile PASS. Core unit tests: 9 new.
- **Screenshots:** `docs/screenshots/reconcile/`.
- **Risks:** Transaction Search lags (covered by webhooks and GETs). The daily run happens only while Render is awake (start-up and dashboard runs cover it).
- **Next:** review v2.

## Phase C: PayPal Cart API v1, Store-Sync-ready (2026-10-18, D-097 to D-099)
- **Done:**
  - Every store answers Cart API v1 to PayPal's published schema: store-bound JWT, validation issues with resolutions, authorize at checkout, capture on ship, void or seller handoff.
  - The holds are in the reconciliation.
  - `/developers` (demo token + curl), a Studio card for agent keys, and a test agent on PayPal's own client.
- **Tests:** `cart-checks` K1–K14 on Render with real sandbox payments; regression `shop-checks` 6/6 and `phase6` 1–5, 7, 8; reconciliation clean after every run.
- **Screenshots:** `docs/screenshots/cart/` (developers, the Studio card, the hold panel, approved, live) at desktop, 1920 and mobile.
- **Risks:**
  - Store Sync onboarding is request-access (the README says so).
  - The 3-day honor period for holds.
  - PayPal sandbox login flakes (retries).
- **Next:** review v2 fixes #2, #6, #8, then Phase AG (AG Studio).

## Phase AG started (2026-10-18, paused at the owner's request)
- **Done:**
  - `dashboardData` adds, for the AG Studio report: attempts (every checkout, with channel/agent/outcome), listings (stock, low-stock flag) and Cart API carts; orders gain channel, agent, captured amount and paid-to.
  - Read-only Shop Manager tools on `/api/seller/insights`: `agent_activity`, `orders_needing_action`, `stock_levels`, `reconciliation_status`.
- **Not yet built:**
  - the 5-page Studio preset (relationships + calendar + measures);
  - the reconcile and Cart API funnel custom widgets;
  - the Shop Manager agent definition;
  - the "what changed" strip (fix #5); the overview width (fix #4);
  - AT-AG.
- **Next (on resume):** build the preset and widgets in `components/dashboard/`, then AT-AG. Then review fixes #3 and #7, Gauntlet, proof docs, the Nov 4–5 regression (including phase6 #6 on a local replay server), DEMO-SCRIPT, review v3 pack.

## Phase AG: AG Studio showcase delivered (2026-10-24, D-100, D-101)
- **Done:** a 5-page Studio report (Overview · Orders · Payments & reconciliation · Inventory · Agents & Cart API) on six joined sources with a calendar and two measures; two new custom widgets (PayPal reconciliation, Cart API funnel); the read-only **Shop Manager** agent (no tool can move money); review fixes #5 (a "what changed" strip tagged AI, with Undo; AI tags on the overview's chips) and #4 (overview up to 1760 px, larger grid type). The AG key is Studio-only and expires 29 Nov; without a valid key Studio is never mounted and the tab shows the Community overview with a notice.
- **Tests:** `ag-checks` 16/16 on Render (L1–L3, P1–P5, A1–A6, C1–C2) + L4 on a local build without the key; every Shop Manager figure re-checked against the tools; reconcile PASS. Regression: `dashboard-checks` G0, G4, G5, G6 pass; unit tests 195.
- **Screenshots:** `docs/screenshots/ag/` (every page, the Shop Manager, the change strip, the expired/missing-key fallback) at desktop, 1920 and mobile.
- **Risks:** the Studio trial ends 29 Nov (owner asks for the extension on Nov 25); Studio's grid shows money with one decimal ("$33.0"); on a phone the report scrolls inside its box (the Overview tab is the phone view).
- **Next:** review fixes #3 (landing) and #7 (Telegram), then the Gauntlet.

## Review v2 fixes #3 and #7 (2026-10-24, D-096)
- **Done:** landing (#3): a 96 rem container with wider gutters, hero sub-text at 23 px, a larger live panel, workflow cards at body size (16 px); Telegram (#7): the welcome is two lines and the four actions, with the rest behind "How it works"; one header pattern each for Order paid, Refund request and Sales summary, the same field order, no decorative emoji in message bodies.
- **Tests:** `landing-checks` 6/6 on Render (new L6 measures the sizes); `telegram-flow-checks` 7/7 on Render (a real sandbox purchase approved in PayPal, a refund executed, a label photo turned into PayPal tracking); reconcile PASS after each.
- **Screenshots:** `docs/screenshots/landing/` at desktop, 1920 and mobile (fold and full page).
- **Risks:** none new. The landing's live panel shows only public events; in a quiet spell it shows the newest sales and agent calls, however old.
- **Next:** the Gauntlet (D-102).

## The Gauntlet (2026-10-24, D-102)
- **Done:** `/gauntlet`: 31 attacks in 7 families (chat, product-photo and shipping-label injection read by the vision step, schema smuggling incl. the Cart API price, cross-store keys and cart ids, replay, refund abuse), each run against a naive shop and against Shopfront with the same model, streamed tile by tile and stored (`gauntlet_runs`, migration 0014). Linked from the hack card and the landing page. One public run is stored, so visitors see results before pressing Run.
- **Tests:** `gauntlet-checks` 4/4 on Render: 31/31 blocked with reasons; 27/31 naive harm, its 14 sandbox orders confirmed by a PayPal GET (CREATED, the attacker's amount); every guarded checkout at the database price; the page matches the API at 3 sizes; reconcile PASS. Regression: `hack-checks` 3/3.
- **Screenshots:** `docs/screenshots/gauntlet/` at desktop, 1920 and mobile (fold and full page).
- **Risks:** the naive label agent resisted all 4 label injections (the model refused; the naive shop still exposes refund tools, and the page says "Model resisted"); a fresh, uncached run needs about 40 free-tier model calls (rate-limited, cooldown 3 min, cached after the first).
- **Next:** proof docs.

## Proof docs (2026-10-24)
- **Done:** `docs/threat-model.md` (17 threats, each with its mitigation and the test that proves it; residual risks), `docs/sandbox-validation.md` (generated from the app's PayPal call log: 13 endpoints, 8,008 sandbox calls, latest success and error debug ids, the tests per endpoint), `docs/development-with-ai.md`, README test counts generated by `pnpm --filter web test-counts` (195 unit tests; 24 acceptance suites, 145 checks), README rows for the Studio report and the Gauntlet.
- **Tests:** the generators run against the live database and the Vitest JSON report; counts match `pnpm test`.
- **Screenshots:** none (docs).
- **Risks:** the sandbox-validation table is a snapshot; rerun the generator after the Nov 4–5 regression.
- **Next:** the Nov 4–5 full regression (including phase6 #6 on a local replay server), DEMO-SCRIPT, review v3 pack.

## Step 1: Studio money shows $33.00 (2026-10-25, D-103)
- **Done:** the "$33.0" was clipping, not formatting: AG Grid 36's overlay scroll strip (opaque, 16 px) covered the last column's final digit when the browser uses overlay scrollbars. One CSS rule makes it transparent (Studio and Overview grids). Money fields now use Studio's format string `"$#,##0.00"`. The new AG key (expires 1 Dec) is confirmed on Render (hash match, L1 PASS); OWNER-TODO #7a updated.
- **Tests:** `ag-checks` P1–P5 now also fail on any dollar amount without two decimals or with something painted over it: red on the old build (P2, P3), green on Render (`c973b70`). New unit test pins every `*_usd` field (198 unit tests).
- **Screenshots:** `docs/screenshots/ag/` (P1–P5 at desktop, 1920, mobile).
- **Risks:** none new; the key still needs the extension for Dec 1–15 (owner, Nov 25).
- **Next:** step 2.

## Step 2: phone note on the Report tab (2026-10-25, D-103)
- **Done:** under 768 px the Report tab shows one line, "Best viewed on desktop. Open the overview"; Studio is neither downloaded nor mounted. A window that narrows after Studio opened hides it without losing edits.
- **Tests:** `ag-checks` P6 on Render: one line at 390 px, the link lands on the Overview, no Studio element or API; L1–L3 and P1–P5 still pass (9/9); reconcile PASS (119 matched, 0 mismatches).
- **Screenshots:** `docs/screenshots/ag/P6-phone-note-mobile.png`; the P* mobile shots now show the note.
- **Risks:** none.
- **Next:** step 3, the final full regression and the feature freeze.
