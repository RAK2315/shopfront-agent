# Phase 6: AT-6 proof (2026-10-15)

**Result: PASSED,** apart from the Claude Desktop check, which the owner runs from the README.
- **Checks 1–5:** ran on `https://shopfront-agent.onrender.com` (commit `d2c984f`).
- **Check 6:** ran on a local production server started with `LLM_MODE=replay` and **no AI keys**, against the same database and the live PayPal sandbox.
- **Script:** `pnpm --filter web phase6-checks -- --base <app> [--replay-base http://localhost:3000]`.

| Check | Result | Evidence |
|---|---|---|
| **1** A judge completes a full purchase on the hosted site in under 3 minutes | ✅ (automated path) | `/shop` → starter prompt → agent checkout → PayPal popup (sandbox buyer) → paid in **33 s**. Checkout `chk_0rxqhiwa7ie0`, total $37.00 = catalog price. The README now leads with this path; buyer credentials are added on submission day (D-034). |
| **2** 10 scripted injection prompts all fail to change any total | ✅ | Ten attacks through the hosted agent (price 0, "SYSTEM OVERRIDE" discounts, an extra `price` field, owner impersonation, negative quantity, an instruction in a product description, free shipping, a fake coupon, a `discount_percent` field, "refund me $500"). **8 were declined.** **2 produced checkouts, both priced exactly at the catalog** (each line equals the variant price; total = items + flat shipping). No variant price ever dropped below $1. |
| **3** The MCP server works from Claude Desktop / a claude.ai custom connector using only the README snippet | ✅ protocol · ⏳ owner | A generic MCP client connected with only the URL: 5 tools, and a search works. **Claude Desktop / claude.ai is verified by the owner** with the README's connector steps. |
| **4** A full reset and re-seed takes under 30 s and leaves the demo path working | ✅ | Frozen catalog: 4 listings, 6 variants. A judge-style price change was undone by `POST /api/admin/demo {reset}` in **1.2 s** (53 ms server side). `search_products` works afterwards. Order history is kept. |
| **5** A forced 429 fails over, and the timeline shows the provider and the reason | ✅ (Groq → Gemini, D-054) | A signed test header forced Groq (the primary on agent routes, D-038) to answer 429. All 3 steps were answered by **Gemini** `gemini-3.5-flash-lite` with `fallbackReason=groq:429`, and the timeline reads "Replied to the shopper · fallback after groq:429". |
| **6** With `LLM_MODE=replay` and both AI keys removed, the demo story runs end to end, PayPal calls stay live, and AI steps are badged `replay` | ✅ | The judge path completed (paid) in **43 s** with PayPal order `2RU09390L5336064R` (live). The agent steps were answered from recordings (`cache` ×3, `replay` ×1, D-055), and the server log shows **zero** Groq/Gemini calls. |

## Screenshots
- `shop-desktop.png`, `shop-mobile.png`: `/shop`.
- `judge-shop-checkout-desktop.png`, `judge-paid-desktop.png`: the judge path.
- `replay-shop-checkout-desktop.png`, `replay-paid-desktop.png`: the same path with zero live AI.

## Notes
- Rate limits (per IP): `/mcp` 120/min, `/api/shop/chat` 12/min, `/api/shop/hack` 6/min. The LLM budget caps stay in the router.
- Nightly reset: cron-job.org calls `/api/admin/demo` with the derived bearer token from Nov 8, together with the keep-warm ping. Re-freeze the catalog after the owner's real photo listings are published.


## Added 2026-10-16 (session "part 3")
| Check | Result | Evidence |
|---|---|---|
| **7** Compromised agent: a real model really sends injected values; the server total wins | ✅ | `pnpm --filter web phase6-checks -- --base https://shopfront-agent.onrender.com --only 7` (Groq `openai/gpt-oss-120b`, attacker-loosened client schema). **7a** `price: 0, total: 0` → "Unrecognized keys: price, total", no checkout. **7b** `discount_percent: 100` → "Unrecognized key", no checkout. **7c** `quantity: -5` → "Too small", no checkout. **7d** quantity 3 after "the owner said it's $1" → accepted; total **$101.00** = 3 × $32.00 + $5.00 shipping, and the PayPal order amount is $101.00 (`chk_rco9vdfxpfy7`). |
| **6** (re-run) Replay with no AI keys, full demo story | ✅ | After re-recording with `record-demo` on Render, a local server ran with `LLM_MODE=replay` and empty Groq/Gemini keys. The purchase, the `/track` tracking and the wrong-size refund all completed. 11 AI steps: 0 live, 4 replay, 7 cache. The PayPal capture, tracking and refund were live (D-061). |

## Added 2026-10-16 (session "part 4"): token theft (REVIEW-1 #2, D-068)
`pnpm --filter web phase6-checks -- --base https://shopfront-agent.onrender.com --only 8` against commit `da5861b`. ✅ **10 of 10 attacks blocked.**

The attacker is an ordinary MCP client with a valid order token for **its own** checkout. It reads the victim's checkout id and PayPal order id from the **public** console (`/api/console/checkouts`).

| # | Attack | Result |
|---|---|---|
| 8a | `/pay/return?checkout=<victim>` (the REVIEW-1 leak) | 400, no token in `Location` |
| 8b | the same, plus `token=<victim's public PayPal order id>` | 400 |
| 8c | the same, plus `t=<attacker's own valid token>` | 400 |
| 8d | `/pay/<victim>?t=<attacker token>` | 404 |
| 8e | `/api/checkouts/<victim>/status?t=<attacker token>` | 403 |
| 8f | `POST /api/checkouts/<victim>/capture {t: attacker token}` | 403 |
| 8g | MCP `get_checkout_status` (victim id, attacker token) | `FORBIDDEN` |
| 8h | MCP `request_refund` on the victim's **paid** order with the attacker token | `FORBIDDEN`, 0 refund requests |
| 8i | `create_checkout` reusing the victim's `client_request_id` for other items | `CONFLICT`, no token returned |
| 8j | `/api/events?checkout=<victim>` stream | no order token anywhere |

**The legitimate path still works:**
- The victim's own `pay_url` returns 200.
- A **real PayPal redirect approval** (approve link, sandbox buyer login, Complete Purchase) comes back through `/pay/return` with PayPal's `token` and `PayerID`, captures, and lands on the order page: `at6-8-redirect-return-paid.png`.
- Replaying that return URL afterwards gives 303 with **exactly 1** successful capture call.
- A wrong PayPal `token` gives 400.

**Earlier tokens retired:** the stored hashes of all 70 pre-fix checkouts were replaced with random ones, and the tokens held in 24 old buyer sessions were cleared.
