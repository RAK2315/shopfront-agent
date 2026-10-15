# Phase 5: AT-5 proof (2026-10-15, deployed)

**Result: PASSED.** All checks ran on `https://shopfront-agent.onrender.com` with real LLM turns (Groq / Gemini free tiers through the budget guard) and real PayPal sandbox purchases and refunds, with no mocks.
- **Script:** `pnpm --filter web phase5-checks -- --base https://shopfront-agent.onrender.com`.

| Check | Result | Evidence |
|---|---|---|
| **1** "Show refunds by product this week" → the agent adds a correctly configured widget; no order or money data changes | ✅ | The insights agent called `add_chart`. Widget `ai-refunds-…` is a `column-chart-grouped` with category `refunds.product`, value `sum(refunds.amount_usd)` and a widget-level 7-day filter. An md5 over every money column (checkout totals, captures, refunds, variant prices) was identical before and after. |
| **2** An inline ledger edit persists and survives a reload; a custom layout persists | ✅ | The note "Gift wrap · …" on `chk_gf5umu4iflfw` was saved (PATCH 200) and was back after the reload. The revenue tile widened to 9 columns and was still 9 after the reload (`sellers.dashboard_state`). Re-run on the AG Grid Community ledger after D-053. |
| **3** 4 refunds in 10 minutes → an anomaly alert widget appears with an explanation | ✅ | A real 4-mug purchase, then 4 real partial refunds (PayPal) within 2 minutes. The server rule emitted `refund_spike`, and the open dashboard added `refund-spike-269`: "4 refunds in the last 10 minutes, above the alert threshold of 4. Check the products involved…". See `dashboard-refund-spike-desktop.png`. |
| **4** "What sold this week?" → figures labelled `db` / `paypal`; PayPal figures match `GET /v1/reporting/transactions` | ✅ | The answer cites `[db]` per product and "PayPal shows 14 sales totalling $573 [paypal] (it may lag)". The test independently queried Transaction Search for the same range and got **14 sales, $573.00 gross** (event codes T00xx; the sandbox's T1900 starting balance is excluded). |
| **5** The dashboard updates live while a purchase happens in another browser | ✅ | Checkout `chk_d73vsi98za04`, paid in a second browser, appeared in the ledger via SSE. A `window` marker proved there was no reload. See `dashboard-live-order-desktop.png`. |
| **6** Lighthouse accessibility ≥ 90 on the dashboard and the storefront | ✅ | **Dashboard 100, storefront 100** (Lighthouse 12.8.2, `lighthouse-*.json`; the session header is redacted). |

## Screenshots
- `dashboard-desktop.png`: the preset.
- `dashboard-agent-widget-desktop.png`, `dashboard-what-sold-desktop.png`: the agent at work.
- `dashboard-live-order-desktop.png`, `dashboard-refund-spike-desktop.png`.
- `studio-dashboard-desktop.png` / `-mobile.png`: the AG Studio shell fits a phone; the canvas scrolls inside it.

## Notes
- **Agents:** the insights agent runs on Groq (about 1 k tokens per turn). Large Studio turns (11–13 k tokens), when it delegates to Studio's page agent, go to Gemini (D-043, D-052).
- **Ledger licence:** the first ledger used AG Grid Enterprise and showed a watermark, because the AG Studio trial does not license standalone AG Grid. It now runs on AG Grid Community with our own product grouping (D-053).
