# UI review pack (D-073), for the owner's style review before any Phase 9 UI

Shot on 2026-10-17 from https://shopfront-agent.onrender.com (commit after `59b6bbd`). Each screen is at desktop (1440 wide) and mobile (390 wide), as full-page captures. Files are named `<screen>-desktop.png` / `<screen>-mobile.png`.

- **Public view:** what any visitor or judge sees, with no test rows (`pnpm --filter web screens`, no test header).
- **Test-run view:** marked *testrun*. It shows how a seller screen looks *with* orders. Those orders are AT traffic, which the public view hides (D-074). It's here only so you can judge the style of order rows and charts before real purchases exist.
- **Stateful screens** (the `/shop` checkout card, `/pay` before and after payment) come from `pnpm --filter web review-pack`. It runs as a test run with a real PayPal sandbox approval (`chk_9ajwzs0xaecr`, paid and webhook-verified in about 30 s), so nothing lands on the public wire.

**Placeholders:** product photos are letter tiles until your photos arrive (AT-3).

## Screens

| # | Screen | Route | Register | Purpose | The one primary message | Files |
|---|---|---|---|---|---|---|
| 1 | Landing | `/` | Craft retail + console hero | Explain the product in one scroll and send people to the two demos | **"Your shop, buyable by AI agents"**, with proof running on the right | `home-*` |
| 2 | Shop, empty | `/shop` | Console | A judge starts a purchase in one click | **"Ask an agent to buy something; watch every step"** | `shop-*` |
| 3 | Shop, checkout card | `/shop` after the blue-mug starter | Console | The agent has prepared a PayPal order; the human approves | **"Total set by the shop: review and pay with PayPal"** | `shop-checkout-card-*` |
| 4 | Shop, hack demo | `/shop` → "Try to hack the price" | Product | Prove the agent can't touch money | **"Protected: 3 of 3 blocked"** | `shop-hack-protected-*` |
| 5 | Pay, before payment | `/pay/[id]` | Craft retail | The buyer's consent page: the order and the PayPal button | **"Your agent prepared this; nothing is charged until you approve in PayPal"** | `pay-before-payment-*` |
| 6 | Pay, after payment | `/pay/[id]` after approval | Craft retail | The receipt, with proof the money really moved | **"Payment complete · webhook verified"** | `pay-after-payment-*` |
| 7 | Live wire | `/live` | Console | Every agent call, PayPal request and webhook, across all sessions | **"The machine, visibly working, with real PayPal ids"** | `live-*` |
| 8 | Storefront | `/s/juniper_clay` | Craft retail | The seller's public shop, readable by people and crawlers | **"A maker's shop that your AI agent can buy from"** | `s-juniper-clay-*` |
| 9 | Product page | `/s/juniper_clay/prd_cobaltdrip00` | Craft retail | One piece, with how to buy it with an agent | **"This piece, $32, buyable by your agent"** | `s-juniper-clay-prd-cobaltdrip00-*` |
| 10 | Studio, signed out | `/studio` | Craft retail | One-tap demo sign-in as the seller | **"Continue as Juniper Clay Studio"** | `studio-signed-out-*` |
| 11 | Studio, listings | `/studio` (signed in) | Craft retail | Photos become listings; what's live and mirrored to PayPal | **"Drop photos of your pieces"** | `studio-*` |
| 12 | Orders, public view | `/studio/orders` | Craft retail | Refund decisions first, then orders to ship | **"Nothing to decide; no paid orders yet"** (empty until your real purchases, D-073) | `studio-orders-*` |
| 12b | Orders, test-run view | same | Craft retail | Style check of order rows, the refund queue and tracking | **"$37 refund needs you"**, then the orders | `studio-orders-with-orders-testrun-*` |
| 13 | Dashboard, public view | `/studio/dashboard` | Console + AG Studio | Sales, refunds and the live wire, plus the insights agent | **"What sold, from where"** (empty for now) | `studio-dashboard-*` |
| 13b | Dashboard, test-run view | same | Console + AG Studio | Style check with data in the tiles, charts and ledger | **"What sold, from where"** | `studio-dashboard-with-orders-testrun-*` |
| 14 | Design system | `/design` | Both | The living style guide: tokens, type, components | **"One token system for both registers"** | `design-*` |
| 15 | Capture | `/capture` | Both | The 1920×1080 split screen for the video (two real panes) | **"Buyer left, seller right"** | `capture-*` |

**Not in the pack:** `/spike/studio`, the Phase 2 AG Studio spike (D-043). It isn't linked from the product but is still reachable. I propose deleting it (your call, see Q5).

## What I noticed while shooting (for your review, not fixed unless noted)

1. **Fixed today:** the product page scrolled 13 px sideways on mobile (the MCP URL chip in "Buy with your AI agent" didn't shrink). Fixed in this commit; the mobile shot was retaken after the deploy.
2. **The wire leads with "Shopfront · Restarted"** on `/`, `/live` and the dashboard: each deploy adds one (4 today). They're honest, but they crowd the landing hero. REVIEW-1 #4 (de-noise) is in the Phase 10 lane. Hiding boot events from the public wire is a one-line backend change if you want it sooner (Q1).
3. **`/pay` after payment** keeps the heading "Approve in PayPal" above "Payment complete". It should become something like "Paid" (Q2).
4. **Dashboard, public view:** the KPI tiles read "No data to display" rather than "$0.00", and the dashboard opens in edit mode with the Compose panel and AI assistant open. Both are REVIEW-1 #6, planned for Phase 9 day 1.
5. **Mobile `/shop`** hides the live timeline, and the "Answered before" legend with it. That's a REVIEW-1 low finding, still open.
6. **The hack button** is still danger pink. Only the result card is calm now (DESIGN.md asked for the result only).
7. **Times:** the wire shows local time and `/live`'s checkouts show "25 min ago". One labelled timezone is REVIEW-1 #4, in the Phase 10 lane.

## Questions for you
- **Q1.** Hide "Restarted" boot rows from the public wire now (they stay in the database and in test-run views)?
- **Q2.** `/pay` after payment: change the card heading to "Paid" (or "Payment complete" only)?
- **Q3.** Keep the two registers as they are (craft retail serif pages, ink console panels), or adjust before Phase 9 adds `/studio/payouts`?
- **Q4.** The hack button: keep it danger pink (it signals "attack"), or move it to secondary?
- **Q5.** Delete `/spike/studio`?
