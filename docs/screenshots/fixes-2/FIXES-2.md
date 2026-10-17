# Review-fix lane, Oct 18 items: acceptance on Render (2026-10-17, session "part 5")

Decision: D-074. Every check below ran against https://shopfront-agent.onrender.com with real PayPal sandbox and LLM calls (no mocks). Test traffic carries the signed test-run header, so none of it appears on public views.

| Item | Commits | Check | Result |
|---|---|---|---|
| **1a** The demo seller's Orders, dashboard, insights `[db]` figures and the dashboard's event stream hide `is_test` orders unless the request is a test run | `6701982` | `fixes-checks` I1–I6 | ✅ 6/6. I6: a normal visitor signed in as `juniper_clay` sees 0 test ids on the dashboard data and Orders, 0 test rows in the seller stream, and `[db]` orders = 0 = the real paid count. A test run still sees `chk_f1xyz34fgmxl` and 28 orders. |
| 1a regression | | **AT-4** (all) | ✅ 7/7 (`at4/`): auto refund, $95 queue with a double tap (1 PayPal refund call), NOT_REFUNDABLE, label → tracking on the PayPal order, $500 text capped |
| 1a regression | | **AT-5** (all) | 5/6 on the first run. **#4 failed** with the answer REVIEW-2 had already seen ("Added a column‑chart‑grouped…", no figures). A test run sees every order, so the new filter can't cause this. Fixed by the insights-prompt change below. |
| AT-5 #4 fix (part of REVIEW-1 #6, pulled forward) | `0828416` | **AT-5 --only 4** | ✅ "This week's sales were $1,298.00 from 31 orders [db] … PayPal shows $1,076.00 from 25 sales [paypal]; PayPal may lag". Transaction Search queried independently: 25 sales, $1,076.00. |
| **1b** "Answered before" legend under the `/shop` timeline; README "within about 20 seconds" | `2ce2a4d` | `lane-checks` L3 | ✅ The legend is visible at desktop width (the timeline itself is desktop-only) |
| **1c** #3: every `/shop` starter lands | `56f8094` | `lane-checks` L1 (4 starters through the hosted agent) | ✅ Blue mug: `search_products` total 2. "A vase or table linens for a housewarming, under $60": total 2. The two order starters answer in words (a fresh session has no order, so the agent asks for the checkout id), with no errors. |
| **1c** #7: calm "Protected: 3 of 3 blocked" | `56f8094`, `59b6bbd` | `lane-checks` L2 at desktop and mobile | ✅ Heading "Protected: 3 of 3 blocked". Rows: unknown field `price`; unknown fields `total`, `discount_percent`; `quantity` must be at least 1. Checkouts created: 0. |

**After the runs:** AT-5 #3 saves a refund-spike alert into the demo seller's dashboard layout, and the public would have seen it, red, beside KPIs of 0. The demo reset (`POST /api/admin/demo {action:"reset"}`, run as a test run) cleared the layout. **Run the reset after every AT-5.**

**Screenshots** (desktop 1440, mobile 390, capture 1920×1080), the public view:
- `shop-*.png`: `/shop` with the legend
- `hack-protected-desktop.png`, `hack-protected-mobile.png`: the calm hack card
- `studio-orders-*.png`: Orders, empty until real purchases land (D-073), with the new empty state that links to the shop
- `studio-dashboard-*.png`: the dashboard with no test orders. Still open for #6 (Phase 9 day 1): "No data to display" instead of $0.00, the edit mode on open, and the "Restarted" server rows on the wire (the rest of #4).
- `at4/`, `at5/`: the regression runs' own screenshots and Lighthouse reports (dashboard 95, storefront 100). Neither contains a cookie or the test header.

**Not done, by owner rule:** no scripted seed orders (D-073). The owner's real public purchases fill Orders and the dashboard.
