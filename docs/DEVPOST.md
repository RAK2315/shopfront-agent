# Devpost submission draft (S2, S4, S7)

> A draft for the owner to edit. Every claim here matches the build and the phase proofs in `docs/screenshots/`. Don't add a claim that isn't verified.

## Project name
Shopfront Agent

## Elevator pitch (S7)
**Planned lead (D-072). Use it only once AT-10 passes on Render; until then, keep the current pitch below.**
> Sellers with no website can now be bought from by AI shopping agents, and they run the whole shop from a chat on their phone. With Shopfront, a photo becomes a PayPal-backed listing any MCP agent can buy. Order pings, label-photo tracking and refund approvals happen in the chat, and every dollar moves through deterministic PayPal code, never the model.

**Current (verified):**
Makers who sell through social posts have no store that AI shopping agents can buy from. Shopfront Agent turns their product photos into a PayPal-backed catalog that any MCP agent can order from. The agent shops, the human approves in PayPal, and the seller's own agent ships and refunds within her rules, with every money step done by deterministic code.

## Inspiration
AI agents are starting to shop for people, but they can only buy where there's a catalog, a checkout and a payment path built for them. The independent potter who sells through posts and DMs has none of those. We wanted the smallest seller to be as buyable by an agent as the biggest store, without giving an AI the power to move money.

## What it does (S2)
- **Photos → store.** A seller drops product photos. Gemini drafts each listing with per-field confidence, flags text in the photo that looks like instructions, and leaves the price as an "AI guess" until the seller confirms it. Publishing mirrors the product into PayPal's catalog and makes it searchable by agents.
- **Agent-buyable over MCP.** One MCP endpoint covers every seller. Agents call `search_products`, `get_product` and `create_checkout`, sending **only ids and quantities**. The server prices the order from the catalog and creates a **PayPal Orders v2** order.
- **The human approves in PayPal.** The agent hands the shopper a link. Payment happens only after approval in the PayPal popup (**JS SDK v6**). The server captures, and a **signature-verified webhook** confirms it. If the webhook is late or lost, per-checkout fallback checks ask PayPal directly; there is no polling loop.
- **The seller's agent runs post-sale ops.**
  - It reads a shipping-label photo; after the seller confirms, tracking is added to the PayPal order (**Orders v2 /track**).
  - It writes the buyer a thank-you, shipping and refund notes (the facts are added by code, never by the model).
  - Refunds follow a unit-tested policy engine: automatic within policy, the seller's one-tap queue otherwise, always capped at what was paid. The capture is checked first and `PayPal-Request-Id` makes a double tap safe.
- **A dashboard you can talk to (AG Studio).** KPIs, a live agent timeline, the refund queue, and an editable ledger grouped by product. "What sold this week?" answers with figures labelled `[db]` and `[paypal]` (Transaction Search). "Show refunds by product" builds the chart. A deterministic rule raises an alert on a refund spike.
- **A live wire.** Every agent call, MCP request, PayPal call (with request and debug ids), webhook and fallback check streams to a timeline.
- **Guardrails you can poke.** "Try to hack the price" sends real attacks (price 0, a 100% discount, a negative quantity) to the MCP server. All are blocked and no checkout is created.

## How we built it
- **Stack:** Next.js (App Router) on a single **Render** free web service, **Neon** Postgres, Drizzle, TypeScript end to end. Domain logic (pricing, checkout state machine, refund policy, contracts) lives in framework-free packages with unit tests.
- **PayPal:** a thin typed REST client (OAuth cache and refresh, `PayPal-Request-Id` on every POST, debug ids logged).
  - Orders v2 (create, capture, get, track), Payments v2 (get capture, refund, get refund), Webhooks (verify signature; resend in tests), Catalog Products, Transaction Search, JS SDK v6.
  - Everything runs on the sandbox.
- **AI:** one router for every model call: cache → caps → primary → fallback → recorded replay, with `temperature: 0` and Zod-validated output.
  - The demo can run with **zero live AI** while PayPal stays live.
  - The PayPal AI Toolkit (Claude Code plugin) was used during development to check current API guidance.
- **Testing:** every phase ended with acceptance tests run **against the deployed app** with real sandbox purchases, refunds and webhooks, and no mocks. Examples: exactly-once webhooks under PayPal resends, recovery when both the webhook and the browser's capture are lost, a double-tap refund that refunds once, 10 prompt-injection attacks with every total still matching the catalog, and Lighthouse accessibility 100.

## Tools: AI models and services and how they're used (S4)
| Tool | How it's used |
|---|---|
| **Groq** (free tier), `openai/gpt-oss-120b` | The hosted buyer agent's tool calling, the insights agent, customer-note wording, refund-reason suggestion (advice only) |
| **Google Gemini** (free tier), `gemini-3.5-flash-lite` | Vision: photo → listing, shipping label → tracking. Also large AG Studio agent turns, and the fallback when Groq is rate-limited |
| **Vercel AI SDK** | Provider-agnostic calls, structured output, tool calling |
| **Model Context Protocol** (`@modelcontextprotocol/sdk`) | Our public MCP server, and the MCP client used by our hosted buyer agent |
| **AG Studio + Studio Agent Framework** | Seller dashboard. Studio's built-in agents run on our model adapter, and our insights agent works with them |
| **AG Grid** (Community) | The editable order ledger |
| **Render**, **Neon** | Hosting (free web service), Postgres |
| **PayPal AI Toolkit** (Claude Code plugin) | Development: best-practice checks and API guidance |

## Challenges
- Making webhooks the source of truth without polling: per-checkout fallback timers that survive restarts, monotonic state transitions, and duplicate-safe processing.
- Free-tier limits: Groq's 8k tokens/minute versus AG Studio's large agent turns. We route by size and record a replay so the demo survives zero AI availability.
- Gemini rejected our first extraction schema as too complex, so all limits moved into deterministic code.
- PayPal's sandbox under heavy automated testing: delayed resends and popup refusals. The tests learned to wait and retry.

## What's next
- Pay each seller directly via PayPal multiparty / partner onboarding (today every sale settles to one platform sandbox account).
- More buyer countries and currencies.
- Subscriptions and invoices for repeat customers.
- Hosting the MCP endpoint in agent directories.

## Testing notes for judges (fill in on submission day)
- Hosted demo: https://shopfront-agent.onrender.com (start at `/shop`; the first load after idle can take about a minute).
- Sandbox buyer: `<email>` / `<password>` (do not change after submitting).
- Seller: `/studio` → *Continue as Juniper Clay Studio* (shared demo seller, reset nightly).
- MCP endpoint: `https://shopfront-agent.onrender.com/mcp`.
