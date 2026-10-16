# REVIEW-1: independent judge review (2026-10-16)

## Method
- Five fresh-context agents reviewed the build. None had seen the project.
- Each received only:
  - the public repo (https://github.com/RAK2315/shopfront-agent);
  - its README and `docs/REQUIREMENTS.md`;
  - the hosted URL (https://shopfront-agent.onrender.com).
- They were told not to read the private working copy. Each scored one judging criterion (J1–J5, each worth 20%) from 1 to 10, with evidence, and gave its top 3 fixes.
- The deployed commit during the review was `7aa6959`, then `eb76f15`.
- Evidence screenshots kept from the reviewers are in `docs/review-1/`.
- Nothing has been fixed yet. This report is for the owner to decide what to do.

## Scores

| Criterion | Reviewer | Score | One line |
|---|---|---|---|
| **J1** Technological Implementation | PayPal integration engineer | **8** | "PayPal is central, not bolted on." Solid plumbing, but one **high-severity** token leak. |
| **J2** Design | Product designer | **7** | "A coherent product, not a tech demo." No product photos, noisy live feeds, and a dashboard that opens in builder mode. |
| **J3** Potential Impact | PayPal PM | **6** | The user is plausible but unsized. The demo proves plumbing, not impact. Photos → store is unproven, and all money settles to one account. |
| **J4** Innovation | Skeptical judge | **5** | Close to PayPal Agent Ready / Store Sync, Shopify Checkout MCP and Stripe ACP. What is new is the no-website seller and code-only money moves. |
| **J5** Presentation (the 5-minute cold judge) | Judge with 5 minutes | **6** | Fast and convincing (the hack demo), but **no sandbox buyer credentials**, so a judge can't finish a payment. |
| **Average** | | **6.4 / 10** | |

**Gate for the next phases:** J3 (6), J4 (5) and J5 (6) are below 7, so review fixes come first.

## Verified by me before writing this
- **Token leak (J1, high): confirmed.**
  - `apps/web/src/app/pay/return/route.ts` takes any `?checkout=chk_…` that matches the pattern, captures if possible, and redirects to `/pay/{id}?t={orderTokenFor(id)}`.
  - Checkout ids are public on `/live` and `/api/events`.
  - So anyone can get any order's bearer token, read the order page, and call `request_refund`. Refunds inside the seller's policy then execute automatically. This is sandbox money, but it is a real hole in the trust model.
- **"Replay"/"Cache" labels on the public wire (J4, J5).**
  - Two reviewers read them as staged. Part of the replay noise on `/` and `/live` came from my own replay verification runs (D-061), which write to the shared database.
  - "Via Cache" is honest (the same question answered before), but the wording invites the "is any of it live?" question.

## What every reviewer liked
- The guardrail story: IDs and quantities only, the server total, and "Try to hack the price". The cold judge called it "convincing" and the designer called it "an excellent demo moment".
- `/shop`: the chat and live timeline side by side. The designer rated it the best screen.
- The engineering trust for money:
  - OAuth caching and a `PayPal-Request-Id` on every POST;
  - signature-verified, once-only webhooks;
  - a GET of the capture before every refund, and row locks;
  - honest disclosure of single-merchant settlement.

## Consolidated fixes, ranked by score impact per hour

Expected lift is the reviewers' own estimate translated into points on the affected criteria. All criteria weigh the same (20%), so the points simply add.

| # | Fix | Criteria | Est. h | Est. lift (pts) | Lift / h | Notes |
|---|---|---|---|---|---|---|
| 1 | **Publish the sandbox buyer email and password** in the README and on `/pay` (with a copy button). Link one already-paid order page showing the capture and "Webhook verified". | J5, J3 | 0.5–1 | +1.5 J5, +0.5 J3 | **~2.7** | **Owner decision:** D-034 planned this for submission day. Publishing now means anyone can use the buyer account sooner. Sandbox only, and the password must never change after submitting. |
| 2 | **Close the token leak:** `/pay/return` must require PayPal's `token` = the order's `paypal_order_id` and must not mint an order token. Hash or drop `checkoutId` in the public `/api/events` and `/live`. | J1 | 1 | +0.5–1 J1 (and a real security fix) | **~0.75** | Do it first, whatever the score. A judge reading the code could find it. |
| 3 | **Every suggested prompt lands:** the "housewarming under $60" starter returns 0 results. | J5 | 0.5 | +0.3 J5 | ~0.6 | Swap the starter, or tag the bud vases and bowl. |
| 4 | **De-noise the live surfaces:** see the sub-list below the table. | J2, J4, J5 | 2–3 | +0.5 J2, +0.5 J4, +0.5 J5 | ~0.6 | Also fixes the Phase 8 capture noise (D-062 #2, #4). |
| 5 | **Real product photos** in the catalog, the storefront, the studio and the chat cards (AT-3), plus a measured "photos → agent-buyable in N s". | J2, J3, J5 | 1.5 after the photos | +1 J2, +0.5 J3, +0.5 J5 | ~1.3 | **Blocked on the owner's photos.** Also ship 3 sample photos so judges can try the upload. |
| 6 | **The dashboard as a seller's view.** See the sub-list below the table. | J2, J5, P9 | 3–4 | +0.5 J2, +0.5 J5 | ~0.3 | The AG Grid prize (P9) is judged on this screen. |
| 7 | **Hack demo result shown in a calm "protected" style** (success tone), not error pink. | J2 | 0.5 | +0.25 J2 | ~0.5 | |
| 8 | **Webhook recovery** (PayPal engineer). See the sub-list below the table. | J1 | 2 | +0.5 J1 | ~0.25 | |
| 9 | **"Who and why" impact section** in the README. See the sub-list below the table. | J3 | 3–4 | +1 J3 | ~0.3 | Needs owner input for any real seller quotes. |
| 10 | **Pay each seller directly:** Orders v2 `purchase_units[].payee` on a second US sandbox Business account, plus `PayPal-Auth-Assertion` on refunds. This retires the D-006 caveat. | J1, J3 | 5–10 | +0.5 J1, +1 J3 | ~0.2 | Overlaps the queued Phase 11 (multi-seller payouts). Spike first. |
| 11 | **Orders list grouped** "To ship · N" / "Done", and one page frame across Listings, Orders and Dashboard. | J2 | 1.5 | +0.25 J2 | ~0.2 | |
| 12 | **Speak a standard:** a UCP- or ACP-shaped endpoint or WebMCP on `/s/[handle]` beside our MCP. | J4 | 8–12 | +1 J4 | ~0.1 | Positions us as the on-ramp into PayPal's Store Sync. |
| 13 | **Bounded agent-to-agent negotiation:** the seller agent counters from a deterministic policy, and amounts never touch the LLM. | J4 | 8–10 | +1 J4 | ~0.1 | Nobody among the comparables does this. Scope risk before the freeze. |

Details for the longer rows:

- **#4, de-noise the live surfaces:**
  - Collapse repeated "Checkout expired" into one line ("6 unpaid checkouts expired · nothing charged").
  - Keep paid, verified and refunded events on top in the landing hero.
  - Scope the `/shop` timeline to the judge's own session (`/live` stays global).
  - Fold abandoned checkouts on `/live`.
  - Plain wording for sources: "answered before" instead of "via Cache", and no "fallback after mode:replay".
  - One timezone everywhere.
- **#6, the dashboard as a seller's view:**
  - Open in view mode: Compose collapsed, no tile selected.
  - One sales chart with a `$` axis, and the timeline on a full-width row.
  - A skeleton instead of "Loading the dashboard…".
  - "What sold this week?" must answer in text with `[db]`/`[paypal]` figures and scroll to and highlight the chart it adds.
- **#8, webhook recovery:**
  - Return 5xx when PayPal's verify call itself fails, so PayPal retries.
  - Add a sweep, on boot and with each timer check, that reprocesses verified but unprocessed events.
  - Use `capture-{id}-{attempt}` after an `INSTRUMENT_DECLINED`.
- **#9, "who and why" impact section in the README:**
  - Cited public statistics on social-only sellers.
  - What they use today (payment links, invoices, DMs) and why that fails agents.
  - How each seller becomes PayPal volume.
  - Plus one purchase from an outside assistant via the README connector (the AT-6 #3 owner check).

### Low-severity findings (fix if cheap)
- **Possible overselling:** the stock check before capture isn't atomic with the decrement, and a capture first seen by the webhook doesn't decrement stock (J1, low).
- **Refunds:** the remaining amount comes from our DB, not the capture's `seller_payable_breakdown` (J1, low).
- **Hard-coded sandbox values:** the JS SDK URL and the `USD` currency for refunds (G5, "config swap") (J1, low).
- **README jargon:** the README cites internal decision IDs (D-034, D-006) that mean nothing to a judge (J5, minor).
- **Mobile `/shop`:** it hides the live timeline, so the money trail disappears there (J2, minor).
- **The README says "PayPal popup",** but the hosted flow is a new tab, then the popup (J5, minor: reword).

## Recommended order (for the owner to approve)
1. **Now:** #2 (security), #1 (credentials, if the owner agrees), #3 and #7: about 3 h in total, roughly +2.5 points.
2. **Phase 9 "review fixes":** #4, #6, #8, #11, and #5 as soon as the photos arrive: about 10 h, roughly +3 points.
3. **Story:** #9 (with owner input).
4. **Feature phases:** #10 folds into the queued Phase 11 spike. #12 and #13 compete with the queued Phases 9–12 for the time left before the freeze, so decide when planning.
