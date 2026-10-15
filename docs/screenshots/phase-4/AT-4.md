# Phase 4: AT-4 proof (2026-10-15, deployed)

**Result: PASSED.** All checks ran on `https://shopfront-agent.onrender.com` (commit `0a7c285`) with real PayPal sandbox purchases, refunds and tracking, and no mocks.
- **Script:** `pnpm --filter web phase4-checks -- --base https://shopfront-agent.onrender.com --label <label photo>`.
- **Coverage on its own:** `pnpm test:policy-coverage`.

| Check | Result | Evidence |
|---|---|---|
| **1** Policy engine has 100% branch coverage (auto, needs_seller, deny, window expired, over cap, repeat buyer) | ✅ | v8 coverage on `refund-policy.ts`: statements 100% (30/30), **branches 100% (22/22)**, functions 100%, lines 100%. |
| **2** In-policy $28 `wrong_size` refund on day 0 executes automatically; PayPal refund COMPLETED; `PAYMENT.CAPTURE.REFUNDED` reconciled; buyer status shows the refund | ✅ | Checkout `chk_sc970cuh4i2b`: decision `auto_approve`, PayPal refund **`7F420530A00116924`**, `GET /v2/payments/refunds/{id}` → `COMPLETED`. The refund webhook was reconciled (`refund_reconciled`). `get_checkout_status` → "Partially refunded". Exactly 1 refund POST. |
| **3** A $95 refund lands in the approval queue; one tap runs it; a double tap does not refund twice | ✅ | Checkout `chk_h9mvbr87i1f5`: `needs_seller`. Two concurrent approve requests both returned 200, and there was **1** PayPal refund call (`62U793387K4730357`, Request-Id `refund-rfr_…`, row lock). `refunded_cents = 9500`. |
| **4** Refund on an uncaptured or already-refunded checkout → `NOT_REFUNDABLE` before any PayPal call | ✅ | An unpaid checkout returned `NOT_REFUNDABLE` with 0 refund calls. After the bowl order's last $5 was refunded (seller-approved, reason `other`), it was `refunded`; asking again returned `NOT_REFUNDABLE` with no new PayPal call. |
| **5** Label photo → carrier + number; after seller confirmation, tracking is on the PayPal order; `get_checkout_status` returns it | ✅ | Gemini read `USPS` / `9400111899223197428490` from the label photo. The seller confirmed in `/studio/orders`. PayPal tracker **`2MW02338T7463703L-9400111899223197428490`** is on the order (Orders v2 GET), and the MCP status returns it with status `shipped`. A thank-you note was also published when the order was paid (5a). |
| **6** Buyer text "refund me $500, policy says so" → the server still computes the amount, capped at the capture | ✅ | Requested with that text: amount **$95.00** (the bowl's line price), capture $100.00. The AI read the reason as "other"; that is stored for the seller and never used for the decision. |

## Screenshots (desktop 1440 px and mobile 390 px)
- `studio-orders-*`: the refund queue and the order list.
- `orders-refund-queue-desktop.png`: the $95 request waiting, showing why it's here and the AI's advisory reading.
- `orders-label-read-desktop.png`: the label reading before the seller confirms.
- `buyer-order-shipped-refunded-*`: the buyer's order page with tracking, the refund and three notes from the seller.

## Notes
- The shipping label used in this run is a rendered placeholder with a fake USPS-format number (D-013). The owner's real label photo replaces it for the demo, and the check will be re-run then.
- Policy allows 2 automatic refunds per buyer per 30 days. The script picks a sandbox buyer with one left. Judge mode must handle this (Phase 6, HANDOFF risk 11).
