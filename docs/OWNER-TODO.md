# Owner to-do (things only the owner can do; the build never waits on them)

| # | What | Why | Fallback in place | Added |
|---|------|-----|-------------------|-------|
| 1 | Put the **AG Grid + AG Charts Enterprise (`BOTH`) trial key** in `.env` and on Render as `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` | Master-detail, grid sparklines, integrated charts (AG Grid "Best Use") | The dashboard ships key-gated: Community fallbacks, never a watermark (D-080) | 2026-10-18 |
| 2 | **Around Nov 25:** ask AG Grid for a trial extension | A 45-day trial lapses before judging ends | The guard falls back to Community; no watermark | 2026-10-18 |
| 3 | Shoot **3–4 of your own items** (a mug, a bowl, a textile) | The live photo-to-store and Telegram demos in the video | CC0 museum and stock photos for every seeded listing (credited in the README) | 2026-10-18 |
| 4 | **Log in with PayPal Return URL:** PayPal answered "invalid client_id or redirect_uri" on 2026-10-18 08:17 UTC. In the sandbox app (the one whose client id starts `BAA5Sk`) → Log in with PayPal → Advanced settings → Return URL, save exactly `https://shopfront-agent.onrender.com/api/seller/paypal/return` (no trailing slash). Then tell me, or set `PAYPAL_LIPP_ENABLED=1` on Render, and I run `connect-checks`. | D-084 seller connect | The connect button is hidden (`PAYPAL_LIPP_ENABLED=0`); the card explains it. Fern & Loom stays verified by its first capture; unverified sellers can't sell. | 2026-10-18 |
