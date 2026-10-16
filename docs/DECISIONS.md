# DECISIONS — append-only log

> Every change to scope, stack, design or plan gets an entry here **before** the code changes.
> Each entry **must cite the requirement IDs** it serves (`REQUIREMENTS.md`: R*, S*, D*, J*, P*, G*).
> Never delete entries. To reverse one, add a new entry that says "Supersedes D-0xx".
> Status values: `ACCEPTED` · `PROPOSED` (awaiting owner) · `SUPERSEDED` · `REJECTED`.

## Index

| ID | Date | Title | Status | Serves |
|----|------|-------|--------|--------|
| D-001 | 2026-10-15 | Build Shopfront Agent; Rescue is the day-3 fallback | ACCEPTED | R0, J1–J5, P1–P3, P7, P8 |
| D-002 | 2026-10-15 | Money actions only by deterministic code from validated JSON | ACCEPTED | R2, J1, G1 |
| D-003 | 2026-10-15 | Drop "temperature 0"; use structured outputs, caching and fixtures (LLM parts superseded by D-021) | SUPERSEDED | J1, P6, S6.2 |
| D-004 | 2026-10-15 | Plan to the earlier deadline; submit on Nov 11 | ACCEPTED | D1–D3 |
| D-005 | 2026-10-15 | Render paid tier (not free) through the end of judging (superseded by D-022) | SUPERSEDED | S3.b, P13 |
| D-006 | 2026-10-15 | Single-merchant settlement in the build; multi-seller payouts stated as roadmap | ACCEPTED | R1, R5, J3 |
| D-007 | 2026-10-15 | Insights = real-time DB + PayPal Transaction Search (lags up to ~3 h) | ACCEPTED | G6, P7, R2 |
| D-008 | 2026-10-15 | Customer messages are published in-app, not emailed | ACCEPTED | R4 (scope) |
| D-009 | 2026-10-15 | Stock checked at checkout, decremented at capture | ACCEPTED | J1 |
| D-010 | 2026-10-15 | Tech stack (see STACK.md) | PROPOSED | J1, J2, P9, P13, S3 |
| D-011 | 2026-10-15 | Hosted "judge mode" seller with nightly reset | PROPOSED | S3.b, R4 |
| D-012 | 2026-10-15 | Reword "discoverable" to "agent-buyable"; add one network MCP endpoint + JSON-LD storefronts | ACCEPTED (owner, D-033) | J3, J4, R5 |
| D-013 | 2026-10-15 | Tracking numbers come from a label photo or manual entry; never generated | ACCEPTED | R3, J1 |
| D-014 | 2026-10-15 | Add MCP tools `get_checkout_status` and `request_refund` (order-token auth) | ACCEPTED | P8, J1 |
| D-015 | 2026-10-15 | Video uses our hosted buyer agent; no third-party logos or UIs | ACCEPTED | S6.4, P6 |
| D-016 | 2026-10-15 | Catalog Products is a mirror (no price there); prices live only in our DB | ACCEPTED | R2, R5 |
| D-017 | 2026-10-15 | AG Grid Enterprise + AG Grid AI Toolkit for the ledger (superseded by D-023) | SUPERSEDED | P9, J2 |
| D-018 | 2026-10-15 | JS SDK v6 with client-ID auth (verify on day 1) | PROPOSED | R2, G11 |
| D-019 | 2026-10-15 | Tracking via the Orders v2 `/track` endpoint (verify with AI Toolkit) | PROPOSED | R2, G11 |
| D-020 | 2026-10-15 | Hosted URL is the primary S3 path; local `docker compose` needs the judge's own keys | ACCEPTED | S3.a, S3.b, S5.1 |
| D-021 | 2026-10-15 | $0 LLM: Gemini free (primary) + Groq free (fallback) via Vercel AI SDK; supersedes the LLM parts of D-003/D-010 | ACCEPTED (owner) | R3, R8 |
| D-022 | 2026-10-15 | Render **free** single web service + Neon free Postgres + keep-warm ping; supersedes D-005 | ACCEPTED (owner) | S3.b, P13 |
| D-023 | 2026-10-15 | Dashboard on **AG Studio** + Studio Agent Framework (sponsor brief); supersedes D-017 | PROPOSED | P9, J2 |
| D-024 | 2026-10-15 | Handle both `PAYMENT.CAPTURE.DENIED` and `.DECLINED` (webinar slide wording) | ACCEPTED | G7, G9 |
| D-025 | 2026-10-15 | Fallback checks are per-checkout timers, not a polling loop | ACCEPTED | G7, S3.b |
| D-026 | 2026-10-15 | Vite + React SPA served by Fastify (one service) instead of Next.js + API (superseded by D-027) | SUPERSEDED | S3.b, J2 |
| D-027 | 2026-10-15 | One Render free service running **Next.js** (UI + route handlers + timers); domain logic in framework-free packages | PROPOSED | S3.b, J1, J2 |
| D-028 | 2026-10-15 | LLM models pinned from live free-tier tests; provider-agnostic adapter logs provider and model per call | ACCEPTED | R3, J1 |
| D-029 | 2026-10-15 | Free-tier resilience chain: cache → primary with backoff → fallback → recorded replay (zero live AI possible) | ACCEPTED | P6, R4 |
| D-030 | 2026-10-15 | Keep-alive only in dated windows; health ping never touches the DB; Neon compute pinned to 0.25 CU | ACCEPTED | S3.b |
| D-031 | 2026-10-15 | Design language: warm editorial craft; tokens; PayPal blue only on PayPal elements; must-have visuals | ACCEPTED (owner) | J2, J5, P6 |
| D-032 | 2026-10-15 | AG Studio Pro trial received (expires Nov 29); request extension ~Nov 20; ledger must-haves | ACCEPTED | P9 |
| D-033 | 2026-10-15 | Owner agrees to critique fixes D-003/D-021, D-006, D-007, D-012, D-013, D-014 | ACCEPTED (owner) | J1, J4, R5 |
| D-034 | 2026-10-15 | Sandbox accounts fixed: US Personal buyer and US Business merchant; app verified | ACCEPTED | G3, G4 |
| D-035 | 2026-10-15 | Adopt the webinar "unhappy paths" matrix as acceptance tests, incl. a second buyer from another country | ACCEPTED | G9 |
| D-036 | 2026-10-15 | PayPal AI Toolkit dev setup via token script | ACCEPTED | G11 |
| D-037 | 2026-10-15 | Design system v1: surface mapping, neutral off-white, Alegreya + Geist + Geist Mono, WCAG 2.2 AA | ACCEPTED (owner) | J2, J5 |
| D-038 | 2026-10-15 | Groq primary for agent tool-calling + chat; Gemini primary for vision cataloging only (amends D-028) | ACCEPTED (owner) | P6, J5, R3 |
| D-039 | 2026-10-15 | Stack v3 LOCKED; repo `RAK2315/shopfront-agent` (public, MIT); Render deploy via API key; PayPal webhook created via REST API | ACCEPTED (owner) | S3.b, S5, P13 |
| D-040 | 2026-10-15 | Owner skips the second-country sandbox buyer; unhappy path #03 is covered by a second **US** buyer only | ACCEPTED (owner) | G9 |
| D-041 | 2026-10-15 | Webhook subscribes to all events (`*`) despite the PayPal skill preferring explicit types; filtered in code | ACCEPTED (owner) | G7 |
| D-042 | 2026-10-15 | Gate implementation choices: Next.js `cacheComponents` off, HMAC order tokens, `after()` for webhook processing, separate `@shopfront/paypal` package | ACCEPTED | J1 |
| D-043 | 2026-10-15 | AG Studio spike: built-in harness runs on our AgLlmAdapter → `/api/studio/turn` → LLM router; token-size risk for Phase 5 | ACCEPTED | P9, J1 |
| D-044 | 2026-10-15 | Fallback-check cadence, pay-page checks, fallback capture of approved orders, `poll_confirmed_at` + confirmation badge | ACCEPTED | G7, G9, J1 |
| D-045 | 2026-10-15 | Webhook hardening (delivery counter, forged-then-genuine upgrade) and refund/reversal reconciliation pulled forward from Phase 4 | ACCEPTED | G7, G9, J1 |
| D-046 | 2026-10-15 | Public `/live` console is the Phase 2 timeline screen; server-side LLM router singleton backed by `agent_runs` | ACCEPTED | J2, J5, R3 |
| D-047 | 2026-10-15 | AT-2 test methods: REST resend, webhook URL swap, simulated expiry, Render restart; second buyer waits on owner | ACCEPTED | G9, D-040 |
| D-048 | 2026-10-15 | Phase 2 findings on Render: failing builds fixed, two pay-page bugs fixed, sandbox resend/popup behaviour handled in AT-2 | ACCEPTED | G9, J1, S3.b |
| D-049 | 2026-10-15 | Phase 3: bound-free model schema + code-side limits, honest cataloger prompt, judge-mode seller cookie, publish rules, storefront + llms.txt | ACCEPTED | R2, R3, J1, J2 |
| D-050 | 2026-10-15 | Phase 3 AT waits for real photos while Phase 4 starts; `@vitest/coverage-v8` added for AT-4 branch coverage | ACCEPTED | J1, P6 |
| D-051 | 2026-10-15 | Phase 4: refund rules + locked executor, number-free AI notes with code-appended facts, label → confirm → /track | ACCEPTED | R2, R3, J1 |
| D-052 | 2026-10-15 | Phase 5: AG Studio dashboard, custom widgets, runtime-resolved theme, insights agent + delegation, Gemini-first long turns, spike rule | ACCEPTED | P9, J2, J1 |
| D-053 | 2026-10-15 | Ledger on AG Grid Community (Studio key does not license standalone Grid); deterministic add_chart; one layout save path; Lighthouse report hygiene | ACCEPTED | P9, J2, J1 |
| D-054 | 2026-10-15 | Phase 6: hosted /shop agent over our own /mcp, hack demo, blocked calls on the timeline, rate limits, signed failover hook (Groq primary), judge-mode reset | ACCEPTED | P8, P7, J1, J5 |
| D-055 | 2026-10-15 | Replay keys: recorded-transcript replay ignores tool-result contents (migration 0007) | ACCEPTED | P6, R4 |
| D-056 | 2026-10-16 | No Docker: S3.a verified as a fresh-clone pnpm run per the README (amends D-020, AT-7 #1) | ACCEPTED (owner) | S3.a, S5.1 |
| D-057 | 2026-10-16 | Phase 8 video built programmatically (Remotion + real Playwright captures), target 2:45; host and sponsor logos only | ACCEPTED (owner) | S6, P6, J5 |

---

## D-001: Build Shopfront Agent; Rescue is the day-3 fallback
- **Context:** Claude web research ranked 7 ideas. Shopfront scored highest (42/50), and its merchant-side agentic commerce is less crowded than buyer-side shopping agents.
- **Decision:** Build Shopfront Agent. If the day-3 gate fails (PLAN.md Phase 1), pivot to "Rescue" (a failed-subscription recovery agent). The first step of Rescue would be to verify that the sandbox can force a renewal failure.
- **Serves:** R0 (PayPal and AI both central), P8 (agentic commerce), P7, J4.

## D-002: Money actions only by deterministic code
- **Decision:**
  - Orders, captures, refunds and tracking are called only by services that take schema-validated input.
  - Prices and totals are computed from the DB.
  - No LLM is given a tool that moves money.
- **Serves:** J1, G1. It also makes the prompt-injection demo credible to PayPal engineer judges.

## D-003: Drop "temperature 0"
- **Context:** The owner's hard rule asked for temperature 0. **Current Claude models (Opus 5.5, Sonnet 5.5, Haiku 5.5) return HTTP 400 for non-default sampling parameters.**
- **Decision:** We get reproducibility from these instead:
  1. Structured outputs (`output_config.format` / `messages.parse`) and `strict: true` tools.
  2. A vision cache keyed by `sha256(image) + model + prompt_version`.
  3. A fixed demo photo set.
  4. Recorded agent transcripts, replayable if a live call misbehaves during recording.
  5. Adaptive thinking at low effort for chat routes.
- **Serves:** J1, P6 (demo reliability).

## D-004: Deadline
- **Context:** The webinar says Nov 12, 2:00 PM PT. Devpost says Nov 12, 3:00 PM EST, which is **Nov 13, 01:30 IST**.
- **Decision:** Treat Nov 13, 01:30 IST as hard. Feature freeze Nov 3, record Nov 9–10, **submit Nov 11**.
- **Serves:** D1–D3.

## D-005: Render paid tier
- **Context:**
  - A free Render Postgres **expires 30 days after creation**. One created Oct 15 dies around Nov 14, during judging.
  - Free web services spin down after 15 minutes idle, so a judge's first load is slow.
- **Decision (proposed):** 2 × Starter web services plus Basic Postgres, roughly $20–30/month, kept until results are announced. Alternative: free web services with Neon free Postgres. That is cheaper but weakens the Render prize story.
- **Serves:** S3.b, P13.

## D-006: Single-merchant settlement
- **Context:**
  - Paying each seller directly needs PayPal multiparty (Commerce Platform partner onboarding, which is gated).
  - Alternatively the `payee` field, which gets complicated for refunds.
- **Decision:** In the build, all sales settle to our US sandbox Business account. The schema keeps `paypal_merchant_id` per seller. The README states the production path honestly.
- **Serves:** R1, R5 (honest documentation), J3.

## D-007: Insights data sources
- **Context:** PayPal Transaction Search results can lag (documented up to about 3 hours), and the feature must be enabled on the app (G6).
- **Decision:** The insights agent answers "today" from our DB and history from PayPal (`list_transactions`, `get_merchant_insights`), and labels each figure's source. Seed sandbox sales at least 1 day before recording.
- **Serves:** G6, P7.

## D-008: Messages in-app
- **Decision:** Thank-you, shipped and refund messages are drafted by the agent and published to the buyer's order status page and the `get_checkout_status` tool. No email provider.
- **Serves:** Scope control (R4 on time).

## D-009: Stock handling
- **Decision:** Stock is checked at `create_checkout` and decremented on capture. If stock is gone at capture time, we don't capture: the order is voided and a "sold out" message is shown.
- **Serves:** J1.

## D-010: Tech stack
- **Decision:** See `STACK.md`. **Locked only after owner approval.**
- **Serves:** J1, J2, P9, P13, S3.

## D-011: Judge mode
- **Decision (proposed):**
  - A shared demo seller, "Juniper Clay Studio", with pre-approved products.
  - A "Try as seller" button that logs in as the judge seller.
  - Nightly reset job that restores the seed catalog and keeps the order history.
  - Sandbox buyer credentials are in the README and the Devpost testing notes.
- **Serves:** S3.b, R4.

## D-012: Reposition "discoverable"
- **Context:** No AI assistant automatically discovers a random MCP server. Saying "ChatGPT/Claude can find her shop" would be an overclaim that judges will catch.
- **Decision (proposed):**
  1. One **network-level** MCP endpoint covers every Shopfront seller (install once, shop all sellers).
  2. Every storefront page is server-rendered with **schema.org Product/Offer JSON-LD**, plus `/llms.txt`, so crawler-based agents can read it.
  3. The pitch says "agent-buyable in 90 seconds", not "discoverable everywhere".
- **Serves:** J3, J4, R5.

## D-013: Tracking numbers
- **Decision:** The seller snaps a shipping label photo (vision extracts carrier and number) or types the number. The agent never fabricates tracking. In the demo the label is a printed sandbox label with a fake number.
- **Serves:** R3 (meaningful AI), J1.

## D-014: Extra MCP tools
- **Context:** The plan had no way for a buyer agent to see whether an order was paid or to start a refund, yet the demo story needs refunds.
- **Decision:** Add `get_checkout_status` and `request_refund`. Both are authenticated with a secret `order_token` returned by `create_checkout`. Refund amounts are always computed by the server.
- **Serves:** P8, J1.

## D-015: Video and trademarks
- **Decision:**
  - The split-screen video uses our hosted `/shop` buyer agent.
  - No Instagram, WhatsApp, Etsy, OpenAI or Claude Desktop logos or UIs; we name them in words only if needed.
  - Music is royalty-free with a license, or there is none.
  - PayPal's checkout popup is shown because it is the product functioning.
- **Serves:** S6.4, P6.

## D-016: Catalog Products positioning
- **Context:** The PayPal Catalog Products API stores name, description, type, category and image URL. It has **no price**, and its main use is subscriptions.
- **Decision:** Sync approved products to it, using its ID as an Orders v2 line-item reference. We present it as "mirrored into PayPal's catalog", not as the system that powers pricing.
- **Serves:** R2, R5.

## D-017: AG Grid Enterprise and the AI Toolkit
- **Context:** Row grouping and the AI Toolkit (natural language → `setState`, v34.3+) are Enterprise features. Without them the grid is decorative, and that loses P9.
- **Decision (proposed):** Request an AG Grid trial or sponsor key. The ledger gets:
  - Grouping by product.
  - Inline edit of internal notes and ship-by date.
  - AI-filled cells: refund-risk tag and reason summary.
  - A natural-language command bar.
- **Serves:** P9, J2.

## D-018: JS SDK v6 auth
- **Context:** PayPal's current setup docs say client-ID auth is the default for standard one-time payments, and the client token is needed only for Fastlane and vaulting. Older pages disagree.
- **Decision (proposed):** Use client-ID auth. On day 1, verify with `/paypal:doctor` and the v6 docs. Fall back to a server-minted browser-safe client token (15-minute TTL).
- **Serves:** R2, G11.

## D-019: Tracking endpoint
- **Decision (proposed):** Use `POST /v2/checkout/orders/{id}/track` (current). Confirm with the AI Toolkit's `paypal-best-practices` that it is not deprecated, before Phase 4.
- **Serves:** R2, G11.

## D-020: How judges run it
- **Context:** `docker compose up` cannot work without PayPal sandbox credentials and an Anthropic key, and we will never commit those.
- **Decision:**
  - The **hosted URL** (S3.b) is the primary path.
  - The README gives a full local path (S3.a) where the judge creates their own sandbox app and pastes keys into `.env`.
  - Seed data loads automatically.
- **Serves:** S3.a, S3.b, S5.1.

## D-021: $0 LLM stack
- **Context:** The owner won't pay for an LLM API. Anthropic has no free API tier.
- **Decision:**
  - Primary: **Google Gemini API free tier** (AI Studio key): vision, JSON-schema structured output, function calling, `temperature: 0`.
  - Fallback: **Groq free tier** for text and tool calls.
  - Both accessed through the **Vercel AI SDK**, which also gives us the PayPal Agent Toolkit's AI SDK adapter.
  - `temperature: 0` is restored (the owner's original rule), with structured outputs, caching and replay on top.
- **Trade-offs:**
  - Free-tier quotas are small and change. Mitigation: caching, per-IP caps, fallback provider, replay mode.
  - Google may use free-tier prompts to improve products. Acceptable, because only sandbox and demo data is sent.
- **Supersedes:** the LLM parts of D-003 and D-010. **Serves:** R3, R8 ("Any AI tool works").

## D-022: Render free + Neon
- **Context:** The owner wants Render free.
  - Free Postgres expires after 30 days.
  - Free web services sleep after 15 minutes.
  - 750 instance-hours/month per workspace.
- **Decision:**
  - **One** Render free web service.
  - **Neon free** Postgres, which doesn't expire.
  - A free uptime pinger every 10 minutes on `/health/live`, which doesn't touch the DB.
  - No background loops that keep the DB awake.
- **Supersedes:** D-005. **Serves:** S3.b, P13.

## D-023: AG Studio
- **Context:** The sponsor brief says the AG Grid prize judges "what your dashboard looks like and how you build it": custom widgets, theming, layout, and the **Studio Agent Framework** ("a custom agent talking to Studio's built-in agents, or a swapped-in harness"). A 45-day trial and a PayPal boilerplate are offered.
- **Decision (proposed):** The seller dashboard is an AG Studio dashboard with:
  - Custom widgets:
    - Live agent→MCP→PayPal→webhook timeline.
    - Refund approval queue.
    - Order ledger (AG Grid).
    - Refund-rate tile.
    - Revenue by product.
  - Our theme.
  - Our insights agent registered in the Studio harness through `directLlmRunner` with our Gemini adapter. It delegates to Studio's built-in agents to create or edit widgets ("show refunds by product this week" → new widget).
  - An anomaly rule: a refund spike creates an alert widget.
- **Timing:** Request the trial around Oct 27, so it lasts through judging.
- **Supersedes:** D-017. **Serves:** P9, J2.

## D-024: Capture-declined event name
- **Context:** The webinar slide lists `PAYMENT.CAPTURE.DECLINED`, but PayPal's event reference uses `PAYMENT.CAPTURE.DENIED`.
- **Decision:** Subscribe to all events and map both to `capture_denied`. Confirm with the webhook simulator.
- **Serves:** G7, G9.

## D-025: Fallback timers instead of a polling loop
- **Decision:** When a checkout is created or approved, schedule in-process checks at +60 s, +3 min and +10 min. Those checks GET the order and reconcile it only if no webhook has arrived. On boot, re-schedule for open checkouts. This keeps webhooks primary (the slide says "Don't poll. Let PayPal tell you") and lets Neon sleep.
- **Serves:** G7, S3.b.

## D-026: One service (Vite SPA + Fastify)
- **Decision (proposed):**
  - Drop Next.js.
  - Fastify serves the API, MCP, webhooks and SSE, plus the static Vite build.
  - Storefront pages `/s/:handle` are rendered server-side as plain HTML with JSON-LD.
- **Serves:** S3.b (free-tier hours), J2.

## D-027: One Next.js service on Render free
- **Context:** The owner requires Next.js and top visual quality, and was open to Next.js + Fastify if that's better. Render free is 750 instance-hours per workspace per month (verified 2026-10-15). Two always-on services need about 1,440 h.
- **Options:**
  - (a) Next.js + Fastify, both allowed to sleep: two ~1-minute cold starts, and the webhook and MCP endpoints sleep separately from the UI.
  - (b) **One Next.js service.** Route handlers provide `/mcp`, `/webhooks/paypal`, `/api/*` and SSE. `instrumentation.ts` starts the fallback timers. It fits in 750 h with headroom, and there's one cold start.
  - (c) Fastify serving a Vite SPA (D-026). Rejected, because the owner requires Next.js.
- **Decision (proposed):** (b). Domain logic stays in `packages/*` (core, db, llm, mcp) with no framework imports. Moving the API to Fastify later only changes the transport layer. The frontend isn't affected.
- **Supersedes:** D-026. **Serves:** S3.b, J1, J2.

## D-028: LLM models (live-tested 2026-10-15 on the owner's free keys)
- **Gemini**:
  - `gemini-3.5-flash-lite` did vision + JSON schema in 3–11 s and handled function calling (10 s). It is the **primary for every route**.
  - `gemini-flash-latest` resolves to `gemini-3.8-flash`. It worked for vision but took 41 s, and the next call returned **503 (overloaded)**. It is **optional** and used only for offline cataloging, with retry.
- **Groq**: `openai/gpt-oss-120b` handled tool calling. Limits are **1,000 requests/day, 8,000 tokens/min**. It is the **fallback** for text and tools (no vision).
- **Pinned versions instead of `-latest` aliases**, so cache keys and behaviour don't drift.
- Every call records `{provider, model, route, latency, tokens, cache_hit, fallback_reason}` to `agent_runs`, and the timeline shows it.
- **Serves:** R3, J1.

## D-029: Free-tier resilience chain
- **Order:**
  1. Cache hit by input hash (`sha256(route + model-family + prompt_version + normalized input)`).
  2. Primary provider, with exponential backoff and jitter on 429/503 (max 2 retries, honours `retry-after`).
  3. Fallback provider.
  4. **Recorded transcript replay** (for agent routes) or a "needs manual input" UI state (for extraction).
- The demo can run with **zero live AI calls**, while the PayPal calls stay live. The timeline badges each AI step: `gemini` / `groq` / `cache` / `replay`.
- **Serves:** P6, R4.

## D-030: Keep-alive windows and DB protection
- The pinger (cron-job.org, free) hits `/api/health/live`, which **never queries the DB**. Neon free is 100 CU-hours/month (verified), so pinging the DB every 10 minutes would keep it awake and exhaust compute in about 17 days.
- Neon compute is fixed at **0.25 CU min and max**.
- Windows are dated in PLAN.md §5.
- **Serves:** S3.b.

## D-031: Design language (owner directive)
- **Palette:** warm editorial craft. Off-white paper, ink text, **one clay accent**. Serif headings (Fraunces), sans for data (Inter, tabular numbers), mono for request IDs (JetBrains Mono).
- **PayPal blue appears only on real PayPal elements** (the PayPal button, PayPal-sourced events, PayPal IDs).
- **Must-have visuals:**
  - Photo → product-card morph.
  - Split-screen buyer agent and seller dashboard.
  - Live timeline Agent → MCP → PayPal → Webhook → Seller agent, with **real request IDs**.
  - AG Grid ledger with grouping, inline edits, AI-filled cells, and low-confidence highlighting.
- **Rule:** never trade visual quality for a simpler stack.
- **Serves:** J2, J5, P6.

## D-032: AG Studio trial
- **Context:** The owner received an **AG Studio Pro** 45-day trial key on 2026-10-15. It **deactivates Nov 29, 2026**, likely before judging ends. The email offers extensions via AG Grid sales.
- **Decision:**
  - The key lives in env only, never in git (`NEXT_PUBLIC_AG_LICENSE_KEY`; front-end keys end up in the bundle, which is normal for AG Grid).
  - **~Nov 20:** email AG Grid asking for a trial extension through judging (to Dec 31).
  - If the key lapses, the watermark is acceptable to the owner.
  - Ledger must-haves are as in D-031.
- **Amends:** the trial timing in D-023. **Serves:** P9.

## D-033: Critique fixes accepted by owner
- The owner agreed to D-003 (now realised through D-021/D-028/D-029), D-006, D-007, D-012, D-013 and D-014.
- **Serves:** J1, J4, R5.

## D-034: Sandbox accounts
- **Buyer (US Personal):** `sb-kaj47u53384870@personal.example.com`.
- **Merchant (US Business):** `sb-0navv53304003@business.example.com`. The REST app `shopfront-agent` is linked to it.
- **Verified 2026-10-15:**
  - The OAuth token works (9 h).
  - The token has the Transaction Search scope.
  - The merchant balance is in USD.
  - Orders v2 create returned `CREATED` with `payee.merchant_id=DY7U9FZDLKJRE`.
- These sandbox emails are not secrets. Passwords live in `.env` and will be published in the README for judges at submission.
- **Serves:** G3, G4.

## D-035: Unhappy-path matrix (webinar slide "08 scenarios")
- Every phase's acceptance tests must cover, where applicable:
  1. A successful payment.
  2. A cancelled checkout (the buyer walks away).
  3. **Different users: a new buyer from a new country** (a second sandbox Personal account outside the US).
  4. A refund from the merchant side.
  5. Failures and edge cases.
- **Serves:** G9.

## D-036: PayPal AI Toolkit for development
- The plugin is installed with `/plugin install paypal@claude-plugins-official`.
- `scripts/refresh-paypal-ai-toolkit-token.mjs` mints a sandbox token from `.env` and merges it into `~/.claude/settings.json` as `env.PAYPAL_SANDBOX_ACCESS_TOKEN`. Re-run it every ~8 h, or on a 401. Restart Claude Code after.
- **Serves:** G11.

## D-037: Design system v1
- **Owner answers (2026-10-15):** register **both**, with surfaces mapped as follows:
  - Seller onboarding and storefront = **craft retail**, with editorial serif headings.
  - Dashboard, timeline and buyer split screen = **live ops console**.
  - AG Grid ledger = **precision density inside the console look**.
  - **One shared token system** (palette, type scale, radius), so the shift reads as intentional and not like two apps.
  - Background **neutral off-white** (chroma 0), not warm cream. **WCAG 2.2 AA + reduced motion.**
- **Typography change:**
  - Fraunces and Inter (my earlier pick, never owner-specified) are on the design skill's list of overused AI defaults.
  - Replaced by **Alegreya** (serif headings: calligraphic, book-like warmth for craft retail), **Geist** (UI and data, tabular figures) and **Geist Mono** (request IDs).
- **Brand seed colour:** the design skill suggested cobalt. Declined, because the owner committed to one clay accent and blue is reserved for PayPal (D-031).
- **Artifacts:**
  - `apps/web/PRODUCT.md` and `apps/web/DESIGN.md`.
  - Tokens in `apps/web/src/app/globals.css`.
  - Base components in `apps/web/src/components/{ui,console}`.
  - Style guide at `/design`, verified by Playwright at 1440 px and 390 px: no console errors, no horizontal overflow.
- **Note:** the `frontend-design` skill the owner mentioned is not installed. The installed `impeccable` design skill was used instead.
- **Supersedes:** the font names in D-031 and STACK v3. **Serves:** J2, J5.

## D-038: Route-based providers
- **Context:** On 2026-10-15, live checks measured `gemini-3.5-flash-lite` at **11.7 s** for a one-word reply on the free tier, against **0.6 s** for Groq `openai/gpt-oss-120b`. A 12 s pause per buyer-agent turn would kill the split-screen video.
- **Decision:**
  - Routes `buyer`, `ops`, `insights`, `grid`, `refund_reason` and `message` use providers **groq → gemini** (`LLM_AGENT_PROVIDERS`).
  - Routes `cataloger` and `label`, which are vision, use **gemini** only (`LLM_VISION_PROVIDERS`), because Groq has no vision. The photo → card morph animation covers their latency, and results are cached by image hash.
  - The resilience chain (D-029) is unchanged.
  - Budget implication: Groq free gives 1,000 requests/day and **8,000 tokens/min**. Agent prompts and tool schemas must stay compact, and the buyer agent keeps short histories.
- **Amends:** D-028. **Serves:** P6, J5, R3.

## D-039: Lock and ship
- **Stack:** STACK.md v3 is approved by the owner and LOCKED.
- **Repo:** created with `gh` as `RAK2315/shopfront-agent` (public, MIT). Secrets and `personal research/` are git-ignored.
- **Render:** the free web service is created through the Render API (`RENDER_API_KEY` stays in local `.env` only, never in Render env).
- **PayPal webhook:** created with `POST /v1/notifications/webhooks` using the app's own credentials (event types `*`, filtered in code). The returned id goes into `PAYPAL_WEBHOOK_ID`.
- **Serves:** S3.b, S5, P13.

## D-040: No second-country buyer
- **Context:** The owner chose to skip creating a non-US sandbox buyer.
- **Decision:** Unhappy path #03 ("different users") is tested with a second **US** sandbox Personal account instead. The "new country" part of the webinar slide is not covered, and the README will say so.
- **Amends:** D-035. **Serves:** G9.

## D-041: All webhook events
- **Context:** The PayPal AI Toolkit best-practices skill recommends registering explicit event types. The owner asked for "all events, filter in code", which also matches the webinar presenter's habit (G7).
- **Decision:** Register `*`. `processWebhook` routes the events we act on and marks the rest `ignored`. Every event is still signature-verified and stored once by event id.
- **Serves:** G7.

## D-042: Gate implementation choices
- **`cacheComponents` off:** payment, MCP and webhook routes are request-time by nature. Classic dynamic rendering avoids wrapping every DB read in Suspense, and the static pages (`/`, `/design`) are still prerendered.
- **Order token = HMAC(SESSION_SECRET, checkoutId):** an idempotent `create_checkout` retry returns the same token without storing a secret (only its hash is kept).
- **Webhooks:** the signature is verified and the event stored *before* responding. Processing runs in `after()`, so PayPal gets a fast 2xx and retries cover crashes, because unprocessed rows are re-claimable.
- **`@shopfront/paypal` package:** a thin REST client with token caching, required `PayPal-Request-Id` on POST, debug-id capture and 429/5xx backoff. It refuses non-sandbox base URLs.
- **Rehearsal (2026-10-15):** a local run of agent → MCP → Orders v2 → popup approval → capture reached `COMPLETED` (order `0K40035845525545N`, capture `39L78000BY223680X`). The webhook leg needs the public Render URL.
- **Serves:** J1.


## D-043: AG Studio spike (Phase 2)
- **Context:** PLAN Phase 2 asked for a 2-hour spike running "the sponsor's AG Studio + PayPal boilerplate" and confirming `directLlmRunner` works with our AI SDK adapter. No public boilerplate repo was found (the `ag-grid` GitHub org has only `ag-grid/skills`; the docs page for the Direct LLM runner returned 404). **Deviation:** the spike used the official npm packages `ag-studio@3.0.0` + `ag-studio-react@3.0.0` and the shipped type definitions instead.
- **What was built:** `AgLlmAdapter` (`components/studio/llm-adapter.ts`) → `POST /api/studio/turn` → `llm().agent.chatStep` (route `grid`, Groq → Gemini, budget guard, `agent_runs` log). Studio's built-in harness (`createAiHarness(api, { adapter, primary: 'lead' })`) runs on it. `directLlmRunner` takes the same `AgLlmAdapter`, so our custom insights agent in Phase 5 plugs into the same adapter.
- **Result (local, 2026-10-15):** with real checkout rows as the data source, "Add a column chart showing total_usd by status" ran 4 turns, all answered by Groq `openai/gpt-oss-120b`: `view_report` → `delegate_to` (page agent) → `add_widget` → done. A widget appeared. The trial licence key removed the watermark. There were no console errors.
- **Risks for Phase 5:**
  1. Turns are **~3.8k–10.3k tokens** because Studio sends its full tool set. That is at or above Groq's free **8k tokens/minute**, so multi-turn runs will hit 429s and fall back to Gemini (~12 s per turn). Mitigation: pass a trimmed toolset through `directLlmRunner` for our agent, keep histories short, and pre-build the default layout in code.
  2. The first widget was added unconfigured (a chart shell), and the lead agent was still working after 90 s. Phase 5 needs tighter instructions and the AT-5 prompt verified end to end.
- **Spike page:** `/spike/studio` (noindex, not linked). It is replaced by the Phase 5 dashboard.
- **Serves:** P9, J1.

## D-044: Fallback checks (implements D-025)
- **Cadence:**
  - Checkout created: +60 s, +3 min, +10 min, plus an expiry check at `expires_at` + 5 s.
  - **Pay page opened: +45 s, +90 s, +150 s, +210 s, +300 s, +600 s** (no gap over 60 s).
  - Paid by our capture response: +60 s, +3 min, +10 min, to confirm with PayPal if no webhook comes.
  - On boot (`instrumentation.ts`, 3 s after start): re-arm every checkout from the last 3 days that is open, or paid but unconfirmed. Expired ones are checked at once. One query, no loop.
- **Deviation from D-025 ("when a checkout is created or approved"):** we cannot observe approval when the capture call is lost (tab closed, network gone) and the webhook is lost too. So the pay page arms denser checks, which catch such an approval within about a minute (AT-2 "within 60–70 s").
- **A check reads our row first** (`needsFallbackCheck`, pure and unit-tested in `packages/core/src/reconcile.ts`). It calls `GET /v2/checkout/orders/{id}` only if a webhook has not already confirmed the payment. It then acts:
  - `settle` if a capture exists.
  - **`capture` if the order is `APPROVED` with no capture.** This is deterministic code with the same `PayPal-Request-Id = capture-{checkout}`, so it cannot double-capture.
  - `expire` (→ `cancelled`) if the order was never approved and our expiry has passed.
  - `wait` otherwise.
- **Confirmation badge:** a new nullable column `checkouts.poll_confirmed_at` (migration `0002`). `confirmationOf()` ranks the sources: `webhook` (verified `PAYMENT.CAPTURE.COMPLETED`) > `poll` (a fallback check confirmed or performed the capture) > `awaiting_webhook`. It is shown on `/pay` and `/live`.
- **Serves:** G7, G9, J1.

## D-045: Webhook hardening and refund reconciliation
- **Delivery counter:** `webhook_events.deliveries` and `last_delivery_at` (migration `0003`). Every delivery of an event id, including PayPal retries and Dashboard or API resends, increments the counter. Processing still happens once. The counter is the evidence for "received N×, processed once".
- **Forged-then-genuine:** a forged POST could claim a real event id first. A later delivery of that id that **does** verify replaces the unverified row and is processed. Another unverifiable copy changes nothing. The verify call's `PayPal-Request-Id` is now per transmission, because a resend is a new delivery to verify.
- **Pulled forward from Phase 4:**
  - `PAYMENT.CAPTURE.REFUNDED` reconciles refunds made anywhere, **including by the merchant directly in PayPal** (unhappy path #04). It finds the capture from the refund's `up` link, then **GETs the capture**, so PayPal's own status decides full vs partial. It stores the cumulative `seller_payable_breakdown.total_refunded_amount`, then moves the checkout to `partially_refunded` or `refunded`.
  - `PAYMENT.CAPTURE.REVERSED` moves the checkout to `reversed`.
  - The refund **executor**, the policy engine and `request_refund` remain Phase 4.
  - Shapes were verified against PayPal's published OpenAPI specs (Payments v2, Webhooks v1) on 2026-10-15, because the AI Toolkit's reference files don't cover them.
- **Serves:** G7, G9, J1.

## D-046: `/live` console and the LLM router singleton
- **`/live`:** the Phase 2 timeline screen. It is a public, read-only ops console showing the SSE timeline (`/api/events`: backlog replay, `Last-Event-ID` resume, 20 s comment heartbeats that never touch the DB) and recent checkouts with status, confirmation badge, buyer country and PayPal ids. It shows **no buyer email or address**. The Phase 5 AG Studio dashboard reuses these components.
- MCP tool-call events now carry readable summaries (query and result count, product title, status). They never carry `order_token`.
- **`server/llm.ts`:** one router per process (`agent` = Groq → Gemini, `vision` = Gemini). It applies `MemoryBudget` caps from env, and uses `agent_runs` as the call log, the cache and the replay store (D-029). It was built now because the AG Studio spike needed it; Phases 3–6 use it.
- **Serves:** J2, J5, R3.

## D-047: How AT-2 is tested (no mocks)
- **"Resend from the Dashboard"** is done with the equivalent REST call, `POST /v1/notifications/webhooks-events/{id}/resend`. It is scriptable and gives the same delivery.
- **"Webhook URL temporarily wrong"** is done with `PATCH /v1/notifications/webhooks/{id}` (URL → `/webhooks/paypal-wrong`, then restored in a `finally`). The browser's capture call is blocked to simulate a closed tab. So only a fallback check can complete the order.
- **Expiry** is simulated by setting `expires_at` in the past, instead of waiting 3 hours.
- **Restart** is done with the Render API (`POST /v1/services/{id}/restart`). The expired checkout's `checkout_expired` event must carry `trigger=boot`, which proves the restarted process did the work.
- **Second US buyer (D-040):** the owner created `sb-tuny953392663@personal.example.com` on 2026-10-15 (credentials only in `.env`). Check F passed the same day.
- **Serves:** G9, D-040.


## D-048: Phase 2 findings from running AT-2 on Render
- **Render builds had been failing since the Phase 1 handoff.** `next build` type-checks `apps/web/scripts/`, and `phase1-checks.mts` imported `./buyer-agent.ts`, which tsc rejects. So Render kept serving `6c7170f`. Fixed by importing `./buyer-agent.js` (tsx maps it to the `.ts` file).
- **Pay-page bug:** `hidden` on the `<paypal-button>` web component is ignored, so the button looked clickable before the v6 payment session existed, and an early click did nothing. The fix hides a wrapper instead and exposes `data-phase` as a readiness signal.
- **Pay-page bug:** after a fallback check confirmed the capture ("via poll"), the page stopped following, so a webhook arriving 11 s later never showed. It now keeps following at 10 s intervals until the webhook arrives, for at most 5 minutes.
- **Sandbox behaviour observed (not ours):**
  - **Resends:** PayPal rejects a resend with "Resource id is invalid" for about a minute after the event, then delivers resends of fresh events after anywhere from seconds to tens of minutes, sometimes in bursts. AT-2 retries the resend and waits up to 10 minutes.
  - **Popups:** after many automated logins, popups sometimes show "Things don't appear to be working" or don't open, and once that happens a browser context opens no further popups. AT-2 uses a fresh context per check group and retries a popup up to 3 times on the same order.
- **Serves:** G9, J1, S3.b.

## D-049: Phase 3 design choices
- **Extraction schema:** Gemini returned 400 "invalid argument" when `ProductExtraction` had both the `attributes` and `variants` arrays with length, count and range bounds (too many constraint states; bisected on 2026-10-15). The model-facing schema now has **no bounds** (limits are written as descriptions). Variant options are name/value pairs instead of a record. Every limit (lengths, counts, 0–1 confidences, price confidence ≤ 0.5, breadcrumb categories → last segment) is enforced in `draftFromExtraction`, the deterministic step, and unit-tested.
- **Cataloger honesty:** with the seller's bio in the prompt, the model called a flat illustration "wheel-thrown stoneware" at 90% confidence. The prompt now carries only the shop name and says "describe only what is visible". Prompt version `cataloger-v2`.
- **Instruction text in photos:** flagged both by the model (`flags`) and by a code-side phrase check (`injectionFlags`). The card shows the flag. Prices are only ever set by the seller.
- **Seller sign-in (judge mode, D-011):** a signed cookie for the one demo seller (`juniper_clay`), with no password. Nightly reset stays in Phase 6.
- **Drafts:** one photo → one draft. The same photo returns its existing listing. A discarded photo re-uploaded is drafted from the cached extraction (`agent_runs` by input hash), and the UI shows "From cache". When both providers fail, the card offers "Enter details yourself" (a blank draft, no AI).
- **Approve = publish:** a single strict request carries the final fields and a `price_confirmed: true` literal, with a price of at least $1.00 for **every** active variant. The API rejects anything else (AT-3). PayPal Catalog Products gets our product id as its id (`POST` with `PayPal-Request-Id = catalog-{id}-v{version}`, then `PATCH` on later edits). A failed sync leaves the listing live and is shown on the timeline.
- **Storefront:** `/s/{handle}` (ItemList JSON-LD) and `/s/{handle}/{productId}` (Product + Offer JSON-LD), plus `/llms.txt`, all server-rendered. An "agent-buyable" note shows the MCP endpoint.
- **Local dev:** `SHOPFRONT_DISABLE_TIMERS=1` stops a local server from re-arming fallback timers against the shared database.
- **Demo photos:** the owner will shoot 6 real phone photos plus a label photo (2026-10-15). Until then, rendered placeholders exercise the pipeline. AT-3 runs on the real set.
- **Serves:** R2, R3, J1, J2, D-012, D-013, D-016.


## D-050: Phase order and one dev dependency
- **Phase 3 → 4 overlap (deviation from PLAN's sequence):** AT-3 needs the owner's 6 real product photos. The owner chose to shoot them within 2 days rather than use generated or stock images. So Phase 3 is built and deployed but not closed, and Phase 4 starts now. AT-3 runs as soon as the photos land. If they are not ceramics, the demo studio is renamed to match the items (owner, 2026-10-15).
- **`@vitest/coverage-v8@5.0.4` (dev only, root):** AT-4 requires measured 100% branch coverage of the refund policy engine, and Vitest needs a coverage provider to measure it. This is a tooling addition made because an acceptance test requires it, which is within the owner's "no tooling changes unless something breaks" spirit. It is never shipped.
- **Order tokens in screenshot filenames:** the screenshot script once named files after pay URLs, which contain the order token. The files were renamed before any commit, and the script now drops query strings.
- **Serves:** J1, P6, R4.


## D-051: Phase 4 design choices (seller ops)
- **Refunds (`server/refunds.ts`):**
  - `request_refund` returns `NOT_REFUNDABLE` before any PayPal call when the order is not paid or partly refunded, or has no capture.
  - The amount always comes from the order snapshot (`refundAmountForItems`), capped at the remaining captured amount.
  - Only one open request per order, so a retrying agent gets the same request back.
  - The model's reason suggestion (Groq, `refund_reason` route) is stored for the seller as advice and is **never an input to `decideRefund`**.
- **Executor:**
  - A single function serves both automatic and seller-approved refunds.
  - It runs in one transaction with `SELECT … FOR UPDATE` on the refund request and the capture, so a double tap waits and then sees `executed`.
  - It GETs the capture first (status must be `COMPLETED`/`PARTIALLY_REFUNDED`, with enough balance left).
  - It refunds with `PayPal-Request-Id = refund-{id}`.
  - Holding the row lock across the PayPal call (about 1 s) is acceptable at demo scale.
- **Seller notes (D-008):**
  - The model (Groq, `message` route) writes only the wording and is told to use no numbers. Any draft containing a digit is replaced by a template.
  - The facts line (amount, carrier, tracking number) is appended by code from the database.
  - The thank-you note fires on the first transition to `paid`, whichever path gets there first.
  - Notes appear on the buyer's order page (`/pay/{id}`) and in `get_checkout_status`.
- **Tracking:**
  - The label photo is read by Gemini (`label` route, bound-free schema) as a **suggestion**.
  - The seller confirms; then `POST /v2/checkout/orders/{id}/track` sends `capture_id`, `carrier` (USPS/UPS/FEDEX/DHL or `OTHER` + name) and `notify_payer: false`.
  - We store PayPal's tracker id from the response. Tracking numbers must contain a digit, so free text is never accepted as a number.
- **Orders screen** (`/studio/orders`, craft-retail register until Phase 5 moves it into AG Studio): the refund queue comes first (human decisions lead), then orders with ship actions, notes, refunds and PayPal ids.
- **Serves:** R2, R3, J1, D-002, D-008, D-013, D-014, G9 #04.


## D-052: Phase 5 design choices (AG Studio dashboard)
- **Surface:** `/studio/dashboard` is an AG Studio instance (`ag-studio@3.0.0`, edit mode) with three data sources from `dashboardData()`:
  - `orders`, `lines` and `refunds`.
  - Each has explicit field definitions: readable names, `currencyFormat` for money, `dateFormat` for dates.
- **Dependencies:** `ag-grid-react`, `ag-grid-enterprise` and `ag-grid-community` were added at **exactly 36.2.0**, the versions AG Studio already ships, so the ledger widget shares one AG Grid. They use the same trial licence key.
- **Custom widgets** (registered with `createWidgets`, in a "Shopfront" menu group):
  - Live agent timeline (one shared SSE stream per page, debounced reloads).
  - Refund queue (one tap; it calls the same deterministic executor as AT-4).
  - Order ledger (AG Grid, grouped by product, grand total). Inline `note` and `ship_by` edits go to a strict PATCH that can write nothing else.
- **Built-in widgets in the preset:** 4 KPI tiles and revenue by product. A saved seller layout (`sellers.dashboard_state = { preset, state }`) overrides the preset. **Our preset version lives beside Studio's state, never inside it:** a custom `version` field there made Studio reject the whole state.
- **Theme:** Studio's default `studioTheme` with our tokens. AG Charts draws on canvas and parses colours itself, so `var(--…)`/`oklch()` values crashed its data engine ("str.toLowerCase is not a function"). Tokens are resolved to hex at runtime through a 1×1 canvas. The chart palette starts with clay (one accent), then warm neutrals and the status hues.
- **Agents:**
  - Our **insights agent** (`directLlmRunner`, primary) has two read-only tools and answers with figures labelled `[db]`/`[paypal]`:
    - `db_sales_summary` (our DB, real time).
    - `paypal_transactions` (Transaction Search, verified against the published v1 spec; sales = event codes `T00xx` > 0, refunds = `T1107`; the sandbox's `T1900` starting balance is excluded).
  - For "show / chart / add" requests it **delegates to Studio's page agent** with a precise brief, and asks for widget-level filters only. Studio's page, widget and data agents run on the same adapter.
  - The models change views and widgets only (AT-5 checks a checksum of every money row).
- **Token budget (D-043 follow-up):** `/api/studio/turn` sends turns over ~6.5k tokens to `llm().long` (Gemini → Groq), because Groq's free tier is 8k tokens/minute. Smaller turns stay on Groq. Measured locally: the insights turns ran on Groq at 0.7–1.5k tokens; the page agent's 11–13k-token turns ran on Gemini; one full "show refunds by product" run took about 17 s.
- **Refund spike:** a deterministic server rule (`checkRefundSpike`, ≥ 4 executed refunds in 10 minutes, at most one alert per 10 minutes) emits a `refund_spike` event. The open dashboard inserts a full-width alert text widget with the explanation. No model is involved.
- **Test handle:** `window.__shopfrontStudio` exposes the Studio API (read and setState) for AT-5. It grants nothing beyond what the seller's own page can already do.
- **Local development:** `next dev` on this Windows machine recompiles and reloads on every request (a dev-server/HMR quirk; the files were unchanged), so Phase 5 was verified on a local **production** build (`next build && next start`) and then on Render.
- **Lighthouse** runs through `npx lighthouse@12.8.2` inside the AT-5 script. It is not a project dependency, and its cookie-header file is written to the OS temp dir, not the repo.
- **Serves:** P9, J2, J1, R2, D-007, D-023, D-043.


## D-053: Ledger on AG Grid Community; deterministic `add_chart`; one layout save path
- **Licence finding:**
  - The AG Studio Pro trial key licenses AG Studio, including its embedded grids and charts. It does **not** license standalone `ag-grid-enterprise`: setting it there logged "Invalid License Key" and watermarked the ledger.
  - The ledger now uses **AG Grid Community** (free, no watermark). Product grouping is built in code: full-width product rows with order count, subtotal and refunds, plus a pinned grand-total row. `ag-grid-enterprise` is no longer a direct dependency.
  - If the owner later gets an AG Grid Enterprise key (info@ag-grid.com), native row grouping is a small change.
- **`add_chart` tool (deviation from "delegate to Studio's agents" for charts):**
  - On Render, Studio's page agent added a chart **without its data mapping** and put a page-wide filter on every widget.
  - Our insights agent now builds charts with a deterministic tool. The model picks the chart type, source, fields (closed lists), aggregation and window; code writes the complete widget with a **widget-level** filter.
  - Open-ended layout requests still delegate to Studio's page, widget and data agents, so the Studio Agent Framework story (a custom agent working with Studio's built-ins) holds.
- **Layout persistence:** Studio fires `onStateUpdated` for its own UI and agent changes, but not for programmatic `setState`. Every change our code makes (`add_chart`, the refund-spike alert) goes through the same save path.
- **Edit mode by default:** Studio shows its AI assistant only in edit mode. In edit mode Studio keeps pointer gestures for itself, so ledger cells are edited by selecting a ✎ cell and typing or pressing Enter (shown as a hint). A "Preview" toggle switches to view mode.
- **Lighthouse report hygiene:** Lighthouse stores the `--extra-headers` it was given in its JSON report, so the committed dashboard report briefly contained the shared demo seller's session cookie (pushed in `304a503`). It was redacted in `4fba953`, and AT-5 now strips it.
  - That cookie is publicly obtainable: judge mode signs anyone in as that seller without a password. It is an HMAC output, so it reveals nothing about `SESSION_SECRET`.
  - History was not rewritten.
- **Serves:** P9, J2, J1.

## D-054: Phase 6 choices (hosted buyer agent and guardrail showcase)
- **`/shop`:** the hosted buyer agent is a real MCP client of our own public `/mcp` (client `shopfront-web-agent`), so it has exactly the powers any external agent has.
  - The chat streams NDJSON events: steps with their AI source, tool calls and results, and text.
  - Tool results reach the browser without `order_token`, which stays in the server-side `buyer_sessions` row (migration `0005`).
  - The checkout card hands off to `/pay/{id}` (PayPal blue only there). The live timeline sits beside the chat for the split-screen moment.
  - Prompt `shop-v2`: buy the best match when type or budget are given, reply in 1–3 plain sentences.
- **"Try to hack the price":** it sends three real protocol attacks to `/mcp`: an item `price` of 0, a `total` with `discount_percent`, and a negative quantity. All three are rejected by the strict schemas; 0 checkouts are created and no LLM or PayPal call is made. Then the same trick goes to the agent as a prompt.
  - `/mcp` pre-validates tool calls with the same schemas, so each blocked attempt appears on the live timeline ("create_checkout blocked by server · unknown field "price"").
- **Rate limits:** in-memory, per IP: `/mcp` 120/min, `/api/shop/chat` 12/min, `/api/shop/hack` 6/min. The LLM caps (per day, per IP per hour) stay in the router.
- **Failover test hook (deviation from AT-6 wording):** on agent routes, **Groq is primary** (D-038), so AT-6 forces the 429 on Groq and expects Gemini, rather than the reverse. The hook only works with a header signed by `SESSION_SECRET`, for one request (AsyncLocalStorage). The timeline shows "fallback after groq:429".
- **Judge mode (D-011):**
  - `POST /api/admin/demo {action: freeze|reset}` with a bearer token derived from `SESSION_SECRET` (no new secret).
  - A reset restores the frozen demo catalog (listings, prices, stock, bio, refund policy), archives anything judges added, and clears the saved dashboard layout. **Orders, payments, refunds and events are kept.**
  - For the demo seller, the per-buyer automatic-refund count starts at the last reset, so shared sandbox buyers can't exhaust automatic refunds for a month (HANDOFF risk 11). The rule itself is unchanged.
  - cron-job.org calls the reset nightly from Nov 8 (owner sets it up with the keep-alive pinger).
- **Serves:** P8, P7, J1, J5, S3.b, G9, D-011, D-029.


## D-055: Replay keys for the zero-AI demo (refines D-029)
- **Problem:** replay looked up recorded answers by the exact input hash. That hash includes tool results (stock counts, prices, ids, timestamps), so after any data change a recorded agent conversation no longer matched, and `LLM_MODE=replay` would fail mid-demo.
- **Decision:** chat steps also compute a **replay key**: route, prompt version, system prompt, user and assistant text, tool **names** in order, and the tool list. Tool-result **contents** are left out.
  - Every logged call stores it (`agent_runs.replay_key`, migration `0007`).
  - Replay mode looks up by replay key. The cache still uses the exact input hash, so live mode never serves an answer computed on different data.
- **Why this is safe:** in replay mode the PayPal calls and tool results stay live. Only the model's words and tool choices are replayed, and money still goes through the deterministic code. A unit test covers a recorded step replaying after the stock changed.
- **Serves:** P6, R4, D-029.


## D-056: No Docker; S3.a verified as a fresh-clone pnpm run (amends D-020 and AT-7 #1)
- **Owner decision (2026-10-16):** drop `docker compose`. Docker isn't installed on the owner's machine, and the rules accept clear local-run instructions **or** a hosted URL (S3); we provide both.
- **AT-7 #1 becomes:** a fresh clone of the public repo, following only the README (`pnpm install` → `.env` → `db:migrate` → `seed` → `build` → `start`), serves the app and passes its health check.
- **Serves:** S3.a, S5.1, D-020.

## D-057: Phase 8 video is built programmatically (owner directive)
- **Timing:** deferred until after the feature freeze, but planned now so nothing needs rework.
- **Production:** Remotion (or a similar code-driven tool) composes **real Playwright screen captures of the deployed app** with motion graphics, captions and transitions. Every product beat is real footage, never a mockup (S6.2, S3.x). Motion graphics are used only for the intro, the problem framing, transitions and the stack recap.
- **Length:** under 3:00, target **2:45** (S6.1).
- **Voice:** to be decided later (the owner's voice-over or a free open-source TTS). Timing is designed so either fits: a fixed beat sheet with caption timings.
- **Music:** CC0 or self-generated only. **Logos:** none from third parties except PayPal (the host) and the sponsor tools actually used. This amends D-015, which allowed no logos at all; the owner accepts it for the host and sponsors (S6.4 risk noted: use official marks unaltered).
- **Now:**
  - Keep `DEMO-SCRIPT.md` current per phase.
  - Keep key screens capture-friendly: stable data (demo freeze and reset, D-054), deterministic replay mode (D-055), 1920×1080 16:9 layouts including a split screen.
  - The Phase 8 plan is in PLAN.md: capture script, Remotion project structure, caption file, render command.
- **Tooling note:** Remotion is free for individuals and small teams (check its licence at the time). It is added in Phase 8 only, as a dev-time tool in its own folder, not shipped with the app.
- **Serves:** S6, P6, J5, G15.

## D-058: Phase 8 production details (implements D-057)
- **Beat sheet:** 11 beats, 2:45 total (`DEMO-SCRIPT.md` v1, mirrored in PLAN §4). It replaces the v0 2:50 draft, which named Claude as the vision model; the build uses Gemini for vision and Groq for agents (D-038).
- **`video/` sits outside the pnpm workspace** (installed with `pnpm install --ignore-workspace`), so judges' `pnpm install` at the root never pulls Remotion or its ffmpeg binary. This keeps D-056's fresh-clone path lean.
- **Capture uses CDP `Page.startScreencast` frames, not Playwright `recordVideo`:** the latter's fixed low bitrate blurs 1080p text. Frames are timestamped and assembled to constant 30 fps with Remotion's bundled ffmpeg, so no new install.
- **Re-timing is automatic:** the capture script writes a sidecar of key-moment offsets per clip; `beats.ts` sets in-points and zooms from it.
- **A $95 order is made off camera before the refund beat,** so the queue shows a real over-threshold request (no staged data).
- **`/capture?left=…&right=…` (Phase 7):** two real routes in same-origin iframes, 960 px each at 1920×1080, with a small "Buyer"/"Seller" label per pane. It reuses the real pages instead of a video-only layout, so what the video shows is what judges can open. Only an allowlist can be framed (`/shop`, `/live`, `/studio`, `/studio/orders`, `/studio/dashboard`, `/s/juniper_clay`). `/pay` is excluded because its URL carries the order token. The page is `noindex`. On phones the panes stack.
- **`/live?from=now`:** the live wire starts empty and streams only events after page load (SSE `after` = the latest id), so each take shows only its own calls. `/capture` frames `/live` this way. The default `/live` is unchanged.
- **`screens --video`** adds a 1920×1080 viewport to the phase screenshot script.
- **Serves:** S6, J5, D-056, D-057.

---

## Requirement updates
*(When the organisers change a rule, quote it here with date and source. REQUIREMENTS.md stays frozen.)*

- **2026-10-15, AG Grid sponsor resources page (Devpost):** "Best Use of AG Grid… covers both what your dashboard looks like and how you build it. Show us polish: custom widgets, theming, and layout tools, not just AG Grid or AG Charts on their own. Take Studio Agent Framework for a spin: a custom agent talking to Studio's built-in agents, or a swapped-in harness." Free 45-day trial license; boilerplate with AG Studio + PayPal provided; support via PayPal Discord. Docs: ag-grid.com/studio/react/quick-start/, /custom-widgets/, /ai-agents/. → D-023.
- **2026-10-16, Official Rules (owner):** the owner read the Official Rules and confirmed that entrants from **India are eligible** (R6, D4). No other rule changes affect the build.
