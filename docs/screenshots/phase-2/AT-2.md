# Phase 2: AT-2 proof (2026-10-15, deployed)

**Result: PASSED.** Every check ran on `https://shopfront-agent.onrender.com` with real PayPal sandbox calls and no mocks.
- **Script:** `pnpm --filter web phase2-checks -- --base https://shopfront-agent.onrender.com` (headed Chromium for the PayPal popup).
- **Commits:** `7e83f6b` (B, C, D, F) and `24bfb6f` (A, E, after the pay-page follow fix, D-048).

| Check | Result | Evidence |
|---|---|---|
| **A1** Timeline shows every step of one purchase, in order, live, without a reload | ✅ | Checkout `chk_m3gneekfqhxk`, order `0267569984716733J`. The `/live` timeline, filtered to the checkout, listed: `create_checkout` → `Order created` → `Buyer approved in the PayPal popup` → `Payment captured` → `CHECKOUT.ORDER.APPROVED` → `PAYMENT.CAPTURE.COMPLETED`. A `window` marker set before the purchase survived, so there was no reload. See `live-purchase-desktop.png`. |
| **A2** `PAYMENT.CAPTURE.COMPLETED` verified and processed exactly once | ✅ | `WH-3CA08388TM7086622-65U0545174875670S`: `verified=true`, `attempts=1`, processed 18:42:36Z. |
| **A3** PayPal "Resend" changes nothing | ✅ | `POST /v1/notifications/webhooks-events/{id}/resend` (the Dashboard button's API) delivered the event again: `deliveries 1 → 2`, `attempts` still 1, events for the checkout `6 → 6`, checkout row unchanged. |
| **B** Forged webhook (bad signature) is stored `verified=false` and changes nothing | ✅ | A forged `PAYMENT.CAPTURE.COMPLETED` for a live order was stored `verified=false` and marked `unverified`. It produced one `webhook_rejected` timeline event. The checkout stayed `created`, with 0 captures. |
| **C** Buyer closes the PayPal popup; the checkout stays `created` | ✅ | `chk_v1dkr418wo5v`: our status `created`, PayPal order `PAYER_ACTION_REQUIRED`, page says "You closed PayPal before approving. Nothing was charged." See `pay-popup-cancelled-desktop.png`. |
| **D** A service restart with an open checkout re-arms its timers; the expired checkout → `cancelled` | ✅ | Render API restart. The rebooted process re-armed 13 open checkouts (`fallback_rearmed`), including ours. Its boot check cancelled the expired checkout (`checkout_expired`, `trigger=boot`). Expiry was simulated by setting `expires_at` in the past (D-047). |
| **E** Webhook URL wrong **and** the browser's capture never arrives; a fallback check marks it paid, badge "via poll" | ✅ | The webhook URL was PATCHed to a wrong path and restored afterwards. The capture call was blocked in the browser. A pay-page fallback check found the order `APPROVED`, captured it, and set `confirmed_via=poll` **50 s after approval** (target 60–70 s). See `pay-paid-via-poll-*.png` and `live-via-poll-desktop.png`. |
| **F** Second US sandbox buyer completes a purchase (D-040) | ✅ | `sb-tuny953392663@personal.example.com` paid. The ledger shows `buyer_country=US`. |

## Unhappy-path matrix (PLAN §2b) after Phase 2
- #01 happy path ✅.
- #02 cancelled checkout ✅ (popup close + expiry).
- #03 different user ✅ (second **US** buyer; no other country, per D-040).
- #04 merchant refund: reconciliation is wired (D-045); exercised in AT-4.
- #05 failures ✅: forged webhook, duplicate delivery, lost webhook, lost capture, restart.

## Screenshots (desktop 1440 px and mobile 390 px)
- `live-desktop.png`, `live-mobile.png`: the `/live` console.
- `pay-paid-webhook-verified-*`, `pay-paid-via-poll-*`, `pay-popup-cancelled-awaiting-*`: the three pay-page states.
- `design-*`: the style guide, re-shot because the timeline changed.

The AG Studio spike page `/spike/studio` is internal. It is documented in D-043, not shown to judges.

## Notes
- PayPal's sandbox delays resends of fresh events (minutes, sometimes in bursts). After many automated logins it sometimes refuses a popup login. The test handles both (D-048). Neither affects real buyers.
- A run against a stale deploy found two real pay-page bugs, both fixed (D-048).
