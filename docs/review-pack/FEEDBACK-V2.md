# Walkthrough v2 feedback

The owner's second walkthrough of the rebuilt screens (`REVIEW-V2.md`) on Render. Nothing is fixed during the walk.

| # | Step | Route | Clear? | Looks good? | Note | Proposed fix |
|---|------|-------|--------|-------------|------|--------------|
| 1 | Landing | `/` | Yes | Yes, much better than before (minor) | Editorial type, terracotta accents, white background and the four-step flow feel cohesive and professional. But the hero's supporting text and the live activity panel are too small next to the headline, which weakens the product demo. Keep the direction and layout; no redesign. | Enlarge the hero sub-text and the live panel (type size, row height); improve the workflow cards' readability (body size, contrast); refine spacing to use more of the screen width at 1440 and 1920. |
| 2 | Shop | `/shop` | Yes, much clearer (paid state not seen) | Yes, much better (images too big) | Clear: the rail works and the agent / seller / buyer roles read well. But the checkout card sits too far below the results, so the next action isn't visible; the paid confirmation wasn't reached (checkout `chk_a3d5haf1584q` stayed `created`: the PayPal approval was never opened). Looks: cards, type, rail and the two-panel layout feel professional. But product images are disproportionately large (lots of scrolling, checkout feels secondary). Image accuracy: the "Cobalt drip mug" photo looks like a pitcher, and a tea towel shows up in a mug search. The live panel looks empty-heavy when there are few events. Keep the design language. | Auto-scroll to the checkout card when it's ready and pulse the current rail step; compact, fixed-size product cards (smaller image ratio); a larger checkout summary card (item, total, PayPal button above the fold); replace the Cobalt mug photo with a real mug image; tighten search so "mug" doesn't return the tea towel (category filter or a relevance cut-off); balance the live panel when there are few events (compact height, or an empty-state explainer). |
| 3 | Hack card | `/shop` | Yes | Yes | — | None. |
| 4 | Live console | `/live` | Yes | Yes | — | None. |
| 5 | Studio | `/studio` | Yes | Yes | — | None. |
| 5b | Get paid · Log in with PayPal | `/studio` | Confusing (works, purpose unclear) | Yes | First reaction: "what is to be done here". After the steps were explained, the connection worked, but the purpose isn't obvious. Needs: Log in with PayPal verifies account ownership and doesn't by itself turn on or redirect payouts; a short step-by-step; which sandbox account to use; a clear split between the demo's platform payment account and a real seller's connected account. After returning: a prominent Verified status and an explicit "payouts enabled / not enabled". Keep the visual design; the issue is onboarding clarity, not looks. | Get paid card: a 3-step mini guide (1 sign in with PayPal, 2 PayPal confirms ownership and verification, 3 a verified account gets paid directly); name the sandbox login to use (the test buyer, shown inline); two labelled rows, "Demo shop: paid to the platform's sandbox account" vs "Your shop: paid to your connected PayPal". After return: a large Verified badge with the merchant id and "Payouts: enabled / not enabled on this demo shop (platform account)". |
| 6 | Dashboard | `/studio/dashboard` | Yes, much clearer (AI change not obvious) | Yes, much better (uses half the width) | Clear: KPIs, orders, revenue charts and the PayPal reconciliation are well organised. But the AI grid change isn't obvious: show what changed when a question is asked, which filters and columns the AI touched, and how Undo restores the previous view. Clearly separate sandbox test orders from real sales, and briefly explain the data-source badges. Looks: finally a real, data-rich ops dashboard; KPI cards, tables, charts and inventory look professional. Biggest issue: only about half the screen width is used (empty sides, cramped tables and text). Keep the white design, terracotta accents and layout. | Widen the overview container (full width with a 24–32 px gutter, up to about 1760 px); larger table type and row height. After an Ask: highlight changed columns and filter chips (clay outline plus "AI" tag), a diff banner listing the filters, sort and columns changed, and Undo naming what it restores ("Back to: all orders, newest first"). A test-run tag on rows and a "Test orders included" counter in the KPI strip. A one-line legend or tooltip for the `[db]` / `[paypal]` source badges. |
| 7 | Telegram | `t.me/juniper_clay_copilot_bot?start=judge` | Yes | Yes, much better (minor polish) | Structured messages, inline buttons, sales summaries and the buyer simulation make it feel like a genuinely useful seller copilot. The welcome is still a bit text-heavy, with too many emojis and explanations competing. Shorten the intro, put the four main actions first, and make order pings, refund approvals and sales summaries visually distinct. Keep Telegram's native look; no extra decoration. | Welcome: 2 lines plus the 4 primary buttons, with the rest behind "How it works". One header pattern per message type: 💰 Order paid · ↩️ Refund request · 📊 Sales summary, each with a bold first line and the same field order. Remove decorative emojis from body text. |
| 8 | Mobile | `/`, `/shop`, `/live`, `/studio` at phone width | Yes | Yes | — | None. |

