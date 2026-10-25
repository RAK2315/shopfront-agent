# Devpost submission (S2, S4, S7) — final text

> Paste each section into the Devpost form. Every claim here is verified by an acceptance test on the deployed app
> (see the README's "What's real" table and `docs/screenshots/final-regression.log`). Don't add a claim that isn't.
> Fields marked **OWNER** need the owner on submission day.

## Project name
Shopfront Agent

## Elevator pitch (S7; Devpost allows 200 characters)
> A seller with only photos and a PayPal account becomes buyable by any AI agent over MCP. The agent shops, the buyer approves in PayPal, and the seller runs the shop from chat. Code moves the money.

(197 characters.)

## Built with (Devpost tags)
paypal, paypal-orders-v2, paypal-js-sdk-v6, paypal-webhooks, paypal-cart-api, paypal-catalog, paypal-transaction-search, log-in-with-paypal, mcp, model-context-protocol, groq, gemini, vercel-ai-sdk, ag-grid, ag-charts, ag-studio, telegram-bot-api, next.js, react, typescript, drizzle, postgresql, neon, render, playwright, vitest, zod

## Project story

### Inspiration
AI agents are starting to shop for people, but they can only buy where there is a catalog, a checkout and a payment path built for them. The potter who sells through posts and DMs has none of those. We wanted the smallest seller to be as buyable by an agent as the biggest store, without ever giving a model the power to move money.

### What it does (S2)
- **Photos → a PayPal-backed store.** A seller drops product photos (in the web studio or in a Telegram chat). Gemini drafts each listing, marks the fields it filled, flags text in the photo that looks like an instruction, and leaves the price as a guess until the seller confirms it. Publishing mirrors the product into PayPal's catalog.
- **Buyable by any agent over MCP.** One public MCP endpoint covers every seller. Agents send only product ids and quantities; the server prices the order from the database and opens a PayPal Orders v2 order, paid **directly to that seller's PayPal** (`payee`).
- **The human approves in PayPal.** The agent hands over a link; payment happens only after approval in PayPal (JS SDK v6). The server captures, and a signature-verified webhook confirms it, processed exactly once. If a webhook is late, a per-checkout fallback asks PayPal directly.
- **Store-Sync-ready.** Every store also answers PayPal's **Cart API v1** merchant contract (store-bound JWTs, validation issues with PayPal's resolution codes, authorize at checkout, capture on ship), proven with PayPal's own Cart API client as a test agent.
- **The seller runs the shop from chat (Telegram).** Order pings; a shipping-label photo becomes tracking on the PayPal order; refunds inside the seller's policy run automatically, others wait for an Approve tap; "what sold this week?" is answered with figures labelled `[db]` and `[paypal]`. Every money action is a single-use button running deterministic code.
- **A dashboard you can talk to (AG Grid + AG Studio).** An AG Grid overview with an Ask bar (the AI changes the view, never the data, with Undo), and a five-page **AG Studio** report with our own widgets (PayPal reconciliation, Cart API funnel, live wire) and a read-only **Shop Manager** agent built on Studio's agent framework. Every AI change is listed in a strip tagged AI, with one-step Undo.
- **Reconciled with PayPal.** Every PayPal capture of the last 30 days is matched against our orders on start-up, daily and after every test suite; the badge on the dashboard says "Reconciled with PayPal ✓" or lists the mismatches.
- **The Gauntlet.** 31 attacks in 7 families (chat injection, injections hidden in product and shipping-label photos, schema smuggling, cross-store keys, replay, refund abuse), run against a naive shop and against Shopfront with the same model. The naive shop ends with real sandbox orders at the attacker's price (never approved); Shopfront blocks 31/31.
- **A live wire.** Every agent step, MCP call, PayPal request (with request and debug ids) and webhook streams to `/live`.

### How we built it
- **Stack:** Next.js (App Router) as one **Render** free web service, **Neon** Postgres with Drizzle, TypeScript end to end. Money, pricing, the checkout state machine, the refund policy and every contract live in framework-free packages with unit tests.
- **PayPal:** a thin typed REST client: OAuth token cached and refreshed server-side, `PayPal-Request-Id` on every POST, every debug id logged. Orders v2 (create with `payee`, capture, authorize, track), Payments v2 (get capture, refund, void), Webhooks (signature verification), Catalog Products, Transaction Search, Log in with PayPal, JS SDK v6, and the Cart API v1 schema from `@paypal/agentic-commerce-spec`. Sandbox only.
- **AI:** one router for every model call: cache → per-IP and daily caps → primary → fallback → recorded replay, `temperature: 0`, Zod-validated output. Groq does tool calling and chat; Gemini does vision. If both free tiers are down, recorded words are replayed (badged) while every PayPal call stays live.
- **Testing:** every feature ended with acceptance tests **run against the deployed app** with real sandbox logins, payments, refunds and webhooks, no mocks: **24 suites with 147 checks**, plus **198 unit tests**. Our books are reconciled with PayPal after every suite. Per-endpoint evidence with debug ids is in `docs/sandbox-validation.md`; the threat model maps 17 threats to the tests that prove them.

