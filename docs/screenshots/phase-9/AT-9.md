# AT-9 backend (Phase 9 on the Partial path, D-083): on Render, 2026-10-18, `89a9f54`

`pnpm --filter web phase9-checks -- --base https://shopfront-agent.onrender.com --only P1..P5`. Real PayPal sandbox calls. A real buyer approval for the purchase. A real refund by seller 2 in its own sandbox PayPal (headed browser). Nothing is mocked. The seller-2 email is masked in every output.

| AT | Result | Evidence |
|---|---|---|
| **P1a** checkout before a payout account exists | ✅ `SELLER_NOT_READY` ("Fern & Loom hasn't connected a PayPal account yet… Nothing was charged"). **0 new checkouts, 0 PayPal calls** | `phase9-results-P1.json` |
| **P1b** a payee email that isn't a PayPal account | ✅ handled plainly. **Finding: PayPal *accepts* the order** (200, debug `f4807070dbf5d`). An unknown payee isn't caught at creation; the order can only fail at the buyer's approval, and the checkout expires unpaid. Nothing is half-created | same |
| **P1c** connect `fern_and_loom` → seller 2 | ✅ `unverified` until the first payment | same |
| **P2** a routed purchase | ✅ capture `0UP62239WF526330U`: **payee `B83JSV9ELHV74` (seller 2) on our row and in PayPal's own GET; the platform (`DY7U9FZDLKJRE`) was not paid.** Seller 2 → `verified` from the capture | `phase9-results-P2.json`, `P2-paid-to-seller2-desktop.png` |
| **P3** refund handoff | ✅ The shared sandbox buyer is over the repeat-refund limit, so policy said `needs_seller` ($46.00). **The seller approved by a Telegram tap** (D-082 executor) → `handoff`. Deep link `…/activity/payment/0UP62239WF526330U`. Wire: "Refund handed to Fern & Loom · refund $46.00 in your PayPal · approved by seller · **0 refund calls from Shopfront**" | `phase9-results-P3.json` |
| **P4** seller 2 refunds in its own PayPal | ✅ **Closed 9 s after the seller's refund** by the verified webhook. PayPal refund `33366683D8670423T`, $46.00 as PayPal reported it. The buyer's order page shows "Refunded" | `phase9-results-P4.json`, `P4-buyer-order-page-refunded-{desktop,mobile,1920x1080}.png`, `P4-seller-*.png` (the last one caught PayPal's page mid-load; the webhook is the proof) |
| **P5** the GET fallback | ✅ request reopened, admin `handoff_check` → PayPal's order lists the refund → `executed` with the same refund id, `via: poll` | `phase9-results-P5.json` |
| **The platform seller is unchanged** (AT-4, all) | ✅ 7/7: an automatic $28 refund; the $95 queue with a double tap (1 PayPal refund call); NOT_REFUNDABLE; label → tracking; "$500" capped | `at4-rerun/` (the label is a rendered placeholder, `scripts/make-label.mts`, D-013) |
| Webhook recovery (#8) | ✅ already on Render | `../recovery/RECOVERY.md` |

**Not covered here** (unit-tested in `payout.test.ts`): a seller refund of a *different* amount than requested. PayPal's form defaulted to the full amount, which matched this request. The wire line for a mismatch ("requested $X, more than the policy amount") is covered by `reconcileSellerRefund` tests.

**AT-9 items left for the UI phase (after the owner's walkthrough):**
- the "Get paid" card;
- "paid directly to Fern & Loom" on the storefront, `/pay` and the wire;
- the handoff row in Orders;
- the README pitch line.