## Ranked fix list (proposed 2026-10-18; nothing built until the owner approves)

Ranked by what a judge meets first and how much it costs. 👁 = a judge sees it on the 5-minute path.

| Rank | Fix | From | Judges see | Estimate |
|---|---|---|---|---|
| 1 | **/shop checkout prominence:** auto-scroll to the checkout card when it's ready; pulse the current rail step; a larger checkout summary (item, total, PayPal button above the fold); compact, fixed-size product cards so results don't push it down | Step 2 | 👁 the core demo (the paid state wasn't reached in the walk) | 0.5 day |
| 2 | **/shop image and search accuracy:** replace the "Cobalt drip mug" photo (reads as a pitcher) with a real public-domain mug; stop "mug" returning the tea towel (category match or a relevance cut-off) | Step 2 | 👁 | 0.25 day |
| 3 | **Landing prominence:** larger hero sub-text and live activity panel; more readable workflow cards; use the width at 1440/1920 | Step 1 | 👁 the first screen | 0.25 day |
| 4 | **Dashboard width:** the overview spans the screen (24–32 px gutters, up to about 1760 px); larger table type and rows | Step 6 | 👁 | 0.25 day |
| 5 | **Dashboard AI change made visible:** highlight changed columns and filter chips ("AI" tag), a banner listing the filters, sort and columns changed, Undo naming what it restores; a test-run tag on rows and a "test orders included" KPI note; a one-line legend for the `[db]` / `[paypal]` badges | Step 6 | 👁 | 0.5 day |
| 6 | **Get paid onboarding clarity:** a 3-step guide on the card; name the sandbox login to use; "Demo shop: platform account" vs "Your shop: your connected PayPal"; after return, a large Verified badge with the merchant id and an explicit "Payouts enabled / not enabled" | Step 5b | 👁 if they try it | 0.5 day |
| 7 | **Telegram polish:** welcome cut to 2 lines plus the 4 main buttons; one distinct header pattern each for order paid, refund request and sales summary; fewer emojis in body text | Step 7 | 👁 if they open the bot | 0.25 day |
| 8 | **/shop live panel balance** when there are few events (compact height or a short empty-state explainer) | Step 2 | 👁 minor | 0.1 day |

**Total:** about 2.6 days, well inside the freeze (end of Nov 5). Steps 3 (hack card), 4 (live), 5 (Studio) and 8 (mobile) need no changes.

## Fix status (D-096, D-097)

| Rank | Fix | Status |
|---|---|---|
| 1 | /shop checkout prominence | **Done 2026-10-18** (`shop-checks` 6/6: checkout in view at 1440/1920/phone, Your turn, compact cards) |
| 2 | /shop image and search accuracy | **Done 2026-10-18** (`review2-checks` R2a–R2c: weighted search with a relevance cut; the mug listing renamed "Blue crackle mug" to match a real CC0 mug photo) |
| 6 | Get paid onboarding clarity | **Done 2026-10-18** (R6 + `connect-checks` C2) |
| 8 | /shop live panel balance | **Done 2026-10-18** (R8: a 4-lane guide while the wire is quiet) |
| 4, 5 | Dashboard width, AI change made visible | **Done 2026-10-24** in Phase AG (D-101): `ag-checks` C1–C2 (strip tagged AI, Undo), `dashboard-checks` G0/G4/G6 (width, banner, Undo target) |
| 3, 7 | Landing prominence, Telegram polish | Scheduled Oct 29 |

