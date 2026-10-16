# AT-7 progress (Phase 7, in progress), 2026-10-16

Deployed commit `19de7b0` on https://shopfront-agent.onrender.com.

| AT-7 item | Status | Evidence |
|---|---|---|
| 1. A fresh clone, following only the README, serves the app and passes its health check (D-056) | **PASS** after one fix (D-059) | A fresh clone of `0af0e20` with a throwaway Neon database: `pnpm install` (72 s) → `.env` → `db:migrate` → `seed` → `pnpm build` passed. `pnpm start` crashed, because `next start` didn't read the root `.env`. Fixed in `802b874` (`next.config.ts` loads it). Re-run: `/api/health` returned ok, db, paypal_token and webhook_configured all true. MCP `search_products` returned the seeded products. `/`, `/shop`, `/live`, `/s/juniper_clay`, `/capture` and `/studio` returned 200. The throwaway database was dropped. |
| 2. After 2 h idle the site loads in under 5 s (keep-warm ping) | Waits for Nov 8 | The pinger stays OFF until Nov 8 (PLAN §5). |
| 3. The README covers every SUBMISSION item | Partial | Judge credentials go in on submission day (D-034). The Phase 3 row waits for AT-3. |
| 4. No secrets in git history | PASS (2026-10-15) | See SUBMISSION.md: a full `git log -p` scan for every `.env` value. |

## Capture route for Phase 8 (D-058)
- `/capture` at 1920×1080 shows two 960 px panes: `/shop` (buyer agent) on the left and `/live?from=now` (fresh live wire) on the right.
- On Render, one real MCP `search_products` call appeared in the right pane within the wait. The shot is `capture-video.png`, taken before the call, so the wire is empty.
- On phones the panes stack, with no horizontal overflow.

## Design pass (D-060)
- `SellerNav` on Listings, Orders and Dashboard. The studio previously had no link to the dashboard.
- Photo placeholders are consistent across seller and buyer pages.
- The storefront mobile overflow (13 px) is fixed.
- The orders list shows "N orders · M to ship".
- `freeze` mirrored the 4 seeded listings to PayPal Catalog Products. `GET /v1/catalogs/products/{id}` returned 200 for `prd_cobaltdrip00`, `prd_speckledmug0`, `prd_ashbowl00000` and `prd_budvases0000`.
- A reset after it took 66 ms on the server.

## Screenshots (Render, desktop 1440×900 and mobile 390×844; `capture-video` is 1920×1080)
`capture-*`, `studio-*`, `studio-orders-*`, `studio-dashboard-*`, `s-juniper-clay-*`, `shop-*`, `live-*`. All of them passed the console-error and horizontal-overflow checks.
