# Owner to-do (things only the owner can do; the build never waits on them)

| # | What | Why | Fallback in place | Added |
|---|------|-----|-------------------|-------|
| 1 | Put the **AG Grid + AG Charts Enterprise (`BOTH`) trial key** in `.env` and on Render as `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` | Master-detail, grid sparklines, integrated charts (AG Grid "Best Use") | The dashboard ships key-gated: Community fallbacks, never a watermark (D-080) | 2026-10-18 |
| 2 | **Around Nov 25:** ask AG Grid for a trial extension | A 45-day trial lapses before judging ends | The guard falls back to Community; no watermark | 2026-10-18 |
| 3 | Shoot **3–4 of your own items** (a mug, a bowl, a textile) | The live photo-to-store and Telegram demos in the video | CC0 museum and stock photos for every seeded listing (credited in the README) | 2026-10-18 |
| 4 | ~~Log in with PayPal Return URL~~ **Done 2026-10-18.** The owner replaced a placeholder Return URL (`nativexo://paypalpay`); PayPal accepted it about an hour after the save. `PAYPAL_LIPP_ENABLED=1` is on Render; `connect-checks` passes 7/7. | D-084 | — | 2026-10-18 |
| 5 | ~~Two orphaned sandbox captures~~ **Done 2026-10-18.** Both refunded through the app's refund code (refunds `6W5585679V533933W`, `9LF06474PK812901K`); both orders now read "refunded", with an internal note "Captured after cancel → refunded" citing D-094. The new reconciliation check (D-095) flagged them first, then reported 0 mismatches. | D-094, D-095 | — | 2026-10-18 |
| 6 | Don't run `scripts/render-deploy.mjs` as is: its `PUT /env-vars` replaces all of Render's variables with its own list, which lacks `PAYPAL_LIPP_ENABLED`, the Telegram keys and the sandbox buyer. Pushes deploy by themselves. | Keeps Render's settings | — | 2026-10-18 |
