# Phase 1 gate: proof (2026-10-15, deployed)

**Result: PASSED** on `https://shopfront-agent.onrender.com` (Render free, commit `a84a69c`), run by `pnpm --filter web gate -- --base https://shopfront-agent.onrender.com --headed`.

| Step | Evidence |
|---|---|
| Agent → our MCP server | Groq `openai/gpt-oss-120b` called `search_products` (351 ms) → `get_product` (276 ms) → `create_checkout` (1,234 ms) over Streamable HTTP at `/mcp` |
| Orders v2 order created | PayPal order **`08472107251603326`**, checkout `chk_7w05q5dnth3c`, server total **$37.00** (Cobalt drip mug $32 + $5 shipping) |
| Human approval in the PayPal popup | Sandbox buyer `sb-kaj47u53384870@personal.example.com` approved in the JS SDK v6 popup (`gate-02`, `gate-03`) |
| Capture | Capture **`4S9806225X591341H`**, status `COMPLETED`, 3,700 cents |
| Webhooks received and signature-verified | **`WH-7TS05562SW8095046-2WT23330J4087021Y`** `CHECKOUT.ORDER.APPROVED`, verified ✓ · **`WH-3PX21178M1172734P-09203140H58494013`** `PAYMENT.CAPTURE.COMPLETED`, verified ✓ |
| Order state in Neon | `checkouts.status = paid`, `confirmed_via = capture_response`, `webhook_confirmed_at = 2026-10-15T14:36:47Z` |

**Screenshots:**
- `gate-01-pay-page.png`: the pay page.
- `gate-02-paypal-login.png`: PayPal login.
- `gate-03-paypal-review.png`: PayPal review.
- `gate-04-paid-webhook-verified.png`: paid, with the webhook verified.

**Note:** the first attempt used a *headless* browser. PayPal's sandbox answered "Things don't appear to be working at the moment" after login (`gate-attempt1-headless-paypal-error.png`); that order, `6D850359G4688524A`, was created but never approved. A headed browser passed on the next attempt. Real buyers are not affected, but the automated gate runs headed.