### Challenges we ran into
- **Making the webhook the source of truth without a polling loop** (the free database must sleep): per-checkout fallback timers that survive restarts, monotonic state transitions, duplicate-safe processing, and a sweep for events stored during an outage.
- **What PayPal gates for non-partner apps:** partner onboarding (403), platform fees (422) and refunding another merchant's capture (403). We pivoted to `payee` routing, so each seller is paid directly, with refunds for those sellers as a one-tap handoff to their own PayPal, tracked by webhook.
- **Free-tier AI limits** against AG Studio's large agent turns: routing by size, caching, and a replay fallback.
- **Prompt injection through images:** the vision step treats text in a photo as data; the Gauntlet exists to show the difference next to a naive shop.
- **A PayPal button that sometimes didn't open on the first click** in the v6 `auto` flow: an explicit popup with a redirect fallback, tested on 8 fresh pages.

### Accomplishments we're proud of
- No model in the system can move money, and the Gauntlet shows why that matters with real sandbox orders.
- Our books reconcile with PayPal's after every test run.
- A seller can run the whole shop from a phone.

### What we learned
Agentic commerce works when the model proposes and deterministic code decides the money, and when every claim is checked against PayPal itself (a GET, a verified webhook, Transaction Search) rather than against our own database.

### What's next
- Store Sync onboarding, so PayPal itself routes assistants to every Shopfront store (the Cart API contract is already in place).
- Partner onboarding and refunds on behalf of routed sellers, once PayPal approves us as a partner.
- More buyer countries and currencies; disputes with seller-approved evidence.

## How each judging criterion is met (J1–J5)
| Criterion | Where to see it |
|---|---|
| **Technological implementation (J1)** | Orders v2 + JS SDK v6 + verified, exactly-once webhooks with fallback checks; `payee` routing; Cart API v1 with authorize/capture-on-ship; Catalog write-back; Transaction Search reconciliation; an MCP server with strict schemas; a guarded LLM router; acceptance tests against the deployed app. |
| **Design (J2)** | A craft-retail look for sellers, a live-ops console for the wire; a purchase rail showing who acts at each step; the AG Studio report in Shopfront's theme; AI changes always visible and undoable; no sideways scroll on 13 routes at phone widths. |
| **Potential impact (J3)** | A seller with a phone and a PayPal account becomes buyable by every AI agent, paid directly, with post-sale work done from chat. |
| **Innovation (J4)** | The model proposes, code decides the money; a naive-vs-guarded Gauntlet with image injections; Store-Sync-ready stores; NL → dashboard state, never → data. |
| **Presentation (J5)** | The demo video, the judge path below, `/live` with real PayPal ids, and the proof docs. |

## Tools: AI models and services and how they're used (S4)
| Tool | How it's used |
|---|---|
| **Groq** (free tier), `openai/gpt-oss-120b` | Tool calling for the hosted buyer agent, the dashboard Ask bar, the Shop Manager and both sides of the Gauntlet; customer-note wording; refund-reason suggestions (advice only) |
| **Google Gemini** (free tier), `gemini-3.5-flash-lite` | Vision: photo → listing draft, shipping label → tracking number; large AG Studio agent turns; fallback when Groq is rate-limited |
| **Vercel AI SDK** | Every model call, through one router with caching, caps, fallback and replay; structured output with Zod |
| **Model Context Protocol** | Our public `/mcp` server (Streamable HTTP), and the MCP client inside our hosted buyer agent |
| **AG Grid, AG Charts, AG Studio + Studio Agent Framework** | The seller dashboard and the five-page report; the Shop Manager agent with read-only tools |
| **Telegram Bot API** | The seller copilot (no AI of its own; it calls our server) |
| **PayPal AI Toolkit** (Claude Code plugin) | Development: current API guidance and best-practice checks |
| **Claude Code** | Development: the AI coding agent that wrote the code and tests under the owner's direction and rules; who did what, and what the tests caught, is in `docs/development-with-ai.md` |
| **Render, Neon** | Hosting (one free web service) and Postgres (free) |

The PayPal **Agent Toolkit** is not used: the server calls PayPal's REST APIs directly so every money call is our own deterministic, tested code.

## Testing notes for judges (the 60-second path)
- **Live demo:** https://shopfront-agent.onrender.com (kept warm through Dec 15; if a page takes about a minute, the free server is waking up).
- **Sandbox test buyer** (published for judging, sandbox only): `sb-kaj47u53384870@personal.example.com` / `6cXh>ZcZ`. It is also shown with copy buttons under every PayPal button. Never changed after submission.
1. **[/shop](https://shopfront-agent.onrender.com/shop):** "Find me a handmade blue mug under $40 as a gift" → PayPal button → log in as the test buyer → **Payment complete**, webhook verified.
2. **Try to hack the price** on the same page (13 attacks, all blocked), then **[/gauntlet](https://shopfront-agent.onrender.com/gauntlet)** (31 attacks, naive shop vs Shopfront).
3. **[/studio](https://shopfront-agent.onrender.com/studio)** → *Continue as Juniper Clay Studio* → **Dashboard** → *Report · AG Studio* (desktop) → ask the Shop Manager "What needs my attention?".
4. **Telegram judge mode:** https://t.me/juniper_clay_copilot_bot?start=judge → *Simulate a buyer*.
- **MCP endpoint for your own agent:** `https://shopfront-agent.onrender.com/mcp` (Claude: Settings → Connectors → Add custom connector).
- **Repo:** https://github.com/RAK2315/shopfront-agent (MIT). **Video:** OWNER (YouTube link).
