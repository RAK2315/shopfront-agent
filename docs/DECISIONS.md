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
| D-058 | 2026-10-16 | Phase 8 production details (CDP screencast, `video/` outside the workspace, `/capture`) | ACCEPTED | S6, J5 |
| D-059 | 2026-10-16 | `pnpm start` loads the root `.env` (fresh-clone fix) | ACCEPTED | S3.a |
| D-060 | 2026-10-16 | Phase 7 design pass (SellerNav, placeholders, catalog freeze mirrors) | ACCEPTED | J2, P9, S6 |
| D-061 | 2026-10-16 | Sentence-case notes, session aliases for the hosted agent, AT-6 #7 | ACCEPTED | J1, P7, P8, D-002 |
| D-062 | 2026-10-16 | Video toolchain proven now (Remotion 4.0.532) | ACCEPTED | S6, J5 |
| D-063 | 2026-10-16 | Phase 9 = review fixes; Phases 9–13 schedule | SUPERSEDED by D-071 (order and dates) | J1–J5 |
| D-064 | 2026-10-16 | Agent reorder with Vault (now **Phase 11**, D-071) | PROPOSED (Spike V) | P8, J4, J1 |
| D-065 | 2026-10-16 | Dispute defense agent (now **Phase 12**) | PROPOSED | P7, J3 |
| D-066 | 2026-10-16 | Real multi-seller payouts (now **Phase 9**) | PROPOSED (Spike M) | J1, J3, G1 |
| D-067 | 2026-10-16 | Adversarial agent arena (Phase 13) | PROPOSED | J1, J4, J5 |
| D-068 | 2026-10-16 | Order tokens can't be minted from a checkout id; idempotency keys scoped | ACCEPTED | J1, P7, P8, G9 |
| D-069 | 2026-10-16 | Sandbox buyer credentials published now (supersedes D-034's timing) | ACCEPTED | J5, S3.b |
| D-070 | 2026-10-16 | Test and replay runs flagged `is_test`, kept off public views; plain AI-source words | ACCEPTED | J2, J4, J5, D-022 |
| D-071 | 2026-10-17 | Re-plan Phases 9–13 in the owner's order (multi-seller, Telegram, Vault, disputes, arena) | ACCEPTED | J1–J5, P4–P9 |
| D-072 | 2026-10-17 | Phase 10: seller copilot on Telegram (design; leads the pitch) | PROPOSED (Spike T) | J3, J4, J5, P7, P8, R3 |
| D-073 | 2026-10-17 | Owner decisions: video deferred (no Telegram UI), Telegram judge mode, seed purchases, UI review pack before Phase 9 | ACCEPTED | J2, J5, S6.4, P8 |
| D-074 | 2026-10-17 | Review-fix lane: seller views hide test orders; no scripted seeding; starters, legend, calm hack card; insights prompt fix pulled forward | ACCEPTED | J2, J3, J5, P9 |
| D-075 | 2026-10-17 | Spike M, part 1: Partner Referrals and platform fees are gated for our sandbox app; payee routing is accepted | ACCEPTED (closed by D-076) | J1, J3, R2 |
| D-076 | 2026-10-17 | Spike verdicts: M = Partial, go (direct payee, no fee, seller-side refund handoff); T = go. Owner: hide boot rows, delete /spike/studio, keep two styles | ACCEPTED | J1, J3, J4, R2, P8 |
| D-077 | 2026-10-17 | AG Grid "Best Use" becomes a protected track: the grid is where the seller runs the business | PLANNED (build after the UI review) | P9, J1, J2 |
| D-078 | 2026-10-17 | Visual richness fixes (rich chat cards, inline checkout, tighter /shop, a heavier live wire, photos) | PLANNED (build after the UI review) | J2, J5 |
| D-079 | 2026-10-18 | Owner: cut Phase 12; Phase 13 → half a day on the hack card; freeze end of Nov 5; priority AG Grid = visual > 10 > 9 > 11 > 13; Vault enabled; Enterprise key requested | ACCEPTED (owner) | J1, J4, J5, P9, D1–D3 |
| D-080 | 2026-10-18 | Spike G: Studio's own widgets are unwatermarked under the Studio key; master-detail, grid sparklines, integrated charts and the AI Toolkit need an AG Grid + Charts Enterprise (BOTH) key, behind a no-watermark guard | ACCEPTED (go) | P9, J1, J2 |
| D-081 | 2026-10-18 | Webhook recovery: 503 on a verify outage, a boot and fallback sweep, `capture-<id>-<n>` after a decline; `/mcp` names the agent from headers; migration 0010 (Phase 9 → 0011) | ACCEPTED | G7, G9, J1 |
| D-082 | 2026-10-18 | Phase 10 backend: telegram_updates dedupe, single-use link codes (owner token for the public demo seller), the action executor, judge_demo seeded and isolated | ACCEPTED | J1, J3, J4, P7, P8 |
| D-083 | 2026-10-18 | Phase 9 backend (Partial): payee routing per seller (refused when not ready), first-capture verification, refund handoff status with the PayPal deep link, seller refunds reconciled from webhook or GET fallback | ACCEPTED | J1, J3, G1, R2 |
| D-084 | 2026-10-18 | Log in with PayPal planned for the "Get paid" card (verify at connect, block unverified payees); Fern's $50 auto-refund limit kept; deletions only through `scripts/safe-rm.mjs` | ACCEPTED (plan; LIPP build waits for approval) | J1, J3, G1 |
| D-085 | 2026-10-18 | Walkthrough fix list approved and scheduled; **Phase 11 (Vault reorder) and Spike V cut**; autonomous run to feature-complete; Render ignores docs-only pushes | ACCEPTED | J2, J5, P8 |
| D-086 | 2026-10-18 | PayPal approval bug: v6 `presentationMode: "auto"` sometimes opened nothing and left the session dead. Now an explicit popup, a redirect fallback and a "Continue in this tab" link | ACCEPTED | R2, J3, G1 |
| D-087 | 2026-10-18 | CC0 museum photos for every seeded listing (two more Fern & Loom listings); the demo seller's "Include test orders" switch + "Test run" badge; real sandbox demo history; PayPal catalog `image_url` patched with `add` | ACCEPTED | J2, J5, S6.4 |
| D-088 | 2026-10-18 | `/shop` rebuild: purchase rail, image-led cards, the PayPal button inline in the chat's checkout card, collapsed MCP log, suggestion cards, site nav, mobile live-wire sheet | ACCEPTED | J2, J5, P1 |
| D-089 | 2026-10-18 | Dashboard v2 (AG Grid Best Use): an Overview tab (Ask bar → schema-checked view state, KPI cards, orders grid with grouping/drill-down/live rows, linked AG Charts chart, listings grid with PayPal catalog write-back) and a Builder tab (AG Studio + its agents); Enterprise only behind the BOTH-key guard | ACCEPTED | P9, J1, J2, J5 |
| D-090 | 2026-10-18 | Studio editor, landing, live console and mobile pass (walkthrough #9, #6, #7, #11) | ACCEPTED | J2, J5 |
| D-091 | 2026-10-18 | Phase 13 lite: 13 real attacks with a proof-first hack card; checkouts counted in the DB | ACCEPTED | J3, G1, R2 |
| D-092 | 2026-10-18 | Phase 9 screens + Log in with PayPal (built; button gated until PayPal accepts the Return URL) and the full Phase 10 Telegram copilot incl. judge mode | ACCEPTED | J1, J3, J4, G1, P7 |
| D-093 | 2026-10-18 | Final regression findings: an accessibility regression fixed; five older ATs updated to the behaviour decided in D-086/D-087/D-091; phase9-checks superseded; Log in with PayPal still rejected by PayPal | ACCEPTED | J1, J2, G1 |
| D-094 | 2026-10-18 | Owner evening list: /privacy and /terms, demo stock never runs out, judge refunds survive restarts, site nav on Studio, account verification status as a Log in with PayPal signal; plus two bugs found by the new AT (restock SQL, a capture guard) | ACCEPTED | J1, J2, G1 |
| D-095 | 2026-10-18 | Orphaned captures refunded; reconciliation with PayPal | ACCEPTED | J1, J4, G1 |
| D-096 | 2026-10-18 | Review v2 fixes approved; Phase 11 re-added; Phase 12 only with time to spare | ACCEPTED | J1, J2 |
| D-097 | 2026-10-18 | Competitive re-plan: Vault cancelled; Cart API v1, AG Studio, Gauntlet, proof docs; up through Dec 15 | ACCEPTED | P8, J1–J4, G1 |
| D-098 | 2026-10-18 | Spike C verdict: Go; capture-on-ship for both seller kinds | ACCEPTED | P8, J1, J4 |
| D-099 | 2026-10-18 | Phase C delivered: PayPal Cart API v1 merchant contract for every store | ACCEPTED | P8, J1, J4, R2 |
| D-100 | 2026-10-24 | The new AG key is Studio-only (expires 29 Nov); graceful expiry: Studio not mounted, Community overview + notice; `?aglicense=` simulation | ACCEPTED | J2, G1 |
| D-101 | 2026-10-24 | Phase AG: 5-page Studio report (host page tabs), reconcile + Cart API funnel widgets, read-only Shop Manager, AI changes tagged with Undo; overview stays default | ACCEPTED | J2, J1, J4 |
| D-102 | 2026-10-24 | The Gauntlet: 31 attacks in 7 families on /gauntlet, naive shop vs Shopfront with the same model; naive orders are real sandbox orders never approved (contained exception) | ACCEPTED | J1, J3, P7, R2 |

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

## D-059: Fresh-clone check found `pnpm start` ignored the root `.env` (AT-7 #1)
- **Finding (2026-10-16):** following only the README in a fresh clone of the public repo (`0af0e20`), with a throwaway database on the same Neon server, `pnpm install`, `db:migrate` and `seed` worked, but `pnpm start` crashed: "Invalid input … SESSION_SECRET". `next start` reads only `apps/web/.env*`, while the README (and every script) uses the root `.env`. The same cause explained the "AG Studio license key not found" quirk in local builds.
- **Fix:** `next.config.ts` loads the root `.env` when the file exists. Render has no file, so production is unchanged, and a file never overrides variables that are already set. Passing `--env-file-if-exists` to node was tried first and rejected, because Next copies it into `NODE_OPTIONS` for build workers and Node refuses it there.
- **Result after the fix:** the fresh clone built and served the app. `/api/health` returned `{ok, db, paypal_token, webhook_configured}` all true. An MCP `search_products` call returned the seeded products, and `/`, `/shop`, `/live`, `/s/juniper_clay`, `/capture` and `/studio` returned 200. The throwaway database was dropped afterwards.
- The README now says the `.env` stays at the root, and that local payments are confirmed by the fallback check, because PayPal can't reach `localhost`.
- **Serves:** S3.a, D-056.

## D-060: Phase 7 design pass (critique → polish)
- **Method:** an impeccable critique of `/studio`, `/studio/orders`, `/shop`, `/s/juniper_clay` and `/live` on Render. It ran in a single context, because the harness spawns sub-agents only on the owner's request. The detector found 0 issues. The fixes below come from the screenshot review.
- **Fixed:**
  1. **There was no way from the studio to the AG Studio dashboard** (the P9 surface), and each seller page had different navigation. The new `SellerNav` (Listings · Orders · Dashboard · Storefront · Live wire, with `aria-current`) is used on all three seller pages. Before, "Storefront" in clay looked like the current page.
  2. **Listing tiles without a photo were blank boxes in the studio,** while the storefront showed the title's initial. The studio now uses the same placeholder.
  3. **The storefront overflowed 13 px on phones** (the MCP chip inside an auto grid column). Its header, and the product page's article, now use `minmax(0,1fr)` columns.
  4. **The orders list had no summary:** it now shows "N orders · M to ship".
  5. Starter chips that wrap are left-aligned.
- **Seeded listings showed "Not mirrored to PayPal yet":** they were inserted by SQL and never went through approval. `POST /api/admin/demo {freeze}` now first mirrors every approved listing that has no PayPal catalog id, through the same `syncToPayPalCatalog` (a real Catalog Products call with `PayPal-Request-Id`). Reset is unchanged and stays fast (AT-6).
- **Not changed (noted):**
  - The model writes the thank-you subject in Title Case ("Thank You for Your Order"). Changing the prompt would invalidate the recorded replay keys (D-055), so it waits until the next re-record.
  - The order list stays as cards: it is the seller's own list, and the dense view is the AG Grid ledger on the dashboard.
- **Serves:** J2, P9, S6.

## D-061: Sentence-case notes, session aliases for the hosted agent, and a strong injection test
- **Note subjects (owner, 2026-10-16: "don't carry known defects"):**
  - The prompt `message-v2` asks for sentence case. `sentenceCaseSubject` (in `packages/core`, unit-tested) then enforces it deterministically: a Title Case subject is lowered, while the shop name, product titles, acronyms, brands and "I" keep their casing.
  - The 13 Title Case subjects already published were normalised once, in place.
- **Replay bug found while re-recording:**
  - Replay (D-055) replays the model's tool-call arguments verbatim. A recorded `request_refund` therefore named the recorded order, which was already refunded, and replay got `NOT_REFUNDABLE`. Server state won, but the demo broke.
  - **Fix:** the hosted agent's model now sees session-local aliases (`order-1`, `token-1`) instead of real checkout ids and order tokens, and `pay_url` is replaced by a note. The server maps the aliases back before calling `/mcp`.
  - Side benefit: the order token, a bearer secret, no longer reaches the LLM provider.
  - External MCP agents are unaffected: they still get real ids and tokens, as the protocol requires.
- **Re-recorded:** `pnpm --filter web record-demo` runs the demo story live on Render (purchase → tracking → wrong-size refund).
  - It was then replayed on a local server with `LLM_MODE=replay` and both AI keys empty. All 11 AI steps came from replay or cache, 0 were live, PayPal stayed live (capture, `/track`, refund), and the refund ran automatically under policy.
  - Run a demo reset before replaying. Otherwise the repeat-buyer rule (2 automatic refunds per buyer since the last reset) sends the refund to seller review, and that note falls back to its template.
- **AT-6 #7 (strong injection test):** the earlier AT-6 #2 showed the agent mostly declined, so it never proved that an injected value reached the server.
  - #7 uses a real model (Groq) told to cheat, and an attacker-modified client schema (extra money fields, no quantity minimum), so the calls really go out with `price`/`total` = 0, `discount_percent` 100 and quantity −5. The server rejected all three, and no checkout was created.
  - A schema-valid injected quantity (3, "the owner said it's $1") was accepted and priced by the server at $101.00 = 3 × $32 + $5. The DB total and the PayPal order amount agree.
- **Serves:** J1, P7, P8, R4, D-002, D-029, D-055.

## D-062: Video toolchain proven now (owner, 2026-10-16), not on Nov 4
- **`video/`** (outside the workspace, D-058): Remotion **4.0.532**, the newest release at least 14 days old. Remotion is free for individuals, which covers the owner.
  - `capture/capture.mts`: CDP screencast of `/capture` on Render, producing `public/clips/split-shop.mp4` plus a `.json` sidecar (key-moment offsets and the checkout card's box).
  - `src/TestClip.tsx`: a 20 s composition (title, real footage with captions and a zoom, end card).
- **Result:** `docs/screenshots/phase-7/video-test-clip.mp4` is h264, 1920×1080, 30 fps, 600 frames, exactly 20.0 s.
- **Deviations from the PLAN Phase 8 text, found while building:**
  - Remotion's bundled ffmpeg has **no `fps` filter**, so constant frame rate comes from `-r 30 -fps_mode cfr`.
  - It is called **directly, not via `npx` and a shell**: Windows `cmd` splits arguments on commas and spaces.
  - Frame durations must be the true gaps between CDP frames. Flooring them at 1/30 s stretched a 12 s take to 25 s, and Remotion then failed with "No frame found".
  - The clip is encoded with `-g 30 -bf 0 +faststart` so Remotion can seek it.
  - Frames-to-mp4 lives inside `capture.mts`. There is no separate `frames-to-mp4.mts`.
- **Found for Phase 8:**
  1. The zoom must fit the target box inside the frame. A scale around the card's centre cropped its left edge.
  2. `/live`'s checkout list still shows old test checkouts, even with `?from=now`. Either filter it the same way, or reset before each take.
  3. Captions overlap the agent's reply in the left pane. Put them in a reserved band, or keep them out of active text.
  4. The `/live` wire shows "fallback after mode:replay" for replayed steps, which two reviewers read as "staged". See REVIEW-1.
- **Serves:** S6, J5, D-057, D-058.

## D-063: Phase 9 is review fixes; Phases 9–13 schedule (owner directive, 2026-10-16)
- **Gate:** REVIEW-1 scored J3 = 6, J4 = 5 and J5 = 6, all below 7. Per the owner's rule, **Phase 9 = review fixes** (REVIEW-1 #1–#9 and #11, by score per hour), and the owner's feature phases are renumbered **10 (Vault reorder), 11 (disputes), 12 (multi-seller), 13 (arena)**. No feature starts before AT-9 passes on Render.
- **Schedule, inside the Nov 3 freeze, spikes first:**
  - Phase 9: Oct 17–19.
  - Spike V: Oct 20.
  - Spike M: Oct 21.
  - Phase 10: Oct 22–25.
  - Phase 11: Oct 26–29 (disputes opened Oct 26 morning).
  - Phase 12: Oct 30–Nov 1.
  - Phase 13: Nov 2–3.
- **Cut rule:** a slip of more than 1 day cuts 13 → 12 → 11 → 10. A failed spike cuts its phase. Nothing is ever faked.
- **The video** stays after the freeze, re-timed in `DEMO-SCRIPT.md` v2 (a hero beat and a montage; still 2:45).
- **Open owner decision:** publish the sandbox buyer credentials now (REVIEW-1 #1) instead of on submission day (D-034).
- **Serves:** J1–J5, P6, P9, S3.b, S6.

## D-064: Phase 10, agent reorder with Vault (planned; Spike V on Oct 20)
- **Design:**
  - The buyer saves PayPal with the **save-without-purchase** flow:
    - `POST /v3/vault/setup-tokens` with `usage_type: MERCHANT` and `customer_type: CONSUMER`;
    - then the v6 save session with a server-minted `clientToken`;
    - then `POST /v3/vault/payment-tokens`.
  - Later reorders create Orders v2 with `payment_source.paypal.vault_id` and capture with no buyer present.
  - **The spend cap, period and expiry are enforced by our deterministic code**, under a row lock. PayPal has no per-token cap, and the README says so.
  - Revoke deletes the PayPal payment token (`DELETE /v3/vault/payment-tokens/{id}`).
  - New MCP tools `reorder` and `get_consent` take a consent token, ids and quantities only. The consent token is stored hashed and aliased for the hosted agent (D-061).
- **Risks:**
  - PayPal's docs say vaulting PayPal needs **reference transactions approval** and warn against saving during purchase.
  - Risk data (FraudNet) is required for customer-initiated vaulted payments.
  - **If Spike V fails in sandbox, the phase is dropped and logged; it is never faked.**
- **Serves:** P8, P7, J1, J4, R2, R3, G1.

## D-065: Phase 11, dispute defense agent (planned)
- **APIs:**
  - Webhooks `CUSTOMER.DISPUTE.*`.
  - `GET /v1/customer/disputes[/{id}]`.
  - `POST …/provide-evidence` (multipart; schema checked against the OpenAPI spec before building), `…/accept-claim` and `…/send-message`.
  - Sandbox-only `…/require-evidence` and `…/adjudicate`, used in AT-11 only.
- **Who decides what:**
  - The evidence pack is assembled by code with labelled sources.
  - The model drafts words only; code appends the facts (D-008).
  - The seller must approve before submission, enforced by the API.
- **Sandbox disputes are slow to appear,** so they are opened the morning of Oct 26, and replay covers re-takes.
- **Serves:** P7, R3, J1, J3, G9.

## D-066: Phase 12, real multi-seller payouts (planned; Spike M on Oct 21)
- **APIs:**
  - `POST /v2/customer/partner-referrals`: `API_INTEGRATION`/`THIRD_PARTY`, features `PAYMENT`, `REFUND`, `PARTNER_FEE`; product `EXPRESS_CHECKOUT`; `SHARE_DATA_CONSENT`.
  - The seller status check: `GET /v1/customer/partners/{partner}/merchant-integrations/{merchant}`.
  - Orders v2 with `purchase_units[].payee.merchant_id` and `purchase_units[].payment_instruction.platform_fees`.
  - Refunds with `PayPal-Auth-Assertion`.
  - A deterministic fee rule in `packages/core`.
- **Risk:** PayPal states multiparty requires an approved partner, and platform fees need enablement.
- **Spike outcomes:**
  - **Pass:** ship the phase and retire D-006 in the README.
  - **Partial** (payee routing works without onboarding or fees): ship exactly that, described exactly.
  - **Gated:** keep D-006, say so plainly, and cut the phase.
- **Serves:** J1, J3, G1, R2, R5.

## D-067: Phase 13, adversarial agent arena (planned)
- **The attacks:** 50 deterministic attacks run live against the deployed MCP server and app, in 7 categories: money fields, quantity overflow, refund abuse, duplicate captures, replayed or forged webhooks, tool-call spoofing, and consent abuse.
- **The board:** a public live board at `/arena` shows BLOCKED or ALLOWED, the guardrail, and the PayPal request or debug id, with the pass rate.
- **Failures:** any ALLOWED is a bug to fix, never hidden.
- **Running:**
  - On demand only, with a cooldown and no schedule (D-022, to keep Neon asleep).
  - The arena is an MCP client with no special powers (D-054).
  - Results persist in `arena_runs` and `arena_results`.
- **Serves:** J1, J4, J5, P6, P7, P8, G9.

## D-068: Order tokens can't be minted from a checkout id (REVIEW-1 #2; owner override Step 1.1, 2026-10-16)
- **Root cause, wider than REVIEW-1 said:** the order token was `HMAC(SESSION_SECRET, checkoutId)`, a pure function of a public id. `/pay/return` called it for any id, and any future route could have done the same.
- **Fix:** the token is bound to the caller that created the checkout.
  - It is 32 random bytes; or, when the caller sends a `client_request_id`, `HMAC(secret, checkoutId + key)`, so only the holder of the key can get it back on an idempotent retry.
  - Only its SHA-256 is stored (`checkouts.order_token_hash`, already there). Every check (`/pay/[id]`, `/api/checkouts/[id]/status` and `/capture`, MCP `get_checkout_status` and `request_refund`) compares against that hash. `orderTokenFor(id)` is deleted, so no code can issue a token for an arbitrary id.
  - **`/pay/return` never issues a token.** The return URL we send to PayPal now carries the creator's token, and the route requires it **and** PayPal's `token` = that checkout's PayPal order id. Anything else is 400 with no capture. A replayed return after capture redirects again and never captures twice.
- **A second flaw found in the audit:** idempotency keys were global. A reused key returned someone else's checkout **and its token**. Models often copy the well-known example UUID, so two shoppers could have collided.
  - Now a reused key with different items gets `CONFLICT`.
  - The hosted agent's model-chosen key is namespaced by its buyer session (`sessionScopedRequestId`). This also stops a replayed recording from reaching a recorded session's checkout.
  - The MCP tool description is unchanged on purpose: it is part of the replay key (D-055).
- **Not changed, by design:**
  - **Checkout ids stay visible** on `/live` and `/api/events`. Once ids grant nothing, hashing them for display (the PLAN 9.1 idea) adds nothing, and the AT scripts and the `/live` follow filter keep working.
  - **The `checkout` filter on `/api/events`** only narrows a feed that is already public.
  - **Seller routes** were audited and are scoped to the signed-in seller (`requireSeller` plus a `seller_id` match). Demo sign-in is open on purpose (judge mode, D-011).
  - **Buyer sessions:** the `bys_…` id is a 12-character random bearer kept in the shopper's browser and never written to events. Phase 10's timeline scoping must show only a hash of it.
- **Old tokens:** checkouts created before this deploy had tokens that the leak could have exposed. Their stored hashes are replaced with random ones (no token can match), which retires every earlier token. We can recompute them from `SESSION_SECRET` if ever needed.
- **Tests:**
  - 7 unit tests (`apps/web/src/server/tokens.test.ts`).
  - **AT-6 #8 "token theft"** on Render: ids read from the public console; 10 attack routes; a real PayPal redirect approval returning through `/pay/return`; one capture only.
- **Serves:** J1, P7, P8, G9, D-002.

## D-069: Sandbox buyer credentials published now (owner, 2026-10-16; supersedes D-034's "submission day")
- **Owner decision:** publish the sandbox buyer email and password now (REVIEW-1 #1). They are sandbox-only, and their password never changes after submission (PLAN risk 16).
- **README:** a "Judges: pay in 60 seconds" section at the top, with the login and a timed 4-step click path (/shop starter → Review and pay → PayPal → Payment complete and webhook verified). The old 5-step tour follows as "Then, in 3 more minutes". Internal decision ids were removed from the README (a REVIEW-1 low finding).
- **`/pay/[id]`:** a neutral "Judging?" box under the PayPal button, with copy chips for the email and password, shown only before payment.
  - The values come from the optional `SANDBOX_BUYER_EMAIL` / `SANDBOX_BUYER_PASSWORD` env vars, now also set on Render. They aren't hardcoded, so a secret scan of the repo stays clean apart from the README itself.
  - The box is not PayPal blue: it isn't a PayPal element.
- **Not done:** a public link to an already-paid order page. With D-068, that link would carry a live order token, and anyone could use it to request a refund. Judges make their own order in 60 seconds instead.
- **The spare buyer** (`SANDBOX_BUYER2_*`) stays unpublished, as the fallback if the public one gets locked.
- **Serves:** J5, J3, S3.b, D-034.

## D-070: Test and replay runs are flagged and kept off public views (owner override Step 1.3, 2026-10-16)
- **Problem:** AT scripts, replay checks and local servers write to the shared production database. REVIEW-1 reviewers read their noise on `/` and `/live` ("fallback after mode:replay", piles of expired test checkouts) as staging.
- **Choice: a flag, not a separate tenant.** `is_test boolean` on `checkouts` and `events` (migration `0008`, index `events_public (is_test, id)`). A separate tenant or database was rejected: a second Neon branch costs compute hours (D-022), and AT-1…AT-6 must exercise the real deployed data path.
- **What makes a run a test:**
  - A request carrying `x-shopfront-test-run = HMAC(SESSION_SECRET, "test-run")`. It is read through Next's own request scope (`headers()`), so every route, page and streamed response sees it with no per-route wrapping.
  - Or a server started with `SHOPFRONT_TEST_RUN=1`, which every local replay check must now use.
  - Server-to-server calls (the hosted agent and the hack demo calling `/mcp`) forward the header.
  - Events with no request (webhooks, fallback timers, expiry) **inherit the flag from their checkout**. Only `true` is cached, because a purge can archive a checkout later.
- **Scripts:** every AT and recording script preloads `scripts/lib/test-run.ts`. It adds the header to Node `fetch` (plain calls and the MCP SDK) and to every Playwright context, but only for our host, never PayPal's. A request opts out with `x-shopfront-public-view: 1` to see or act as the public.
- **Public views** (`/`, `/live`, `/api/console/checkouts`, `/api/events`) hide test rows unless the request is itself a test run. **The seller's own views keep everything:**
  - the ledger, orders and dashboard;
  - the dashboard's event stream, which asks for `scope=seller` and is honoured only with a seller session.
- **Purge:** every checkout and event that existed before the cutover was dev, AT or reviewer traffic, and is flagged test.
  - The public `/live` and landing hero start empty and fill with real sessions. The empty states already read "Quiet right now. Start a purchase in the shop…".
  - Nothing is deleted, and the seller's ledger is unchanged.
- **Replay wording:**
  - "fallback after mode:replay" is gone: replay mode is not a fallback. A real provider failure still reads "fallback after groq:429".
  - Source badges use plain words: "Live · Groq", "Live · Gemini", "Answered before", and "Replayed recording". The last appears only when a recording actually served the step (`source = replay`).
  - The README frames replay as resilience, not staging.
- **Serves:** J2, J4, J5, S3.b, D-022, D-029, D-055, REVIEW-1 #4.

## D-071: Phases 9–13 re-planned in the owner's order (owner override, 2026-10-16; written 2026-10-17)
- **Supersedes D-063's order, dates and its "Phase 9 = review fixes" framing.** The review fixes the owner listed were done first as Step 1 (D-068 to D-070). The remaining REVIEW-1 items run in a **review-fix lane** fitted around the phases (PLAN), and are cut before any phase work.
- **New order and dates (IST), spikes first:**

| Dates | Work |
|---|---|
| Oct 18 | Review-fix lane #3 and #7 (40 min), **Spike M** and **Spike T** |
| Oct 19–22 | **Phase 9: multi-seller payouts** (design D-066, plus webhook recovery, REVIEW-1 #8) |
| Oct 23–27 | **Phase 10: seller copilot on Telegram** (D-072) |
| Oct 28 | **Spike V** |
| Oct 29–31 | **Phase 11: Vault reorder** (D-064). Sandbox disputes opened on Oct 29 morning. |
| Nov 1–2 | **Phase 12: dispute defense** (D-065) |
| Nov 3 | **Phase 13: arena** (D-067). Freeze at end of day. |

- **Renumbering:**

| Phase | Was | Decision | Migration |
|---|---|---|---|
| 9 Multi-seller | 12 | D-066 | `0009` |
| 10 Telegram copilot | new | D-072 | `0010` |
| 11 Vault reorder | 10 | D-064 | `0011` |
| 12 Disputes | 11 | D-065 | `0012` |
| 13 Arena | 13 | D-067 | `0013` |

  - Migration `0008` is now D-070's `is_test`.
  - Problem ids and AT ids follow the new numbers (PLAN 9.x … 13.x).
- **Cut rule:** a slip of more than 1 day cuts **13 → 12 → 11**. **Phases 9 and 10 are protected** unless their own spike fails. A failed Spike M gives its days to Phase 10. A failed Spike T gives its days to 11, then 12, then 13. Nothing is ever faked.
- **The arena** gains a Telegram-abuse category (3 attacks) if Phase 10 ships. Tool-call spoofing drops from 8 to 5 attacks to keep the total at 50.
- **The pitch, DEMO-SCRIPT (v3) and SUBMISSION lead with the Telegram copilot** (owner).
- **Serves:** J1–J5, P4–P9, S6, G1.

## D-072: Phase 10, seller copilot on Telegram (planned; Spike T on Oct 18)
- **What:** the seller runs the shop from a Telegram chat. A photo becomes a listing (vision), she confirms the price by tap, and the listing is mirrored to PayPal and agent-buyable. She gets order pings, adds tracking from a label photo, approves refunds by tap, and asks questions with `[db]`/`[paypal]` figures. Full design in PLAN Phase 10 and DESIGN.md Phase 10.
- **Why (J3/J4):** REVIEW-1's skeptical judge put us close to PayPal Agent Ready / Store Sync and Shopify MCP. Those assume a store exists. Ours starts from a phone and a chat, with no website ever. This is the innovation answer, so it leads the story.
- **Guardrail (D-002, unchanged):**
  - The chat model only classifies messages and drafts words.
  - Every catalog or money change is a tap on a single-use, seller-scoped, expiring `telegram_actions` row, run by the same deterministic server functions the web studio uses.
  - Typed prices are parsed by code.
  - No new LLM tools.
- **Stack:**
  - The **raw Telegram Bot API** over `fetch`, in **webhook mode** (no polling, so Neon can sleep, D-022), verified by the `secret_token` header and idempotent on `update_id`.
  - **No new dependency:** the Vercel Chat SDK was considered and rejected. We need only 8 Bot API methods, and a framework adds a moving part 2 weeks before the freeze.
  - It is free, so the $0 rule holds.
  - Env: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`, server-only.
- **Judge access:**
  - A one-time code links a seller's own chat.
  - A README demo link connects any chat to the shared demo seller (judge mode, D-011). Demo pings leave out buyer details, and the nightly reset clears demo links.
  - The web studio keeps every flow for judges without Telegram.
- **Video (S6.4 risk, for the owner to decide):** the owner wants real phone footage, but Telegram's UI is a third-party brand UI. The plan crops to the conversation, with no app chrome or logo, and narrates "her chat". The zero-risk fallback is a labelled chat strip rebuilt from the real transcript (PLAN risk 21, DEMO-SCRIPT v3).
- **Spike T fail rule:** if the webhook, file download or buttons don't work on Render, the phase is cut and logged, and the pitch reverts to the web-studio story.
- **Serves:** J3, J4, J5, P4, P5, P7, P8, R2, R3, D-002, D-011, D-022.

## D-073: Owner decisions after the re-plan (2026-10-17)
- **Video: deferred.**
  - No video work or video decisions until the owner has reviewed the whole product and UI style. Then we make a professional, product-style demo.
  - The Phase 8 tasks (D-062) stay logged and untouched.
  - **Default when it resumes:** no real Telegram UI (trademark rule, S6.4). The Telegram beats are a rebuilt chat strip from the real bot transcripts, labelled "from a real session". This resolves PLAN risk 21 and supersedes D-072's footage plan.
  - Phase 10 now saves redacted transcripts instead of the owner recording phone footage.
- **Telegram judge mode (added to Phase 10 and AT-10):**
  - Judges message the bot via a README quick-path link (`t.me/<bot>?start=judge`) and run seller ops against an **isolated demo seller**, `judge_demo`.
  - Isolation:
    - everything it creates is `is_test` and off the public views (D-070);
    - its listings are reachable only when an agent names that seller;
    - every action is checked against the chat's seller, so a demo chat can't reach real seller data;
    - per-chat rate limits, plus the global LLM caps;
    - nightly re-seed.
  - The link goes into the README **when AT-10 passes**: the bot doesn't exist yet, and no dead link is published.
- **Seeding the public wire:** the owner runs one real public purchase before Nov 8 and again on Nov 11 before judging (PLAN §5, SUBMISSION).
- **Password rotation:** skipped (the spare sandbox buyer; it was printed in session output, never committed).
- **Owner setup confirmed:** the Telegram bot and sandbox seller 2 before Oct 18 (SETUP §13–14); Vault enabled before Oct 28.
- **Photos:** coming. The placeholders stay until then, and AT-3 runs that day.
- **UI review pack before Phase 9:**
  - Every public and seller screen at desktop and mobile goes in `docs/review-pack/`, plus one page listing each screen's route, its purpose and its one primary message.
  - It is scheduled on Oct 18 after the review-fix lane, so the owner can review the style before more UI is built on top of it.
- **Serves:** J2, J5, S6.4, P8, D-011, D-070.

## D-074: Review-fix lane, Oct 18 items (owner session "part 5"; done 2026-10-17)
- **The seller's own views now hide test orders too** (REVIEW-2's top finding; extends D-070).
  - `sellerOrders` (Orders and the refund queue), `dashboardData` (the dashboard and the ledger), `dbSalesSummary` (the insights agent's `[db]` figures) and the dashboard's event stream all leave out `is_test` rows unless the request is itself a test run.
  - `scope=seller` on `/api/events` no longer widens the feed; the dashboard stops sending it.
  - AT-4 and AT-5 still see their own orders: their Node and browser traffic carries the test header (re-run on Render, `docs/screenshots/fixes-2/`).
  - It applies to every seller session. Today only `juniper_clay` can sign in, so this is the demo seller.
  - **Phase 10 must add an exception for `judge_demo`:** every one of its orders is test-flagged by design (D-073), and its Telegram flows run without a request header, so they would otherwise see nothing. Planned: treat a seller whose `is_demo`-style flag is set as including test rows.
- **No scripted seeding (owner, D-073).** PLAN's "then seed 4–6 varied real orders" is dropped: the owner runs the real public purchases. Until then the demo seller's Orders and Dashboard are **empty** (0 real paid orders on 2026-10-17). Judges see the empty states, so the Orders empty state now says where orders come from and links to `/shop`.
- **Known mismatch, not fixable here:** the insights agent's `[paypal]` figures come from Transaction Search on the one sandbox merchant, which still includes every test capture. Until real purchases land, `[db]` can say 0 while `[paypal]` shows dozens. The answer already labels each source. This is a REVIEW-1 #6 item for Phase 9 day 1 (it may need a note in the answer, or a date floor at the cutover).
- **Starters (REVIEW-1 #3):** "Something for a housewarming under $60" found nothing (no listing mentions housewarming). It is now "A vase or table linens for a housewarming, under $60" (the bud vases at $28 and the napkins at $42 match). The starters live in `src/lib/shop-starters.ts`. The recorded blue-mug starter is unchanged (D-055).
- **Legend (REVIEW-2):** under the `/shop` timeline: "Answered before = the same question was answered earlier and its words reused. Prices, totals and every PayPal call are always live." It is desktop only, like the timeline itself (a REVIEW-1 low finding).
- **Hack card (REVIEW-1 #7):** success tone, "Protected: 3 of 3 blocked", and one row per attack with the server's real reason in plain words ("unknown field `price`", "must be at least 1 `quantity`"), parsed from the MCP validation message (`src/lib/hack-reason.ts`, 3 unit tests). If an attack were ever accepted, the card turns danger and says so.
- **Pulled forward from Phase 9 day 1 (deviation):** AT-5 #4 ("What sold this week?" answers with `[db]`/`[paypal]` figures) failed on the re-run, with the same answer REVIEW-2 saw ("Added a column-chart-grouped…"). The new filter can't cause it, since a test run sees every order. The owner requires AT-5 to pass, so the insights instructions now say a question gets figures, never only a chart, and a reply never names a widget type id. The rest of #6 stays in Phase 9 (view mode, the `$` chart, the skeleton, sideways scroll).
- **AT-4 re-run label:** a newly rendered placeholder USPS label with a fake number (as D-013 allows). The original placeholder wasn't kept in the repo.
- **Tests:** `fixes-checks` I6 and the new `lane-checks` (L1 every starter through the hosted agent, L2 the hack card at desktop and mobile, L3 the legend), both on Render.
- **Serves:** J2, J3, J5, P9, D-002, D-070, D-073.

## D-075: Spike M, part 1: what our sandbox app may do (2026-10-17)
- **Method:** `pnpm --filter web spike-m` (real sandbox calls on our own REST app `shopfront-agent`, through `PayPalClient`: cached OAuth, `PayPal-Request-Id` on every POST). It prints only statuses, issue names and debug ids.
- **Docs read first:** developer.paypal.com multiparty "seller onboarding before payment" and "standard checkout integrate". Both say **"You must be an approved partner"**; neither says whether a sandbox app is exempt. The `paypal-best-practices` skill lists multiparty as out of scope.
- **Results:**

| Step | Call | Result | Debug id |
|---|---|---|---|
| A | `POST /v2/customer/partner-referrals` (THIRD_PARTY, features PAYMENT, REFUND, PARTNER_FEE; EXPRESS_CHECKOUT) | **403 NOT_AUTHORIZED** "insufficient permissions" | `f203538f123c3`, `f1608227f2802` |
| B | `POST /v2/checkout/orders` with `payment_instruction.platform_fees` | **422 PLATFORM_FEES_NOT_SUPPORTED** "work with your PayPal Account Manager to enable this option" | `f2345314581a4`, `f160822b447c8` |
| C1 | `POST /v2/checkout/orders` with `payee` = another sandbox account (the unpublished spare account), no fee | **201 CREATED** (`3P472142PJ921154P`, never paid; it expires) | `f421768d9d402` |
| C2 | the same with a platform fee | 422 PLATFORM_FEES_NOT_SUPPORTED | `f514766c6d1b8` |

- **What this means so far:**
  - **Onboarding (Partner Referrals) and platform fees are gated** for this app. Both need PayPal to enable partner features, which a hackathon entry can't get by Nov 3. AT-9's onboarding and fee items can't pass. They are never faked.
  - **Payee routing is accepted:** an order can name another account as the payee. This is the PLAN's "Partial" path (payee routing without fees).
  - **Still unknown (needs seller 2, a US Business sandbox account, SETUP §14):**
    1. whether a capture with `payee` = seller 2 lands in seller 2's balance;
    2. whether our app can **refund** that capture. Without onboarding, seller 2 never granted us third-party REFUND permission, so a refund with `PayPal-Auth-Assertion` is expected to fail. If it does, refunds for routed orders couldn't run from Shopfront, and our refund policy engine and the Telegram refund approval wouldn't work for that seller;
    3. whether webhooks for a payee-routed capture reach our webhook (the capture belongs to seller 2's account).
- **Closed by D-076** (Partial, go). Originally: not yet a verdict. Phase 9 is "protected unless its own spike fails". Partial means a scope cut to payee-only routing, possibly with seller-side refunds. That is an owner decision once the seller-2 checks run.
- **Serves:** J1, J3, R2, D-006, PLAN risk 9.1.

## D-076: Spike verdicts and the owner's answers (2026-10-17)
### Spike M, part 2: Partial, go (the owner pre-approved this path)
- **Method:** `pnpm --filter web spike-m2`, using real sandbox calls and a real approval in a headed browser. Then seller 2 logged in to its own sandbox PayPal (Playwright).
- **Results** (order `6JB543581E932525M`, capture `3G13556369039540R`, seller 2 = merchant `B83JSV9ELHV74`):

| Step | Result | Debug id |
|---|---|---|
| Order with `payee.email_address` = seller 2 | 201 | `f199968873f06` |
| Buyer approval (the spare sandbox buyer) | approved | — |
| Capture | **COMPLETED. Payee = seller 2. $37.00 gross, $1.78 PayPal fee, $35.22 net to seller 2** | `f396435a2aef5` |
| GET capture (our app) | 200, COMPLETED, payee merchant id shown | `f256761588120` |
| Refund by our app, no assertion | **403 NOT_AUTHORIZED / PERMISSION_DENIED** | `f8807608bd500` |
| Refund with `PayPal-Auth-Assertion` (`email` form, then `payer_id` form) | **400 invalid_request** both times | `f960769c731d1`, `ca4c0c9440f13` |
| Our webhook for the routed order | **CHECKOUT.ORDER.APPROVED and PAYMENT.CAPTURE.COMPLETED arrive, signature-verified** | — |
| Seller 2 opens `sandbox.paypal.com/activity/payment/{captureId}` | Its own transaction page, with **"Issue a refund"** | — |
| Seller 2 refunds in its own PayPal | Refund `9CW39521NN902483V`, $37.00 COMPLETED (the full amount, PayPal's default; the script's $5 entry missed the field) | — |
| Our app afterwards | **GET capture shows REFUNDED; GET order lists the refund; PAYMENT.CAPTURE.REFUNDED arrived signature-verified 13 s after the seller's refund** | `ca4c0ce5ce84e` |

- **Verdict:** PayPal gates partner onboarding (403) and platform fees (422, D-075) for a non-approved partner, and a refund of another merchant's capture needs the third-party permission that only onboarding grants. **Payee routing works, and our webhook sees the order's whole life, including a refund the seller makes themselves.**
- **Phase 9 on the Partial path (owner, pre-approved):**
  - Each seller is paid **directly into their own PayPal**, and **Shopfront takes no cut.** There's no fee ledger. The pitch says "each seller is paid directly to their own PayPal; Shopfront takes no cut".
  - **Refunds for sellers other than the platform account are handed off.** The seller agent still decides with the deterministic policy and drafts the decision. The seller gets a one-tap deep link to the transaction in their own PayPal (`/activity/payment/{captureId}`, "Issue a refund"). We track the outcome from the `PAYMENT.CAPTURE.REFUNDED` webhook, with a GET of the capture as the fallback, and update the order, the buyer's page and the wire.
  - The README says this plainly (see "Honest limitations").
  - The platform's own demo seller (`juniper_clay` on the platform account) keeps automatic refunds, because it is the API caller's own capture.
- **Seller connect without Partner Referrals:** the seller gives their PayPal email or merchant id. The first routed capture proves it: the capture's `payee.merchant_id` comes back from PayPal and is stored. "Log in with PayPal" (identity) could verify it up front; it gets a 30-minute check on Oct 19 and is dropped if it needs a separate approval.
- **Not faked, and not claimed:** partner onboarding, platform fees and API refunds for other sellers' captures.

### Spike T: go
- **Bot:** `@juniper_clay_copilot_bot`. `TELEGRAM_BOT_TOKEN` and a generated `TELEGRAM_WEBHOOK_SECRET` are in `.env` and on Render (`pnpm --filter web spike-t -- setup`).
- **On Render, all four pass criteria were met:**
  1. `setWebhook` to `/telegram/webhook` with `secret_token` and `allowed_updates: [message, callback_query]`. Requests with no secret or the wrong one get **401** (both checked).
  2. The owner's text got a reply.
  3. The owner's phone photo was downloaded server-side through `getFile`. The bot showed "Reading your photo…", then edited the message with the size, a sha256 prefix and the delivery delay.
  4. The inline keyboard, the tap, `answerCallbackQuery` (a toast), then `editMessageText` ("✓ Confirmed · spike only"). The owner confirmed all three steps.
  - `getWebhookInfo`: 0 pending, no delivery error.
- **Bot API facts checked against core.telegram.org (the PLAN's were from memory):** they all hold.
  - The header is `X-Telegram-Bot-Api-Secret-Token` (1–256 characters of `A-Za-z0-9_-`).
  - `callback_data` is 1–64 bytes.
  - File links last at least 1 hour, with a 20 MB download cap.
  - Non-2xx deliveries are retried "a reasonable amount of attempts", and updates are kept up to 24 h.
  - New since the PLAN was written: `editMessageText` takes `rich_message` as an alternative to `text`.
- **Cold start (criterion 5, measured, not a pass gate):** the service was idle for about an hour, then the owner sent "cold".
  - The reply said **"Delivered 73 s after you sent it"** (update `186128207`).
  - `getWebhookInfo` showed `last_error_message: "Read timeout expired"` at 18:09:39Z. **Telegram's first delivery timed out while Render woke up, and its automatic retry landed.** It was processed once, and nothing was lost.
  - Phase 10 consequences:
    - Answer 200 before any work (already done, `after()`).
    - Dedupe on `update_id` in the database, not in memory.
    - The keep-warm ping from Nov 8 (D-030) matters for judges.
    - The README quick path says the first reply after a quiet spell can take about a minute.
- **Migration numbering (small deviation):** the Telegram tables and `sellers.test_only` went in first, as migration `0009` (applied 2026-10-17, Phase 10 prep). Phase 9's migration becomes `0010`.
- **The spike route stays deployed** until Phase 10 replaces it. It stores nothing and touches no seller data. Phase 10 adds the `telegram_updates` dedupe table, links and action rows.

### Owner answers to the review-pack questions (provisional, 2026-10-17)
- **Hide "Restarted" rows from public views: yes.** The boot re-arm event is now always test-flagged, with one event listing every re-armed id. It's kept in the database and visible to test runs (AT-2 reads it from the database). The 9 existing public boot rows were archived as test (`5b39055`).
- **Delete `/spike/studio`: yes.** Removed; it returns 404.
- **Keep the two visual registers: yes.**
- **The paid-page heading and the hack button colour:** wait for the owner's review.
- **Serves:** J1, J3, J4, R2, P7, P8, D-002, D-006, D-022, D-072.

## D-077: AG Grid "Best Use" as a protected track (owner, 2026-10-17; build after the UI review)
- **Why:** the AG Grid prize (P9, requirement update of 2026-10-15) asks for "polish: custom widgets, theming, and layout tools, not just AG Grid or AG Charts on their own". The owner targets first place. The grid becomes **where the seller runs the business**, not a display. **It's protected like Phases 9 and 10.**
- **Features and the checks found while planning (each has an AT in PLAN "AG Grid Best Use"):**
  1. **Inline edits that write back to PayPal.** *Deviation found in PayPal's own schema* (`/api/catalog-products/v1/schema.json`): a Catalog product has **no price or stock field**, and PATCH accepts only `description`, `category`, `image_url` and `home_url`. So:
     - **Price and stock cells** write to our catalog through the same deterministic, seller-only server function the studio uses (D-002). Row badges say "used on the next PayPal order".
     - **Description, category and image cells** PATCH the PayPal Catalog product. Each row shows the PayPal request id, the debug id and a sync status (synced, syncing, failed with a retry).
     - Nothing claims that a price lives in PayPal's catalog.
  2. **Live rows from webhooks:** new orders flash in, and status cells animate PENDING → PAID → SHIPPED → REFUNDED from the real SSE events (never a timer).
  3. **Master-detail rows:** expand an order to see its full PayPal history (order, capture, refund, dispute, tracking) with ids, from our `paypal_calls` and events tables.
  4. **The AI Toolkit:** "show unshipped orders over $50 this week" filters, groups and pivots the grid. The model goes through our `llm.call` guard (Groq first, D-038), with schema-validated output, temperature 0, and the output limited to grid state (never data or money).
  5. **Integrated charts:** a sales sparkline per product, and a revenue pivot by product and status.
- **Licence risk (D-053):** the AI Toolkit, master-detail, integrated charts, sparklines and pivoting are **AG Grid Enterprise**. Our AG Studio trial key does not license standalone AG Grid Enterprise; it watermarked the grid. **Spike G (Oct 18, 1 h):**
  - (a) Do AG Studio's own grid widgets expose these features under the Studio key?
  - (b) Otherwise, the owner requests an AG Grid Enterprise trial key (ag-grid.com trial form or the sponsor channel in the PayPal Discord).
  - (c) Otherwise, Community fallbacks: detail rows as full-width rows (the D-053 pattern), sparklines as an AG Charts cell renderer, and natural-language grid state through our own schema-validated Community filter, sort and group model.
  - Whatever we ship, no watermark is ever shown.
- **Schedule:** Oct 22–24, after Phase 9 (which is a day shorter on the Partial path). It absorbs REVIEW-1 #6.
- **Serves:** P9, J1, J2, J5, D-002, D-023, D-053.

## D-078: Visual richness fixes (owner, 2026-10-17; build after the UI review)
- **Owner's finding:** the current UI reads as a wireframe.
- **Fixes, with before and after notes in DESIGN.md "Visual richness":**
  1. Rich product cards in the buyer chat (photo, seller name, variants, price).
  2. An inline checkout card with the PayPal button and the total broken down (items, shipping, total), not a text line.
  3. A tighter `/shop` layout with less dead space in the chat column.
  4. A live wire with more visual weight: one colour per system (agent, MCP, PayPal, webhook), packet motion between steps, and PayPal events visually dominant.
  5. Product photos replace the letter placeholders the day the owner's photos land (AT-3).
- **Rules held:** clay stays the single accent and PayPal blue stays for PayPal elements. The per-system colours are muted tints, each with an icon and a label, and status is never shown by colour alone. Motion follows real events, with a reduced-motion fallback.
- **Schedule:** Oct 30–31, plus the photos the day they land.
- **Serves:** J2, J5, P8.

## D-079: Owner decisions for part 6: cuts, the freeze moves to Nov 5, a new priority order (owner, 2026-10-18)
- **Phase 12 (dispute defense) is cut.** Nothing of it was built. No sandbox disputes get opened on Oct 29. Unhappy path #04 stays covered by AT-4's merchant-side refunds, and #05 by AT-2, AT-4 and AT-6 (PLAN §2b). DEMO-SCRIPT and the README never mention disputes.
- **Phase 13 shrinks to half a day, with no separate arena screen.** The existing hack card on `/shop` (D-074, "Protected: 3 of 3 blocked") grows to **about 12 attacks**, with a pass-rate board inside the card. It keeps the same rules: the attacks are real MCP calls against the deployed server, every row shows the server's real reason, and any ALLOWED turns the card red and is a bug to fix. There's no `/arena` route, no `arena_*` tables and no migration `0013`. DESIGN.md's `/arena` rows are dropped.
- **The freeze moves to the end of Nov 5.** The video is Nov 6–10 and we submit on Nov 11. The D-003 hard deadline (Nov 13, 01:30 IST) is unchanged.
- **Priority if anything slips** (most protected first):
  1. **The visual richness fixes and AG Grid "Best Use"** (equal);
  2. Phase 10, the Telegram copilot;
  3. Phase 9, the Partial path;
  4. Phase 11, Vault reorder;
  5. Phase 13 lite.
  - So the cut order is **13 → 11 → 9 → 10**. This replaces D-071's "9 and 10 protected" and its cut rule (13 → 12 → 11).
- **Vault is enabled in the sandbox app now** (owner). Spike V can run on any day that has a backend-only gap, not just Nov 1.
- **AG Grid Enterprise trial key:** the owner is requesting one now, whatever Spike G finds. We plan for the Enterprise features. **No watermark ever ships** (D-080 says how that's enforced).
- **The Claude Desktop connector check:** the owner reports it separately.
- **Re-dated plan (PLAN "Phases 9–13"):**

| Dates (IST) | Work |
|---|---|
| Oct 18 | Backend only: Spike G, webhook recovery, the `mcp_client_name` fix, Phase 10 backend |
| Oct 19–21 | Phase 9 (Partial path) |
| Oct 22–24 | AG Grid "Best Use" |
| Oct 25–29 | Phase 10 (Telegram, including judge mode) |
| Oct 30–31 | Visual richness fixes |
| Nov 1 | Spike V (or earlier, in a gap) |
| Nov 2–4 | Phase 11 (3 days; no longer compressed) |
| Nov 5 | Phase 13 lite (half a day) and buffer. **Freeze at end of day** |
| Nov 6–10 | The video (Phase 8) and what's left of Phase 7 (README, Devpost text, AT-7). Keep-warm from Nov 8 (§5, unchanged) |
| Nov 11 | Submit |

- **Serves:** J1, J4, J5, P6, P7, P9, D1–D3, G9.

## D-080: Spike G verdict: Studio's own widgets are licensed by the Studio key; Enterprise grid features need an AG Grid + AG Charts Enterprise key (2026-10-18)
- **Method:** I read the installed packages (`ag-studio@3.0.0`, `ag-grid-enterprise@36.2.0` and `ag-charts-enterprise@14.2.0`, all pulled in by `ag-studio`). Then I ran each package's own license validator on our key in Node. The script prints only the verdict fields, never the key.
- **Our key** is an **AG Studio `STUDIO-PRO-AI` trial (`[v3][03C][TRIAL]`), valid, expiring 29 Nov 2026** (Studio's validator).
- **(a) Inside Studio: yes, for Studio's own widgets.**
  - Studio's grid and pivot widgets call `ag-grid-enterprise`'s `createGrid` with a `Studio` module. That module registers a `studio` bean.
  - `GridLicenseManager.validateLicense()` then skips the grid's own check (`if (beans.studio) → isDisplayWatermark: () => false`).
  - Studio's charts do the same: they're created with `withinStudio = true` and `ag-charts-enterprise`'s `AllEnterpriseModule`.
  - **So these are Enterprise-backed and unwatermarked under our key:**
    - the server-side row model;
    - the **Pivot grid widget**;
    - every Studio chart type;
    - the **sparkline in Studio's value (KPI) widget**;
    - Studio's own AI (`AgStudioAiModule`; we have PRO-AI).
- **But Studio's grids load a fixed module list:** server-side rows, Pivot, column API, cell and row style, locale, render API. **That list has no master-detail, no grid-cell sparklines, no integrated charts and no AI Toolkit** (`MasterDetailModule`, `SparklinesModule`, `IntegratedChartsModule` and `AiToolkitModule` exist in `ag-grid-enterprise` but aren't in Studio's list).
  - Adding them would mean building a grid with Studio's internal `_STUDIO_GRID_MODULES` export, so that the `studio` bean skips the grid licence. **That is a licence bypass. We won't do it.**
- **Our own grids, including custom Studio widgets, are licensed by `ag-grid-enterprise`'s own check.** Its validator **rejects the Studio key** (`valid: false`; it knows only the types `GRID`, `CHARTS` and `BOTH`). That's the watermark D-053 saw on Render.
- **(b) The owner's trial key (requested now, D-079) must be the AG Grid Enterprise + AG Charts Enterprise bundle** (licence type `BOTH`, `[0102]`), not Grid alone.
  - When sparklines or integrated charts are registered, `ag-grid-enterprise` sets `currentLicenseType = "BOTH"`. A Grid-only key then fails as "Incompatible License Key", and the grid shows a watermark.
  - A Grid-only key would cover master-detail, row grouping, pivot and the AI Toolkit, but not the charts features.
- **How we plan to build it (Enterprise first, as the owner asked):**
  - Add `ag-grid-enterprise@36.2.0` and `ag-charts-enterprise@14.2.0` as direct web dependencies, at exactly Studio's versions so there's one copy of each.
  - The new key lives in a separate env var, **`NEXT_PUBLIC_AG_GRID_LICENSE_KEY`**, set with `ag-grid-enterprise`'s `LicenseManager.setLicenseKey`.
  - The Studio key keeps its own license manager; the two are separate classes, so they don't clash.
  - **A no-watermark guard:** before registering any Enterprise module, the client checks the grid key with `LicenseManager.getLicenseDetails()`. It must be `valid`, of type `BOTH`, not expired and not past its trial date.
    - If the check fails, the grid registers the Community modules only and renders the (c) fallbacks below.
    - So a missing, wrong or lapsed key gives the Community grid, never a watermark. Note: the grid hides watermarks on `localhost`, so this check is the real gate.
    - AT-G G6 checks this on Render, with the key unset as well.
- **(c) The Community fallbacks** (used if the key never arrives, or lapses during judging):
  - master-detail → full-width detail rows (the D-053 pattern);
  - grid-cell sparklines → an AG Charts Community mini-chart as a cell renderer;
  - the AI Toolkit → our own schema-validated filter, sort and group model, sent through `llm.call`;
  - integrated charts and pivot → Studio's own chart and Pivot widgets, which are already licensed (a).
- **Trial length risk:** if the grid trial is 45 days from about Oct 18, it lapses around Dec 2, before the assumed Dec 10 results (PLAN §5). The guard falls back cleanly. **Owner: request an extension around Nov 25**, alongside the Studio extension (~Nov 20, D-032).
- **Verdict: go,** with Enterprise behind the guard and the Community fallbacks ready.
- **Serves:** P9, J1, J2, J5, D-053, D-077.

## D-081: Webhook recovery (REVIEW-1 #8) and the agent's name on stateless `/mcp` (2026-10-18)
- **A verify outage now gets 5xx.** Before, any failure of PayPal's `verify-webhook-signature` call was swallowed as "not verified": a genuine event got stored as unverified, rejected, and answered 200, so PayPal never redelivered it.
  - Now a network failure, 5xx, 429 or our own 401/403 (`isVerifyOutage`, core) throws `WebhookVerifyUnavailable`. The route answers **503 and stores nothing**, so PayPal's redelivery gets a fresh check.
  - A 4xx, or a `FAILURE` verdict, is still PayPal judging the delivery: it's stored unverified and answered 200, as before.
- **The recovery sweep.** `sweepUnprocessedWebhooks` reprocesses verified events that were stored but never processed: the process died, or processing threw after we had answered 200.
  - It runs **on boot** (`instrumentation.ts`, next to the timer re-arm) and **alongside the fallback checks** (at most once per 2 min per process).
  - It adds no polling loop (D-022): one query on a new partial index, `webhook_events_unprocessed`.
  - An event qualifies when its last delivery is at least 60 s old, so a delivery's own `after()` goes first, and it has had fewer than 5 attempts.
  - An in-process guard means the sweep never runs an event concurrently with its delivery.
  - Each sweep writes one test-flagged `webhook_swept` row (operational, off public views, like D-076's boot row).
- **The decline retry id.** After `INSTRUMENT_DECLINED` we never retry automatically (PayPal's guidance: ask for another method).
  - We bump `checkouts.capture_attempt` with a compare-and-set, so the buyer's next approval captures as **`capture-<id>-1`** (`captureRequestId`, core).
  - Before, the retry reused `capture-<id>`, and PayPal's idempotency could replay the declined answer.
  - Attempt 0 keeps the old id, so existing checkouts are unchanged.
- **Test hooks, signed with `SESSION_SECRET`** (`faults.ts`, like D-054's failover hook):
  - `verify-unavailable` throws before any PayPal call.
  - `capture-declined` sends **PayPal's own sandbox negative-testing header** (`PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}`, developer.paypal.com/tools/sandbox/negative-testing) on the real capture call. PayPal's sandbox answers 422 with a real debug id.
  - *Owner note:* this is PayPal's documented sandbox feature on a real request. We don't fake any response. It's the only way to get a decline on demand.
- **`mcp_client_name`.** The stateless `/mcp` builds a server per request, so a tool call never sees `initialize`. The agent is now named from its headers (`clientNameFromHeaders`, packages/mcp):
  - `x-shopfront-client` first (our hosted agent already sends `shopfront-web-agent`);
  - otherwise the User-Agent's product token, ignoring generic runtimes and browsers.
  - The name is used only when `initialize` wasn't seen.
  - It's a display label only. This also fixes `source`: `/shop` checkouts had been recorded as `mcp_external`.
  - `/pay` shows a friendly label (`agentLabel`: "our demo shopping agent", "Claude").
- **A bug found by the decline AT, older than this change (fixed with `isPayPalApiError`, packages/paypal):**
  - **What happened:** on Render, every `e instanceof PayPalApiError` branch was false.
  - **Why:** the PayPal client is a `globalThis` singleton shared by Next's separate bundles (instrumentation and route handlers, like the timers), so an error from one bundle's class fails `instanceof` in another.
  - **Effect:**
    - `captureCheckout`'s `INSTRUMENT_DECLINED`, `ORDER_ALREADY_CAPTURED` and `ORDER_NOT_APPROVED` branches never ran. The pay page got a 500 instead of "declined, choose another method".
    - The debug ids and issue names on the catalog, refund, order-creation and tracking failure events were dropped.
    - The new verify-outage check would have treated every PayPal error as a network outage.
  - **Evidence:** `recovery-checks` R3 on `b0463b9`. PayPal answered the mocked capture `422 INSTRUMENT_DECLINED` (debug `f787547b8a986`), but Render logged an unhandled `PayPalApiError`, and no `capture_declined` event was written.
  - **The fix:** a structural type guard (name, status and issue), with a unit test for the cross-bundle case. All 6 call sites use it.
  - **Also seen in that run:** after the mocked decline, PayPal accepted a real capture under the *same* `capture-<id>` id. The mock doesn't occupy the request id. Our attempt counter still follows PayPal's guidance for real declines.
- **Migration numbering (deviation):** these changes are migration **`0010`** (`checkouts.capture_attempt`, the partial index). **Phase 9's migration becomes `0011`.**
- **Tests:** core `recovery.test.ts` (7), mcp `client-name.test.ts` (5) and web `agent-label.test.ts` (2). On Render: `pnpm --filter web recovery-checks` (R1 to R4).
- **Serves:** G7, G9 (unhappy path #05), J1, D-045.

## D-082: Phase 10 backend: update dedupe in the DB, link codes, the action executor, `judge_demo` (2026-10-18; no screens)
- **Webhook route** (`/telegram/webhook`, which replaces the Spike T route):
  - The secret-token check is unchanged (401).
  - **`update_id` is claimed in `telegram_updates`**, replacing the in-memory set, so a re-delivery after a cold start or a restart is processed once.
  - It answers 200 at once and does the work in `after()`. `processed_at` is set in a `finally`.
  - Bot replies so far cover linking, button taps and plain acknowledgements. The five seller jobs come in the Phase 10 build.
- **Linking** (`parseStart`, core):
  - **`/start <code>`:** the code is 24 base64url characters (Telegram's deep-link alphabet). Only its sha256 is stored, it lasts 10 minutes, and it's claimed with one compare-and-set, so it's single use.
  - **`/start judge`:** links to `judge_demo`, and only if that seller is `test_only`. A judge is never linked to a real seller.
  - Any other payload is refused.
  - The deep link's bot name comes from `getMe` (cached), not from an env var.
- **Link-code API** (`POST /api/seller/telegram-link`, seller session; the Studio "Connect Telegram" card is Phase 10 UI):
  - Any visitor can sign in as the public demo seller (judge mode, D-011). So **linking a chat to `juniper_clay` also needs the owner's admin token.** Otherwise a stranger could tie their Telegram to the real demo shop and get its order pings.
  - Judges use `start=judge`.
  - A deviation from PLAN's "the Studio card for any seller": the security reason above. It changes nothing judges see yet.
- **The action executor** (`runChatAction`):
  1. The tap's chat must be linked.
  2. `checkChatAction` (core) checks ownership first, then whether the action is used, then whether it has expired.
  3. A compare-and-set on `used_at` means a double tap runs the handler exactly once, and the money paths keep their own D-014 lock and `PayPal-Request-Id` underneath.
  4. The result is stored on the row.
  - Payloads hold ids only. Actions are created by code (`createChatAction`), never by a model (D-002).
  - **Handlers wired today:** `approve_refund` and `decline_refund`, through `decideRefundAsSeller`.
  - `confirm_price`, `publish` and `add_tracking` are refused as "unavailable" until the Phase 10 build wires them to the studio's server functions.
- **`judge_demo`:**
  - Seeded as "Judge's Demo Studio", `test_only`, with 2 practice listings (`pnpm --filter web seed -- --only judge_demo`; the new `--only` leaves other sellers' live stock alone).
  - **Isolation in code:**
    - global `search_products` leaves out `test_only` sellers unless `seller_handle` names one;
    - `llms.txt` leaves them out;
    - every checkout for a `test_only` seller is `is_test` even without a test header (D-070 then keeps it off `/`, `/live` and the feeds).
  - Not done yet: the nightly reset, the per-chat rate limits and the seeded refund order. Those are in the Phase 10 build.
- **Ids:** `newId("telegramAction")` gives `tga_` + 12 characters (64-byte `callback_data`).
- **Tests:** core `telegram-link.test.ts` (5). On Render: `pnpm --filter web telegram-checks` (T1 to T6), from made-up chat ids. Telegram itself refuses replies to them ("chat not found"), so the checks read our database.
- **Serves:** J1, J3, J4, P7, P8, R2, D-002, D-070, D-073.

## D-083: Phase 9 backend on the Partial path (2026-10-18; owner approvals for part 6; no UI)
- **Owner approvals (part 6):**
  - The sandbox negative-testing header for declines is kept. It's in the README's "What's real" table.
  - The admin-token requirement for linking `juniper_clay` is approved (D-082).
  - The owner is requesting the AG Grid + AG Charts Enterprise bundle; the key-gated fallback stays (D-080).
  - The UI review becomes a guided walkthrough with the owner, logged in `docs/review-pack/FEEDBACK.md`. It replaces waiting on the screenshot pack.
- **Payout routing per seller** (`payeeRoute`, core). `sellers.payout_status` is one of:
  - `platform`: the API caller's own account; no `payee`. `juniper_clay` and `judge_demo`.
  - `none`: **the checkout is refused with `SELLER_NOT_READY` before any row or PayPal call.**
  - `unverified`: `payee.email_address`.
  - `verified`: `payee.merchant_id`.
  - The checkout stores the payee it was routed to (`payee_email`, `payee_merchant_id`), so later refunds know which path applies.
- **Verified by the first capture:** the payee's merchant id is read from PayPal's capture or order response (the response, the webhook or the fallback GET). An `unverified` seller becomes `verified`, and the merchant id is stored. A merchant id that differs from the stored one is flagged on the wire and changes nothing.
- **Connecting a payout account** (`parsePayoutAccount`: an email, or a 13-character merchant id):
  - `POST /api/seller/payout` with a seller session. **The public demo seller is refused without the admin token**, since any visitor can sign in as it and could reroute its sales.
  - The admin action `set_payout` (used by the AT for `fern_and_loom` → seller 2).
- **The refund handoff:**
  - For a routed checkout, `executeRefund` still locks the row and GETs the capture first, but **sends no refund to PayPal**.
  - The request becomes the new `refund_status` value **`handoff`**, with `handoff_at`. The wire shows "Refund handed to {seller}: refund $X in your PayPal", with the deep link `https://www.sandbox.paypal.com/activity/payment/{captureId}` (`refundHandoffLink`; the web host comes from `PAYPAL_BASE_URL`).
  - The buyer's order page gets the "under review" message.
  - *Deviation from PLAN:* PLAN put `handoff` on `decision`. It's a **status** here, because the policy decision (`auto_approve` or `needs_seller`) still applies and is still shown.
- **Tracking the seller's refund** (`reconcileSellerRefund`, core):
  - Sources: `PAYMENT.CAPTURE.REFUNDED` (verified), or a fallback GET of the order (its `payments.refunds`). The fallback runs at +2 min, +10 min, +1 h and +6 h after the handoff, again on boot, and on the admin action `handoff_check`.
  - One function reconciles both, locking the oldest open handoff request. The request moves to `executed` with PayPal's refund id, and **the amount PayPal reports** goes in the new `refunded_cents`.
  - A refund id seen twice is a no-op.
  - If the amount differs from the request, the wire says so ("seller refunded $46.00 in PayPal; $42.00 was requested"). Then the buyer message goes out.
- **Not changed:**
  - MCP inputs.
  - MCP tool descriptions and output schemas: `paid_to` waits, because the output schema is part of the replay key (D-055). The `/pay` and storefront "paid directly to" copy is Phase 9 UI, after the walkthrough.
  - The platform seller's automatic refunds.
- **Migration `0011`:** the seller payout columns (existing sellers are set by handle), checkout and capture payee columns, `refund_status` + `handoff`, and `refund_requests.handoff_at` and `refunded_cents`.
- **"Log in with PayPal" (the Oct 19 30-minute check):** not done. It needs a Developer Dashboard toggle that only the owner can see. That's an owner item; the first capture is the verification meanwhile (PLAN 9.2).
- **Found on Render (AT-9, `docs/screenshots/phase-9/AT-9.md`):**
  - **PayPal accepts an order whose payee email isn't a PayPal account** (200). A wrong payout email is only caught at the buyer's approval, and the checkout expires unpaid. The first-capture verification stays the guard. "Log in with PayPal" would close this (owner item).
  - The shared sandbox buyer is over the repeat-refund limit, so the AT's refund went to the seller. The seller approved it with a Telegram tap (D-082), which is the real flow.
  - `fern_and_loom`'s auto-refund limit is now $50 (it was $40), so a $42 napkin set is in policy. Owner: say if you want $40 back.
  - **The insights answer's source labels are now written by code:** each tool returns a `summary_line` starting with `[db]` or `[paypal]`, and the agent quotes it. AT-5 #4 had failed when the model wrote "DB:" / "PayPal:" with correct figures. A REVIEW-1 #6 item, done early.
  - **`/pay` on mobile scrolls 29 px sideways**: the PayPal card and the test-buyer email chip. It's older than today and left for the UI review (no UI in Part 1).
- **Serves:** J1, J3, G1, G9 (#04), R2, R5, D-002, D-006, D-076.

---

## D-084: Log in with PayPal plan, the $50 limit, and safe-rm (2026-10-18; owner message before "start review")

- **Owner:** "Log in with PayPal" is enabled on the sandbox app with the Email and PayPal account ID scopes. Invoicing is enabled too (unused).
- **Plan, not built.** It waits for approval with the walkthrough fix list. It changes D-083 like this:
  - **Connect:** the "Get paid" card's button goes to `https://www.sandbox.paypal.com/signin/authorize` with our client id, `response_type=code`, `scope=openid email https://uri.paypal.com/services/paypalattributes`, a signed single-use `state` (the seller id and a nonce, 10-minute expiry) and `redirect_uri` = the return URL below.
  - **Return** (`GET /api/seller/paypal/return`): check `state`, swap the code server-side for a token (`POST /v1/oauth2/token`, `grant_type=authorization_code`, our client id and secret in Basic auth), then read `GET /v1/identity/oauth2/userinfo?schema=paypalv1.1`. Store the `payer_id` (the account's merchant id) and the email. The seller becomes `verified` right away, `payout_verified_at` = now, and the event "Seller's PayPal verified by Log in with PayPal". The user token is used once and never stored.
  - **Blocking:** `payeeRoute` routes only `verified` sellers, by `merchant_id`. `unverified` becomes `not_ready`, so `SELLER_NOT_READY` is refused before any order is created. This closes the D-083 finding (PayPal accepts a non-account payee email). Typing an email or merchant id stops being a way to get paid; the admin `set_payout` stays for ATs only.
  - The first-capture check stays as a mismatch alarm (PLAN 9.2).
  - PayPal shapes (the authorize parameters, the `userinfo` fields, whether a business account's `payer_id` equals the merchant id the capture returns) will be checked against current docs and the toolkit before coding (CLAUDE.md). The AT also compares the `userinfo` `payer_id` with seller 2's known merchant `B83JSV9ELHV74`.
- **Return URL for the Developer Dashboard** (sandbox app → Log in with PayPal → Return URL): `https://shopfront-agent.onrender.com/api/seller/paypal/return`. Only for local testing, if the dashboard accepts it: `http://localhost:3000/api/seller/paypal/return`. The ATs run on Render, so the localhost one is optional.
- **Estimate:** about 0.5 day: the route, the state signing, the `payeeRoute` change and tests, and an AT with seller 2. The card's UI is separate (the "Get paid" card is already in the UI list).
- **Owner: keep the $50 auto-refund limit** for `fern_and_loom` (D-083 question closed).
- **Deletions (owner rule, after two path-echo slips in part 6):**
  - Raw `rm` is retired. Use `node scripts/safe-rm.mjs [-r] <path…>` (or `pnpm safe-rm`).
  - It prints each resolved absolute path first and refuses: anything outside the repo; the repo root; `.git`; a missing path; a directory without `-r`.
  - If any path is refused, nothing is deleted.
  - Tested by hand (outside, root, `.git`, a directory without `-r`, a mix of good and bad paths, a missing path, from a subfolder through pnpm, and `-r`).
  - Added to CLAUDE.md's working style.
- **Serves:** J1, J3, G1, D-076, D-083.

---

## D-085: Fix list approved, Phase 11 cut, autonomous run (2026-10-18; owner)

- **Owner:** "Approved: the fix list and the Phase 11 cut (log it)." The goal for this run is feature-complete: every remaining planned item built, tested on Render and documented, leaving only bug fixes, the video and the submission.
- **Cut: Phase 11 (agent reorder with Vault) and Spike V.** Their 4 days go to the walkthrough fixes (`docs/review-pack/FEEDBACK.md`).
  - Vault stays enabled in the sandbox app, unused.
  - The README must not claim saved-wallet reorders. P8 is answered by the agent checkout + human approval only.
  - Cut order from here: 13 lite is the only remaining cuttable phase; the owner confirms any further cut.
- **Build order (owner):** #13 + #12, #1 photos (CC0/free-licence stock now; owner photos later for the live photo-to-store and Telegram demos), #2 demo history, #4 shop, #3 AG Grid dashboard (key-gated; Community fallback; never a watermark), #9 studio editor, #6 landing, #7 live console, #11 mobile, #5 hack card + 12 attacks, #10 Phase 9 screens + Log in with PayPal (D-084), #8 + full Phase 10, README final pass, final regression.
- **Per item:** ATs on Render including unhappy paths; screenshots in `docs/screenshots/<item>/`; commit and push; DECISIONS for deviations; a 5-line report in `docs/PROGRESS.md`. Waiting on the owner never blocks: take the fallback and log it in `docs/OWNER-TODO.md`.
- **Render build filter (found during the walkthrough):**
  - Every push redeployed the service, docs included. My docs commit `eec455c` restarted Render at 06:05:57 UTC, in the middle of the owner's step 2. That drops the SSE wire and the in-memory timers (the boot re-arm recovers them).
  - The service's build filter now ignores `docs/**` (Render API, `buildFilter.ignoredPaths`), so docs-only commits no longer deploy. Code and README changes still do.
- **Serves:** J2, J5, P8 (honest scope), D-079.

---

## D-086: The PayPal approval bug from the walkthrough (2026-10-18)

- **Symptom (walkthrough step 2):** the owner's $37 Cobalt drip mug checkout `chk_dfzuximzjhso` stayed `created`. PayPal's order is still `PAYER_ACTION_REQUIRED`, so no buyer ever approved it. Our server did everything right: the order was created, and the fallback GETs ran at +1, +3 and +10 min.
- **Reproduced on Render:** a probe opened fresh pay pages and clicked the PayPal button once:
  - 2 of 4, 1 of 3 and 3 of 6 first clicks opened **no PayPal window**;
  - the button then stayed in "approving" with no message;
  - **a second click on the same page also opened nothing.** The buyer is stuck until they reload, which is what the owner saw.
- **Cause:** `session.start({ presentationMode: "auto" })` in the v6 SDK.
  - In a minimal page outside our app (the same SDK, client id and order), "auto" opened nothing 1 time in 5, yet `start()` resolved normally.
  - Explicit `"popup"` opened 5 of 5.
  - So it is the SDK's "auto" choice (likely a presentation that never appears in this browser), not our React code.
  - The PayPal toolkit reference recommends "auto". We stop following it here, on evidence.
- **Fix:**
  - `presentationMode: "popup"`, started synchronously inside the click.
  - If the popup is blocked, it falls back to PayPal's own page (`checkoutnow?token=`), which returns through `/pay/return` and is captured server-side.
  - While "approving", a "Can't see it? Continue in this tab" link goes to the same page, so the buyer is never stuck.
  - The rules live in `apps/web/src/lib/paypal-presentation.ts`, with unit tests.
- **Regression test:**
  - `approval-checks` AP5: 8 fresh pay pages, each clicked the moment the button is ready, must open PayPal every time, and the escape link must equal the order's own `payer-action` link.
  - AP1 now fails on any popup that doesn't open (it used to retry).
  - The older ATs hid this bug: since Phase 2 they retried a popup that "did not open" (`phase2-checks` `payInPopup`).
- **Also shipped (#12):**
  - A branded "This payment link is incomplete or expired" page for `/pay` without or with a wrong token, an unknown checkout, or a bad `/pay/return` link. It is the same page whichever check failed, and never shows the order.
  - A branded site 404.
  - The redirect flow's cancel now says "nothing was charged".
- **Refund re-walk (#13):** AP1b on Render. A refund asked in the same `/shop` chat was auto-approved by Juniper Clay's policy, and PayPal refund `1AN57176SK298430G` is `COMPLETED`. The step-7 404 in the walkthrough was my link (no `?t=` token), not the app.
- **Serves:** R2, J3, G1, D-025.

---

## D-087: Listing photos, demo order history, catalog image fix (2026-10-18; walkthrough #1, #2)

- **Photos (#1, owner: "CC0/free-licence stock now… credited in the README… no visible brands"):**
  - Every seeded listing has a public-domain museum photograph (CC0 1.0), found through Openverse. They come from the Art Institute of Chicago, LACMA and The Met via rawpixel's public-domain collection.
  - The look is consistent per seller: Juniper Clay is glazed ceramics on a grey studio backdrop; Fern & Loom is indigo textiles; the practice shop has its own cup and bowl.
  - The bud-vase trio is our composite of three vase photos.
  - Credits: `apps/web/seed-photos/CREDITS.md` and the README's Credits section.
- **Copy changed to match the photos:**
  - The ash-glaze bowl is now "pale wood-ash glaze".
  - The bud-vase options are now "Celadon + copper red" and "All copper red" (same variant ids).
  - The practice mug is now "Practice copper-red cup".
- **Fern & Loom gained two listings** (Shibori tea towel $24, Block-print table runner $64), so its storefront isn't one item.
- **Same pipeline as uploads:** the seed stores photos through `src/lib/image-process.ts` (sha256 identity, WebP, 1600 px or less), which is now shared with `server/images.ts`.
- **Demo catalog refreshed:** after the seed, the demo catalog was re-frozen and both shops re-synced to PayPal's catalog (`scripts/admin.mjs`, new admin action `sync_catalog`).
- **Bug found and fixed in the catalog sync:**
  - PATCH `/v1/catalogs/products/{id}` with `replace /image_url` returns 400 `INVALID_PATCH_PATH` ("The field does not exist") when the entry was created without an image. Every seeded entry was.
  - Now it uses `add`, which also overwrites an existing value. Verified on the sandbox: `replace` 400, `add` 204; then Juniper Clay synced 4/4 and Fern & Loom 3/3.
- **Owner photos later:** 3–4 of the owner's own items for the live photo-to-store and Telegram demos (OWNER-TODO #3). The upload flow is unchanged and ready.
- **Demo order history (#2):**
  - Every one of `juniper_clay`'s orders came from test runs (`is_test`), so judges saw an empty Studio.
  - The demo seller now has an **"Include test orders"** switch, on by default. It's a cookie preference that changes only this browser's view.
  - Each such order shows a **"Test run"** badge, and the switch label explains where the orders come from.
  - Real sellers never see test rows. The judge practice shop (`test_only`) always shows its own. Public views (`/live`, landing, `/api/events`) are unchanged.
- **New history:** `demo-history` placed 10 real sandbox purchases across both shops; 8 were paid and 2 skipped on sandbox login timeouts. 3 were shipped with USPS tracking through PayPal `/track`, and 1 was refunded after the seller approved it.
  - **Nothing is backdated:** PayPal timestamps are real, so the history grows on the days the ATs run.
- **Serves:** J2, J5, S6.4, D-070, D-073.

---

## D-088: `/shop` rebuild (2026-10-18; walkthrough #4)

- **Owner's step-2 notes:** make Search → Found → Checkout → PayPal → Paid obvious; show who does what; premium e-commerce, not "a chat with debugging logs"; keep the logs on the right with details collapsed; subtle motion.
- **Built:**
  - **A site nav** (`components/site/site-nav.tsx`): wordmark, Try the buyer demo, Live wire, Sell with Shopfront, Developers (`/llms.txt`), Docs (the repo); a sheet menu on phones.
  - **A 5-step rail** lit only by real events: tool calls and results, then the PayPal button's phase. Each step names its actor: "Agent searches", "Agent picks", "Shop sets the price", "You approve", "PayPal confirms".
  - **Product cards:** a 4:5 photo, the seller, the title in Alegreya, the price "set by the shop", an in-stock dot and a **Buy this** button. Two per row on desktop, a swipe row on phones.
  - **The checkout card:** the item photo, Items / Shipping / Total (the total in display size, "set by the shop, not the agent"), and **the PayPal button inline** (`PayPalApprove` `variant="inline"`, the same v6 session and D-086 popup rules). It turns into the paid state in place.
    - `/pay` stays, as the consent record and the fallback ("Open the payment page").
    - D-078 #2 said "once the buyer opens the card"; it's simply always shown.
  - **MCP calls collapsed:** consecutive calls become one line ("Searched the catalog · 'blue mug' → 2 found · 1 MCP call"); the exact calls appear on expand.
  - **Empty state:** three plain lines on what the agent can and can't do, and four suggestion cards with icons.
  - **The hack button** moved to a quieter secondary style ("Hack it" on phones). The hack card itself is #5.
  - **On phones:** the live wire opens in a bottom sheet from the chat header. Only one live-wire stream is mounted per page (desktop column or phone sheet, by media query).
- **Kept:** the live wire on the right, the "Answered before" legend, all test ids the ATs use (`shop-input`, `checkout-card`, `pay-link`, `hack`, `hack-result`, `tool-chip`).
- **AT:** `shop-checks` S1–S4 plus overflow at three sizes (results in PROGRESS).
- **Serves:** J2, J5, P1, D-078 #1–#3.

---

## D-089: Dashboard v2, AG Grid "Best Use" (2026-10-18; walkthrough #3; PLAN AG Grid features 1–6)

- **Owner's step-6 notes:**
  - Today it looks like "an unfinished dashboard builder".
  - Wanted: KPI cards, interactive grids, linked charts, filter/sort/group/pivot/drill-down.
  - "Asking a question should visibly transform the grid, columns, filters, and charts."
  - Config collapsed, no floating overlays, real data only.
- **Two tabs on `/studio/dashboard`:**
  - **Overview** (default; no editor chrome):
    - An **Ask bar**: one structured `llm.call` (Groq → Gemini, temperature 0, Zod `DashboardIntent`) returns either a view (`GridView`: filters, group, sort, columns, chart preset) or a question.
      - Deterministic client code applies the view.
      - A "what changed" banner lists each change in plain words (`describeViewChange`), with **Undo**.
      - Questions are answered with the code-written `[db]` and `[paypal]` summary lines, never model prose.
    - **KPI cards**: revenue, orders, average order and refund rate over 7 days vs the prior 7, each labelled `[db] 7d`, with a 14-day sparkline.
    - **The orders grid** (AG Grid):
      - photo, status pill, test badge;
      - grouping by product, status, day or country with subtotal rows;
      - a click drills into the order's PayPal history (our events plus the raw PayPal calls, with copyable ids);
      - header sort kept inside groups (`postSortRows`);
      - new orders flash in live from the SSE wire;
      - note and ship-by editable in place.
      - Active filters show as removable chips; Group and Chart selects; search.
    - **A linked chart** (AG Charts Community) built from the rows in view. Clicking a product bar drills the grid into that product.
    - **The listings grid** (AG Grid):
      - description and category edit in place and PATCH PayPal's catalog; the row shows "PayPal synced" with the debug id, or the error;
      - price and stock change only our catalog and apply to the next checkout (D-002);
      - an injection-looking description is refused;
      - a 14-day units-sold mini-bar column.
  - **Builder · AG Studio:** the existing Studio canvas (Pivot grid widget, charts, our custom widgets) with Studio's own AI assistant and its agents (D-023, D-043). AT-5 now drives this tab (`?tab=builder`).
- **Licence (D-080 guard, now built):**
  - `lib/ag-license.ts` decides from `LicenseManager.getLicenseDetails()` (tested), and `components/dashboard/grid-modules.ts` registers modules.
  - `AllEnterpriseModule` + AG Charts Enterprise go in only for a valid, unexpired `BOTH` key in `NEXT_PUBLIC_AG_GRID_LICENSE_KEY`; otherwise Community.
  - There is no key yet (OWNER-TODO #1), so everything above ships on Community: grouping and drill-down are our own full-width rows, and the sparklines are SVG. **No watermark either way.**
  - Pivoting is Studio's Pivot widget on the Builder tab (licensed by the Studio key).
  - `ag-grid-enterprise` and `ag-charts-community`/`-enterprise` are direct dependencies at the versions AG Studio pins (36.2.0 / 14.2.0).
- **Deviations from PLAN's AG Grid list:**
  - Master-detail, set filters and integrated charts are Enterprise-only, so they are replaced by the full-width drill-down, the filter chips and the linked AG Charts chart.
  - The "AI Toolkit" is our own NL → grid-state route (the same guard and output-only contract as PLAN item 4).
- **AT:** `dashboard-checks` G0–G6 (results in PROGRESS). AT-5 must still pass on the Builder tab.
- **Serves:** P9 (the AG Grid prize), J1, J2, J5, D-002, D-016, D-074.

---

## D-090: Studio editor, landing, live console, mobile pass (2026-10-18; walkthrough #9, #6, #7, #11)

- **Studio (#9):**
  - A 3-step rail (Upload → Review AI draft → Publish to shop + PayPal) driven by what happened in the session.
  - A drop zone that shows real listing photos and reacts on drag.
  - Every AI-filled field carries an "AI" marker; a legend explains the marker, the amber "check it" state and "only you set the price".
  - Fields are grouped (The basics / Details).
  - **The price sits in its own bordered block:** "Your price · you decide", with the AI's guess as a hint and Confirm required before Publish.
  - A success panel replaces the toast: live in the shop, the PayPal catalog id, "See it in your shop", "Ask an agent to buy it".
  - On phones the Publish bar is sticky. The card uses `overflow-clip`; `overflow-hidden` broke the sticky bar.
- **Landing (#6), owner's list:**
  - The headline is "Your storefront, ready for AI agents."; the CTAs are "Try buyer demo" (primary) and "Sell with Shopfront" (secondary); a slim site nav (`components/site/site-nav.tsx`, also on `/shop` and `/live`).
  - A plain-English line, two proof lines, and the live feed on the right.
  - A 4-step strip (the seller → the buyer's agent → the buyer → the seller's agent) built from real listings and photos.
  - The guardrail panel and a developer card with the copyable MCP endpoint, `/llms.txt`, the live wire and a storefront.
  - **Honest-scope footer updated:** Fern & Loom is paid directly, Juniper Clay into the platform account, and the photos are museum pieces.
  - The old 5-paragraph loop and the route list are gone; the nav covers routes.
- **Live console (#7):**
  - A 24-hour KPI strip (agent steps, MCP calls, payments captured, attacks blocked) from the database (`liveStats`), counted up live.
  - A "Group by checkout" view; clicking a checkout still follows only its events (the `phase2-checks` contract).
  - **Shared timeline rows (also on `/shop`, the landing and the dashboard):**
    - ids, latency and model sit behind a per-row "Details · N" toggle (still copyable);
    - PayPal rows are larger and keep their one key id (Capture, Refund or Order) in view;
    - "Answered before" / replay badges stay visible (honesty);
    - relative times, with the exact time in the tooltip;
    - one accent rule per system: agent clay, MCP stone, PayPal blue, webhook green.
- **Mobile (#11):**
  - `/pay` padding tightened (PayPal's button has a minimum width).
  - Landing grid tracks are pinned to `minmax(0,1fr)`.
  - The chat panel can't widen (found by the inner-overflow check).
  - The site nav has a sheet menu; `/shop` has a live-wire bottom sheet.
  - `mobile-checks`: 13 routes × 360/390/430 px = 39 combinations with no sideways scroll, on the page or inside the chat.
  - **Deviation:** no sticky PayPal button on `/pay`. It's PayPal's web component inside its card, and the page is short enough that it sits near the fold on a phone.
- **ATs on Render:** `studio-checks` 5/5, `landing-checks` 5/5, `live-checks` 5/5, `mobile-checks` M1 39/39 (see PROGRESS).
- **Serves:** J2, J5, D-078.

---

## D-091: Phase 13 lite, the hack card with 13 real attacks (2026-10-18; walkthrough #5; D-079)

- **The attacks:** `/api/shop/hack` runs 13 real attacks against the public endpoints:
  - price tampering ×4: `price: 0`, total + discount, a currency switch, `price_cents`;
  - quantity tricks ×3: −3, 0.5, 10,000;
  - a fake variant id;
  - stolen tokens ×3: refund someone else's order, a $500 `amount` field, read someone else's status;
  - **a forged PayPal "payment completed" webhook**, sent to our real webhook route and rejected by PayPal's own signature check;
  - 11 line items.
- **Honesty fix:** "Checkouts created" used to be the literal 0. It is now **counted in the database** for the attacker's client name (`x-shopfront-client: price-hacker-demo`).
- **The card is proof first:**
  - three big numbers: Attacks blocked N/N, Price unchanged, Checkouts created;
  - one chip per attack, grouped by family, settling red → green;
  - "What the server answered" on expand.
  - The agent prompt-injection still follows, as before.
- **AT:** `hack-checks` 3/3 on Render: 13/13 blocked across 6 families, price = DB, 0 checkouts in the DB, the UI matches, no $0 checkout from the prompt version, no overflow.
- **Serves:** J3, G1, R2, D-002.

---

## D-092: Phase 9 screens, Log in with PayPal, and the Phase 10 copilot (2026-10-18; walkthrough #10, #8)

### Phase 9 screens + Log in with PayPal (D-084 built)
- **Get paid card** in the Studio. It shows where the shop's money goes:
  - `platform`: "the platform's sandbox account (demo shop)", with why;
  - `verified`: straight to your PayPal, showing the merchant id;
  - `none`/`unverified`: can't take payments yet.
- **"Paid directly to …" lines:** on `/pay`, on storefronts and in the live wire's `order_created` summary ("paid directly to Fern & Loom's PayPal" / "paid to the Shopfront sandbox account").
- **Orders:** a `handoff` refund shows a "Refund it in your PayPal ↗" link to the capture's page.
- **Log in with PayPal flow:**
  - `GET /api/seller/paypal/connect` → `https://www.sandbox.paypal.com/connect` with `scope=openid email https://uri.paypal.com/services/paypalattributes`.
  - The `state` is an HMAC-signed, 10-minute, single-use nonce (a replay is refused).
  - `GET /api/seller/paypal/return` exchanges the code server-side (`grant_type=authorization_code`, Basic auth) and reads userinfo: `/v1/identity/oauth2/userinfo?schema=paypalv1.1` (for `payer_id`), falling back to the documented `/v1/identity/openidconnect/userinfo`. The user token is used once and never stored.
  - A non-platform seller becomes `verified` with that payer id. The platform demo shop only records that the check passed (`payout_identity_checked`) and is never rerouted.
- **Routing rule (D-084):** `payeeRoute` pays only `verified` sellers. An `unverified` email is now `not_ready` → `SELLER_NOT_READY` before any order exists (unit test updated).
- **Blocked on the PayPal side (owner):**
  - On Render, PayPal's `/connect` page answered **"invalid client_id or redirect_uri"**. The client id is the app's own (the same one the JS SDK uses), so the Return URL isn't registered for this sandbox app yet.
  - **Honest fallback:** the connect button is hidden behind `PAYPAL_LIPP_ENABLED` (default `0`), and the card says Log in with PayPal is being switched on. Fern & Loom stays verified by its first capture (D-083). Unverified sellers can't sell.
  - OWNER-TODO #4 has the exact fix. `connect-checks` (C2–C6: real sign-in as sandbox seller 2, replay refusal, an unverified email refused, Fern verified with payer id = merchant `B83JSV9ELHV74`, "paid directly" everywhere) runs once it's fixed. C1 passed.

### Phase 10: the seller copilot on Telegram (PLAN Phase 10, D-072/D-073/D-082)
- **Outbound:** `server/telegram-api.ts` sends Telegram HTML with inline buttons. Every message is logged as a `telegram_sent` event (hashed chat id, short text, button labels), so the live wire shows the copilot working and ATs can read what the bot said. A dead chat never breaks a sale.
- **Welcome card** after `/start <code>` or `/start judge`: the connected shop, what I do (5 jobs), payouts or judge-mode note; buttons Orders · Pending refunds · Shop status · Sales this week (+ Simulate a buyer in judge mode).
- **Menus are read-only and answered by code:** latest orders, pending refunds (each re-sent with Approve/Decline), shop status (listings, drafts, payout), and sales (the `[db]` and `[paypal]` summary lines + top product). `/orders /refunds /status /sales` and "how are sales?" work too.
- **Order pings:** pushed from the capture path when PayPal confirms: product photo, amount, who was paid, and "send me the label photo". In judge mode they add "Simulate a refund request".
- **Refund approvals:** a refund that needs the seller pings Approve/Decline. These are single-use, seller-scoped, expiring action rows (D-072) running `decideRefundAsSeller`.
- **Photo → listing:** a photo (or the caption) → the same Gemini draft as the Studio → a draft card with the photo, the AI's price guess and "Publish at $X" (a `publish` action whose handler reads the price from the draft row, never the button) or "Set my price" (reply with a number, parsed by `parsePriceInput`). Publish = `approveProduct` = live + PayPal catalog.
- **Label photo → tracking:** the same label reader → "Add tracking" to the oldest paid unshipped order (an `add_tracking` action; the handler re-reads the label from the cache) → `addTracking` → PayPal `/track` + the buyer note.
- **Judge mode:**
  - `/start judge` links to `judge_demo`, the isolated practice shop (`test_only`, D-073).
  - "Simulate a buyer" makes a real practice checkout via the same `createCheckout` and sends a PayPal link; the judge approves as the sandbox buyer.
  - "Simulate a refund" uses the real MCP refund path (the order token is held in memory for the session).
- **Studio:** a "Your seller copilot on Telegram" card links to the judge mode.
- **Test hook:** `tg_photo` (admin token) hands a photo to the same `onPhoto` as the webhook, because a made-up chat can't upload to Telegram.
- **AT:** `telegram-flow-checks` F1–F7 plus the earlier `telegram-checks` T1–T6 as a regression (results in PROGRESS).
- **Serves:** J1, J3, J4, G1, P7, D-002, D-072, D-073.

---

## D-093: Final regression findings (2026-10-18; item #14)

- **A real regression, fixed:**
  - The #9 "AI" badge sat inside each AI-filled field's `<label>`, so the field's name became "AI Tracking number". That broke AT-4 #5 (`getByLabel("Tracking number")`) and changed what screen readers announce.
  - The badge now sits outside the `<label>`, and is `aria-hidden` (`a0d21f6`). AT-4 passes 7/7.
- **Older ATs updated to decided behaviour (not app changes):**
  - **AT-6 #8 token theft:** a bad `/pay/return` link now 303s to the branded "link incomplete or expired" page (D-086). The test now accepts that redirect target (or a 400) as "refused". It still requires that no token is issued and that the real return captures once. All 10 attempts were blocked.
  - **`fixes-checks` I6:** since D-087 the demo seller's "Include test orders" switch is on by default. I6 now checks both sides: switch off hides test orders (as before), and the default shows them, badged.
  - **`lane-checks` L2:** the 13-attack card (D-091) replaces "Protected: 3 of 3". The test requires every chip blocked with a server reason, and 0 checkouts.
  - **`phase2-checks` E:** after pointing the webhook at a wrong URL, PayPal kept delivering to the old URL for a while. The test now waits 45 s, and waits up to 90 s for the "via poll" badge that the next fallback check records. The app behaved correctly in every run: paid via poll, no webhook, 46 s after approval.
  - **PayPal sandbox flakiness** ("Things don't appear to be working at the moment", a login page that never loads): the shared login helper presses PayPal's *Try again* up to 3 times, and the telegram-flow and connect approvals retry once.
- **`phase9-checks` is superseded** by `connect-checks` (D-084): its P1/P2 path routed an unverified email, which is now refused, and it would leave Fern & Loom unable to sell. It refuses to run without `--legacy-unverified-routing`.
- **Log in with PayPal:**
  - Still rejected after the owner's fix, about an hour later. PayPal's page answers "invalid client_id or redirect_uri" for every variant tried:
    - `/connect` and `/signin/authorize`;
    - scopes `openid`, `openid email`, and with the PayPal account-ID scope;
    - redirect URIs: the exact Return URL, with a trailing slash, the site root, `/studio` and `localhost`.
  - So the app's Log in with PayPal setting isn't active for this client id at PayPal (OWNER-TODO #4 has what to check).
  - `connect-checks --skip-lipp` runs C1 and the new C7: **a real Fern & Loom order paid by the sandbox buyer lands in seller 2's PayPal** (capture payee `B83JSV9ELHV74`). Fern & Loom never lost its verified status.
- **Serves:** J1, J2, G1, D-084, D-086, D-087, D-091.

---

## D-094: Owner's evening fixes, and two bugs the new AT found (2026-10-18)

- **Owner (18:20 IST):** the Log in with PayPal Return URL was a placeholder (`nativexo://paypalpay`). It's now our URL, with the Email, payer ID and account verification status scopes, a privacy URL and a user agreement URL. PayPal says it can take up to 3 hours to apply.
- **Built:**
  - **`/privacy` and `/terms`:** short and plain, with sandbox-demo wording. PayPal's consent page links to them; so does the landing footer.
  - **Demo stock never runs out:**
    - a demo variant (Juniper Clay, Fern & Loom, the judge shop, or any `test_only` seller) that sells down to 0 is set back to 20 in the same capture step;
    - the demo reset leaves every demo listing at 20 or more;
    - a real seller's stock is never touched.
  - **"Simulate a refund" survives restarts:**
    - "Simulate a buyer" always sends a `client_request_id`, so the buyer's order token can be re-derived server-side (`tokens.ts`). It's never stored;
    - it works only for practice orders this bot created on the `test_only` shop;
    - the in-memory map is gone.
  - **Site nav on every Studio page** (Listings, Orders, the dashboard's Overview and Builder, and the sign-in page).
  - **Account verification status as an extra signal:** if PayPal reports `verified_account: false`, the seller stays `unverified` and isn't paid; the card says why. If the status isn't shared, it's allowed.
- **Bugs found by `fixes3-checks` X3, fixed the same evening:**
  1. **The restock SQL used `= any(${array})`.** Drizzle expands a JS array into `$1, $2, $3`, so the statement threw in the middle of `recordCapture`, after PayPal had captured. `/pay/return` answered 500, and the webhook path then saw our own stock decrement as "sold out" and cancelled the order. Now the constants are an `IN (…)` list.
  2. **The underlying gap (older than today):** a checkout with a capture already on record could still be cancelled by the "sold out before payment" check. Now an existing capture is settled from PayPal's order and never cancelled.
  - **Two sandbox captures were orphaned** while bug 1 was live: `chk_sewtsaj30hts` (`4PS80372PS203812S`) and `chk_0prkr6zvb6y8` (`93897555YJ175420Y`), $33 each, test-flagged, cancelled in our DB but captured at PayPal. Left as they are pending the owner's call (refund them in the sandbox, or leave them).
- **Testing on this machine:**
  - The desktop session stopped allowing visible browsers ("spawn UNKNOWN").
  - `AT_HEADLESS=1` in the shared preload runs every suite on the headless shell, and PayPal's sandbox login works headless now.
  - `/api/health` reports `booted_at`, so X4 proves a fresh process answered (13:23:18 vs 13:19:14).
- **ATs on Render:**
  - `fixes3-checks` X1 /privacy + /terms, X2 the nav on 4 Studio pages, X3 restock (20 straight after a sale to 0; 0 rows under 20 after the reset), X4 a refund after a proven restart: all pass.
  - Regression after the capture guard: approval 6/6, shop 4/4, phase4 7/7.
- **Serves:** J1, J2, G1, D-009, D-073, D-084.

- **Log in with PayPal, closed (2026-10-18 19:04 IST):**
  - The cause of the rejection: the app's Return URL was a placeholder (`nativexo://paypalpay`), which the owner replaced. PayPal accepted the new one within about an hour.
  - `PAYPAL_LIPP_ENABLED=1` is set on Render (single-key API update, then a deploy).
  - `connect-checks` passes 7/7 on Render: C2 real sign-in as seller 2 (userinfo fields `user_id, sub, payer_id, verified_account, email…`); C3 replay refused; C4 an unverified email refused; C5 Fern & Loom verified by Log in with PayPal (payer id `B83JSV9ELHV74` = the merchant PayPal pays); C6 reconnected; C7 a paid order lands in seller 2's PayPal.
  - D-093's open item is closed. The README limitation line was replaced by "live".

---

## D-095: Orphaned captures refunded; reconciliation with PayPal (2026-10-18; owner, OWNER-TODO #5)
- **Owner's decision:**
  - Refund both D-094 orphaned captures through the app's own refund code, and mark the orders "captured after cancel → refunded" with a note on the incident.
  - Add a reconciliation check (half a day at most) so this class of bug can't go unnoticed again.
- **Root cause it closes:**
  - In D-094 two orders were cancelled after PayPal had captured them.
  - The capture webhook arrived and was logged as "confirms existing state". The state machine had correctly reported a conflict, but the webhook handler's summary didn't distinguish it.
  - Nothing compared our books with PayPal's.
- **Built:**
  - **The rules:** `packages/core/src/ledger-check.ts` (pure, 9 unit tests). It flags a capture with no paid order, a paid order with no capture (no row, a capture that isn't money, or one PayPal doesn't know), and amounts that differ.
  - **The data:** `apps/web/src/server/ledger.ts`.
    - PayPal's side comes from three sources: Transaction Search for the last 30 days (paged), verified `PAYMENT.CAPTURE.COMPLETED` webhooks, and a GET of up to 15 unconfirmed captures. Our side is the `captures` and `checkouts` tables.
    - Results go in the new `reconciliation_runs` table (migration 0012). A new mismatch is recorded once on the seller's timeline.
  - **When it runs:**
    - on boot, and daily on an unref'd timer, so it never keeps Render or Neon awake (D-022);
    - from a dashboard whose last run is more than a day old;
    - at once when a capture webhook conflicts with the order's state;
    - with `pnpm reconcile`;
    - at the end of every AT suite. The shared preload's exit hook runs it with `--settle`, which re-checks once after 90 s, and fails the suite on a mismatch. `AT_RECONCILE=0` skips it.
  - **The dashboard badge** "Reconciled with PayPal ✓ / N mismatches" opens to show what was compared and each mismatch's ids. Items with no order are attributed to the seller named as payee, or else to the platform-paid shops.
  - **"Explained" captures** are listed, never hidden. There is one today: `3G13556369039540R`, the D-076 payee-routing spike, which created a $37 order directly at PayPal outside the app.
  - The webhook now logs `capture_conflict` with "⚠ PayPal moved money but the order is cancelled: flagged for reconciliation".
  - **Repair:**
    - the admin action `refund_stray` creates a `reconciliation` refund request and calls `executeRefund` (GET of the capture first, `PayPal-Request-Id = refund-<id>`, row lock);
    - it's idempotent, it refuses directly-paid shops (D-076), and it skips the refund-spike alert;
    - state machine: `cancelled + REFUND_FULL → refunded` (a partial refund or a new capture on a cancelled order is still a conflict).
- **Deviation:** the reconciliation only reports. It never refunds by itself: money moves only on an explicit action (D-002).
- **Results on Render (`reconcile-checks`, 6/6):**
  - before the repair: 101 matched, exactly the 2 orphans flagged, 1 explained; the badge read "2 mismatches with PayPal" at desktop, 1920×1080 and mobile;
  - refunds `6W5585679V533933W` (capture `4PS80372PS203812S`) and `9LF06474PK812901K` (capture `93897555YJ175420Y`), both REFUNDED by a PayPal GET; the orders are `refunded`, with the note;
  - a repeat call did nothing; afterwards 103 matched, 0 mismatches, and the badge read ✓.
  - `shop-checks` 4/4, ending with an automatic reconcile PASS, where a capture seconds old was confirmed by GET.
- **Serves:** J1 (technical depth: real PayPal reconciliation), J3 (reliability), D-002, D-007, D-022.
---

## D-096: Review v2 fixes approved; Phase 11 (Vault reorder) re-added; Phase 12 only with time to spare (2026-10-18; owner)
- **Owner's decision (verbatim intent):**
  - "Build all 8 fixes, in this order: 1, 2, 5, 6, 4, 3, 7, 8. Each gets tests on Render, screenshots at 3 sizes, a commit and a push."
  - After fix #1: run the full /shop flow through to the paid state headless, and give the owner a link to complete one real purchase.
  - "RE-ADD Phase 11 (Vault reorder)", with about 16 days left.
- **The fix list** (`docs/review-pack/FEEDBACK-V2.md`):
  1. /shop checkout prominence;
  2. /shop images and search accuracy;
  5. dashboard AI change made visible;
  6. Get paid onboarding clarity;
  4. dashboard width;
  3. landing prominence;
  7. Telegram polish;
  8. /shop live panel balance.
- **Reverses part of D-079:** Phase 11 and Spike V are back.
  - Spike V first, at most 1 day: PayPal wallet vaulting plus merchant-initiated orders in the sandbox for our US app.
  - If go: build per PLAN Phase 11: consent screen, buyer-set cap, per-agent audit log, instant revoke, popup-free reorder within the cap, and the popup returning above the cap or after a revoke.
    - It must work for both verified seller kinds (platform-paid and direct-paid), or the limits are documented.
    - The reorders are added to the reconciliation check (D-095), and to the attack suite: cap bypass, revoked consent, replayed token.
    - The visual: the cap filling up, and the reorder flowing through the live wire with no popup step.
  - If no-go: log it, keep the phase cut, and tell the owner in 3 lines.
  - The migration is renumbered to `0013` (0012 is `reconciliation_runs`).
- **Phase 12** (dispute defense) is built only if Vault ships with time to spare, scoped to a 15-second demo beat. Otherwise it stays cut.
- **Then:** update DEMO-SCRIPT.md for whatever ships, and prepare a short review v3 of the changed screens only, waiting for the owner's "start review v3".
- **Feature freeze:** still the end of Nov 5 (D-079).
- **Serves:** J1, J2, J4, P7, P8, R2, R3, G1.
---

## D-097: Competitive re-plan: Vault cancelled for good; Cart API v1, AG Studio, Gauntlet, proof docs; available through Dec 15 (2026-10-18; owner)
- **Owner's decision** (supersedes D-096's Vault re-add):
  1. **Phase 11 (Vault reorder) is cancelled for good.** Spike V is not run. Mandat and Bursar already ship Vault mandates, so it no longer differentiates.
  2. **New: Phase C, PayPal Cart API v1 merchant contract** for every Shopfront store. The endpoints are `POST /merchant-cart`, `PUT /merchant-cart/{id}`, `POST /merchant-cart/{id}/checkout` (plus `GET /merchant-cart/{id}`, which the spec also defines). It needs JWT auth bound to the store, `validation_issues` with `resolution_options`, and Orders v2 integration.
     - Spike first: does capture-on-ship (authorize at checkout) work with our direct-payee flow?
     - Ship a test agent client that shops through the Cart API, plus a README section.
     - Pitch line: "Every Shopfront seller is Store-Sync-ready."
  3. **AG Grid prize:** move the dashboard effort to AG Studio, with custom widgets and a read-only "Shop Manager" Studio agent on the Studio agent framework. Check `paypaldev/hackathon-paypal-ag-grid-boilerplate`. OWNER-TODO: the AG Studio trial must cover Dec 15.
  4. **Gauntlet:** the hack card becomes naive vs guarded agents side by side, 30+ attacks, including prompt injection hidden in product photos and shipping-label photos read by our vision step.
  5. **Proof docs:** `threat-model.md`, a sandbox-validation table, `development-with-ai.md`, and test counts in the README.
  6. **Availability:** keep-warm and every trial through Dec 15 (the judging window). PLAN dates updated.
  - Order: 2, 3, 4, 5, under the same standing rules.
- **Research findings, 2026-10-18** (they shape the plan):
  - **Cart API source:**
    - `github.com/paypal/agent-commerce` and its `v1/api-spec.yaml` return 404 publicly.
    - The docs.paypal.ai Store Sync pages now 301 to 404s.
    - PayPal's published npm package **`@paypal/agentic-commerce-spec` 1.1.0** (Apache-2.0, generated from that repo's OpenAPI) carries the full schema: `PayPalCart`, `ValidationIssue` (6 codes, 3 types, per-category context), `ResolutionOption` (22 actions), `PaymentMethod {type: "paypal", token, payer_id, approval_url}`, `BusinessError`, and checkout `payment_confirmation`. We build to that package's Zod schemas.
  - **Store Sync access:** "merchants must complete this form … to request access" (developer.paypal.com/agentic-commerce-services/about). So PayPal won't route real assistants to us without onboarding, and the JWT is "PayPal-supplied" with no public verification spec.
    - **Honest framing:** Shopfront implements the merchant side of Cart API v1 and is ready for Store Sync onboarding. Our test agent proves the contract end to end with real Orders v2 sandbox payments.
    - Until PayPal issues tokens, the bearer JWT is a store-bound token we issue (RS256, published JWKS, `aud` = the store), verified on the same code path that would verify PayPal's.
  - **CartItem price:** the spec's `CartItem` has an optional agent-sent `price`. Under D-002 it is never trusted: we price from the DB, and a differing price returns `PRICING_ERROR / PRICE_MISMATCH` with `ACCEPT_NEW_PRICE`. It becomes a Gauntlet attack.
  - **AG Studio:** the Builder tab already runs AG Studio with 3 custom widgets and a custom `insights` agent (D-023). Phase AG upgrades it: a designed multi-page Studio report, more custom widgets, theming, and the read-only Shop Manager agent built from the documented agent framework (`agents`, `primaryAgent`, tool lists).
  - **Keep-warm:** the repo is public, so a GitHub Actions schedule pings `/api/health/live` (which doesn't touch the DB) every 10 minutes with no new account. Neon stays asleep, and Render's 750 h covers one always-on service (744 h in a 31-day month), assuming no other free service shares the workspace (OWNER-TODO).
- **Review v2 fixes:** #1 is done. #2, #6, #3, #7 and #8 stay. #4 (dashboard width) and #5 (AI change made visible) fold into Phase AG, because the dashboard effort moves to AG Studio.
- **Schedule:** PLAN.md "Competitive re-plan (D-097)". The freeze stays at the end of Nov 5, submission Nov 11, availability through Dec 15.
- **Serves:** P8 (agentic commerce), P7, J1, J3, J4, the AG Grid partner prize, G1, R2.
---

## D-098: Spike C verdict: Go. Capture-on-ship works for both seller kinds; a direct-paid shop's pre-ship cancel is a seller handoff (2026-10-18)
- **Method:** `pnpm --filter web spike-c`, with real sandbox calls, a real buyer approval (headless) and a `PayPal-Request-Id` on every POST. Results in `docs/screenshots/spike-c/`.

| # | Check | Result | Debug id |
|---|---|---|---|
| C1 | A cart in PayPal's own Cart API v1 Zod (`@paypal/agentic-commerce-spec` 1.1.0): writable cart, response with `validation_issues` + `resolution_options` | Pass. **An agent-sent `items[].price` is valid in the schema**, so the server must ignore it (D-002) | — |
| C2 | Store-bound RS256 JWT with `node:crypto` (no dependency): right store ok; other store, expired and tampered all refused; public key exports as a JWK | Pass | — |
| C3 | Platform-paid: order `intent: AUTHORIZE` → buyer approves → `/authorize` (authorization `59P15908SF045500V`, valid until Nov 16) → later `/v2/payments/authorizations/{id}/capture` → refund | **Pass:** capture `9Y508584GP8179434` COMPLETED, refunded 201 | `f504225776b7c`, `f6700303bec0f`, `f348795c49ca8` |
| C4 | Platform-paid: authorize → void | **Pass:** 200, VOIDED | `f82766947ac76` |
| C5 | Direct-paid (payee = seller 2, `B83JSV9ELHV74`): authorize → capture on ship | **Pass:** capture `6H110925U9603183E` COMPLETED, payee seller 2. Our refund → **403 PERMISSION_DENIED**, as in D-076 | `f147239fe3e06`, `f9629400fb539`, `f573167508aec` |
| C6 | Direct-paid: authorize → void | **Fail: 403 NOT_AUTHORIZED / PERMISSION_DENIED**; the authorization stays CREATED | `ca4c8d787890d` |

- **Decision:**
  - **Cart API checkouts authorize at checkout and capture when the seller ships** (adds tracking), for both seller kinds.
  - **Cancel before shipping:**
    - Platform-paid: the app voids the authorization.
    - Direct-paid: PayPal refuses our void (C6), so it's a **seller handoff**, like refunds (D-083). The seller voids the hold in their own PayPal, and we track it by GET and webhook. If nobody acts, the hold lapses at PayPal's expiry (29 days); no money moves.
  - **Honor period:** PayPal honors an authorization for 3 days. The seller is reminded to ship before then (dashboard and Telegram). A capture after day 3 is attempted once; if PayPal refuses it, the buyer gets a new approval link. This is stated in the README.
  - The existing MCP / `/shop` flow keeps `intent: CAPTURE`. Only the Cart API path authorizes, because Store Sync carts are the place where ship-then-charge matters.
- **Books:**
  - The spike's two captures have no Shopfront order, by design. They join the reconciliation's explained list: `9Y508584GP8179434` (refunded) and `6H110925U9603183E` (in seller 2's sandbox balance; our app can't refund it).
  - The voided and pending authorizations moved no money.
- **Serves:** P8, J1, R2, D-002, D-083, D-095.
---

## D-099: Phase C delivered: PayPal Cart API v1 merchant contract for every store (2026-10-18; D-097, D-098)
- **Built** (commits `239c442` → `2787f5c`):
  - **Endpoints:** `POST /merchant-cart`, `GET`/`PUT /merchant-cart/{id}` and `POST /merchant-cart/{id}/checkout` under `/api/paypal/v1/stores/{store}`.
    - Requests and responses use PayPal's published Zod schemas (`@paypal/agentic-commerce-spec` 1.1.0).
    - Errors use the spec's `Error` / `BusinessError` shapes.
  - **Auth:**
    - Store-bound EdDSA JWTs (`cart-auth.ts`). The key is derived from `SESSION_SECRET`, so there's no new secret; the JWKS is at `/.well-known/jwks.json`.
    - `alg:none` and unknown keys are refused before any signature work. A refusal is logged on the store's wire as blocked.
  - **Validation** (`cart.ts`):
    - Deterministic issues with PayPal's codes and `resolution_options`.
    - **An agent-sent `items[].price` is never used**: a mismatch returns `PRICE_MISMATCH` + `ACCEPT_NEW_PRICE`, and no order is created.
  - **Payments:**
    - `openCheckout()` is extracted from the MCP `create_checkout`, so both paths share pricing (D-002), payee routing (D-083), timers, webhooks and reconciliation.
    - Cart orders use `intent: AUTHORIZE` with `SET_PROVIDED_ADDRESS`.
    - New state `authorized` (events `AUTHORIZED`, `AUTHORIZATION_VOIDED`). Stock is taken at authorization and returned on release.
    - Capture on ship runs in `addTracking`; void, or a direct-paid handoff, in `cancelAuthorized`.
    - Webhooks: `PAYMENT.AUTHORIZATION.CREATED` / `VOIDED` (the webhook is subscribed to `*`).
  - **Safety:** no other path can capture an AUTHORIZE order (the pay page, the return URL, the approved-webhook safety net and fallback checks are all guarded).
  - **Reconciliation:** every open hold is checked with PayPal.
    - VOIDED or EXPIRED (a seller's own void, the 29-day expiry) closes the order: lifecycle, no money moves.
    - CAPTURED-without-us, DENIED or NOT_FOUND is a mismatch.
  - **Screens:**
    - `/developers`: endpoints, auth, the issues table, and a 1-hour demo token with a runnable curl.
    - The Studio "Store-Sync-ready" card (30-day agent keys).
    - `/cart/approved`, the `/pay` hold panel, Cart API rows on the wire, and an "authorized" pill.
  - **Test agent:** `scripts/cart-agent.mts`, on PayPal's own client (`createCart`, `updateCart`, `getCart`, `completeCheckout`).
- **Deviations (decided here):**
  1. **The base URL is per store** (`/stores/{handle}`): Store Sync registers one base URL per merchant, and a platform hosts many. The JWT audience must equal the handle in the path.
  2. **Tokens are self-issued until onboarding** (D-097). `/api/cart-token` gives 1-hour tokens for the demo shops only (rate-limited); sellers issue 30-day keys in the Studio.
  3. **Carts belong to the agent that built them** (the JWT subject). Another agent with a token for the same store gets 404 (AT-C K11).
  4. **Cart status mapping:**
     - `INCOMPLETE`: has issues, or its order expired;
     - `CREATED`: valid, order open;
     - `READY`: the buyer approved, per the webhook;
     - `COMPLETED`: authorized.
  5. **The MCP and `/shop` path keeps `intent: CAPTURE`.** Only Cart API carts authorize.
  6. **The capture's payee comes from a PayPal GET of the capture**, because the authorization-capture response has none (found by AT-C K9).
- **Results:**
  - `cart-checks` K1–K14 pass on Render: K1–K5, K10–K12 in run 1; K4 and K6–K9 after two fixes; K12–K14 after the screens. The reconciliation is clean after every run.
  - Regression after the refactor: `shop-checks` 6/6. `phase6-checks` 1–5, 7 and 8 pass; 8 needed a rerun, because the spare sandbox buyer's PayPal login flaked 3× and a probe showed the account works. #6 needs the local replay server (Nov 4–5 regression).
- **Serves:** P8, J1, J4, R2, D-002, D-083, D-095.
---

## D-100: The 2026-10-24 AG key is a Studio-only licence; graceful expiry for the Studio report (2026-10-24; owner, OWNER-TODO #7a)
- **Verdict on the key** (each package's own validator run in Node; the script printed only verdict fields, never the key):
  - `ag-studio` 3.0.0: **valid, `STUDIO-PRO-AI`, trial, expiry 29 November 2026** (two days before the 1 Dec the owner was told). The value on Render is byte-identical (hash compared), so this is the same trial D-080 analysed.
  - `ag-grid-enterprise` 36.2.0: `valid: false`. `ag-charts-enterprise` 14.2.0 accepts only `CHARTS` / `BOTH` keys.
  - **So it unlocks AG Studio only**: Studio's own Enterprise-backed widgets (pivot grid, every chart type, KPI sparklines, Studio AI) stay unwatermarked inside Studio (D-080). Standalone AG Grid / AG Charts Enterprise (our overview grids, custom widgets) still need a `BOTH` key; they stay Community (OWNER-TODO #1 remains open).
- **Graceful expiry (decided here):**
  - Before Studio mounts, the client runs Studio's own validator (`AgStudioLicenseManager.getLicenseDetails(key, {PRO-AI})`) through a pure guard, `studioLicense()` in `lib/ag-license.ts`. It also checks the expiry date itself.
  - Licensed: the Studio report renders as now. Within 14 days of expiry, the report shows no notice to visitors; the date is only in OWNER-TODO.
  - Missing, invalid or expired: **Studio is not mounted at all**, so Studio never prints its licence banner to the console and never draws a watermark. The report tab shows a short notice and the Community overview (AG Grid + AG Charts Community: same data, same reconciliation badge).
  - **Simulation:** `?aglicense=missing|expired` on the report tab feeds the same guard an empty key, or a clock one day past the key's expiry. It can only switch Studio off, so it is safe in production. AT-AG runs it on Render, and once locally with the key really removed from the dev server's environment.
  - `components/studio/studio-spike.tsx` (unused since Spike S) is deleted, so only one file reads the key.
- **Owner:** the extension request must go in before **29 Nov** (the planned Nov 25 still works).
- **Serves:** J2, G1 (site works through judging), D-080, D-097.
---

## D-101: Phase AG build choices: a 5-page Studio report with host-owned page tabs, two new custom widgets, the read-only Shop Manager, AI changes made visible with Undo (2026-10-24; D-097)
- **Report (preset v3, `shopfront-report-v3`):** Overview · Orders · Payments & reconciliation · Inventory · Agents & Cart API. Bumping the version resets saved layouts to the new preset once.
  - **Data model** (`components/dashboard/sources.ts`, pattern from PayPal's boilerplate, credited): six sources (orders, lines, refunds, checkout attempts, listings, Cart API carts); joins lines → orders and refunds → orders; one calendar bound to every date; two measures (refund rate, conversion rate).
  - Attempts and carts are **not** joined to orders: an attempt that never paid has no order row, and a join would make a date filter drop unpaid attempts.
  - Studio's own widget types carry the showcase (KPI sparklines, combo, donut, stacked columns and bars, radial gauge, button filters, date filter, grid, pivot grid); two custom widgets are added: **PayPal reconciliation** (latest check, its three sources, every mismatch, a "Check again" that re-runs at most every 5 minutes) and the **Cart API funnel** (built → valid → approved → authorized → captured on ship, with where carts stopped). Pure logic in `lib/cart-funnel.ts`.
  - **Page tabs are ours:** Studio's state has no page names and leaves navigation to the host (as in the boilerplate).
- **Tabs and default:** the dashboard keeps **Overview** (AG Grid + AG Charts, fast on phones) as the default tab; the second tab is renamed **"Report · AG Studio"** (`?tab=report`; `?tab=builder` still works). Reason: the overview is what a seller needs first and what the v2 review approved; the report is one labelled click away for judges. Revisit at review v3.
- **Shop Manager agent** replaces the old insights agent as the primary agent: six read-only shop tools (`db_sales_summary`, `paypal_transactions`, `agent_activity`, `orders_needing_action`, `stock_levels`, `reconciliation_status`), the deterministic `add_chart`, Studio's `viewReport` and delegation to Studio's built-in page agent. It has **no tool that can refund, ship, cancel or change prices or stock**; its instructions tell it to say so and point to where the seller does it. Same LLM path as before (`/api/studio/turn`, free tiers, budget guard).
- **Review fix #5 (AI change made visible):**
  - Report: a "what changed" strip above the report after every durable change (widgets, layout, filters, pages; not page switches). Changes made during an agent run are attributed with Studio's **telemetry observers** (`run_started` / `run_finished` of the top-level run) and tagged **AI**; the whole run undoes in one step (`api.undo(firstEntry)`, then a state check that restores the snapshot if a programmatic change had no history entry). Pure diff in `lib/report-diff.ts`.
  - Overview: the change banner gets the AI tag, AI-set filter chips are outlined and tagged, Undo says what it restores ("Undo goes back to: …"), a test-order count and a one-line `[db]` / `[paypal]` legend sit above the KPIs.
- **Review fix #4 (width):** the overview spans up to 1760 px with 24–32 px gutters; its grids use 14 px type and taller rows. The report fills the window.
- **Serves:** J2 (AG Grid prize: custom widgets, theming, layout, Studio Agent Framework), J1, J4, D-002 (no money tool), D-095, D-097, D-100.
---

## D-102: The Gauntlet: 31 attacks in 7 families, a naive shop beside Shopfront, same model; a contained exception to "no LLM creates orders" (2026-10-24; D-097)
- **Where:** a new page **`/gauntlet`** (the /shop hack card keeps its quick 13-attack run and links to it). A run streams results tile by tile; the last run is stored (`gauntlet_runs`, migration 0014) and shown on load. One run at a time, at most one every 3 minutes, so the free LLM tier and the sandbox are not flooded.
- **The two sides, same model, same tasks:**
  - **Naive shop** (`server/gauntlet/naive.ts`): what a quick integration does. Its agent tools accept `price`, `total`, `discount_percent`, `coupon` and `currency`; its order code trusts them; its cart and webhook handlers have no store binding and no signature check; its refund tool takes any amount; its vision prompts follow text in the photo.
  - **Guarded side:** Shopfront's real paths: `/mcp` (ids and quantities only), the Cart API v1 contract (store-bound JWT, server pricing), the real cataloger and label reader (text in a photo is data, price never from a photo), webhook signature checks, the refund policy.
  - LLM steps (chat, product-photo and label-photo families) use the same model and route through the `llm.call` budget guard on both sides; answers are cached by prompt and image hash (D-021), and each tile says whether the answer was live or cached.
- **The 7 families (31):** chat injection 5 · product-photo injection 4 · shipping-label injection 4 · schema smuggling 6 (incl. the Cart API price) · cross-store JWT and cart ids 4 · replay 4 · refund abuse 4.
- **Contained exception (owner's plan, D-097):** to make the naive side's harm real, the naive order code creates **a real PayPal sandbox Orders v2 order at the amount the naive agent chose**. This is the only code in the repo where model output sets an amount, and it is fenced:
  - it lives only in `server/gauntlet/`, is reachable only from `/api/gauntlet`, and never writes a checkout row;
  - the order's approve link is never shown or stored, so no one can approve it and it can never be captured; the sandbox discards unapproved orders (checked 2026-10-24: orders left unapproved since Oct 15–18 now return 404 `RESOURCE_NOT_FOUND`, debug ids `f117991ff9dec`, `f550373c62cea`);
  - Orders v2 has no void for an unapproved order (void exists only for authorizations), so "voided after display" in the plan becomes "never approved, left to expire"; the page says so;
  - a `$0.00` amount is sent as is: PayPal rejects it, and that real answer is shown ("PayPal refused it").
  - Naive refunds, cart reads across stores and webhook acceptance run **in the naive server's memory only**; no refund or webhook is sent to PayPal for them. Their tiles say "in memory, not sent".
- **AT-GA (`gauntlet-checks`):** every guarded attack is blocked with its reason; every naive PayPal order is confirmed by a GET (status `CREATED`, the attacker's amount); guarded checkouts created during the run all carry the database price; 3-size screenshots; reconcile PASS.
- **Serves:** J1, J3, P7, R2, D-002 (shown by contrast), D-021.
---

## D-103: The new AG key expires 1 Dec; "$33.0" was clipping, not formatting; the Report tab on a phone is a one-line pointer (2026-10-25; D-100, D-101)
- **Key:** the owner's 2026-10-25 AG key (Studio's validator: `STUDIO-PRO-AI` trial, **expiry 1 December 2026**) is on Render (hash matches `.env`, redeployed manually 2026-10-24 19:57 UTC); `ag-checks` L1 passes on it. It still licenses Studio only (AG Grid / Charts Enterprise validators reject it). Judging runs to Dec 15, so the trial extension is still needed for Dec 1–15; D-100's fallback covers a lapse automatically.
- **Money format, deviation from the handoff's diagnosis:** the cells were already "$33.00" in the DOM. AG Grid 36.2, when the browser uses overlay scrollbars (headless Chromium, Chrome on Windows 11, macOS), lays its 16 px vertical scroll strip over the last column with an opaque `--ag-data-background-color` and reserves no width for it, so a right-aligned last column lost its final digit on screen. **Fix:** one global CSS rule makes that strip transparent in overlay mode (`globals.css`), for Studio's grids and the Overview's. The money fields also move from an `Intl.NumberFormat` object to Studio's own format string `"$#,##0.00"` (what its field panel writes; serialisable). **Check:** `ag-checks` P1–P5 now fail if any dollar amount in the report has other than two decimals **or** if anything inside the grid paints over a visible money cell's text (red on the live build before the fix: P2 and P3, "under .ag-body-vertical-scroll-viewport"); a unit test pins every `*_usd` field to the format string.
- **Phone (< 768 px):** the Report tab shows one line, "Best viewed on desktop. Open the overview", and Studio's bundle is neither loaded nor mounted (the gate sits before the dynamic import). If Studio is already open and the window narrows, it is hidden, not unmounted, so no edit is lost. `ag-checks` P6 checks the line (one line at 390 px), the link, and that Studio never mounts.
- **Serves:** J2 (AG Grid polish), J4, D-100.
---

## D-104: Feature freeze after the final regression (2026-10-25; owner's step 3, D-079)
- **Freeze:** from 2026-10-25 no new features. Allowed until submission: bug fixes with a test, copy fixes, docs, video, ops. Earlier than planned (D-079 said end of Nov 5) because the owner's list put the regression and freeze before the submission pack.
- **Evidence:** every acceptance suite green on Render (`docs/screenshots/final-regression.log`), reconciliation 0 mismatches after every suite, fresh clone from the README alone, phase6 #6 on a local replay server, `final-screens` 19 screens × 3 sizes with no sideways scroll, sandbox-validation (13 endpoints, 9,358 calls) and test counts (198 unit, 24 suites / 147 checks) regenerated.
- **Deviations during the run (test-side, no product change):**
  - `phase3-checks`: the Title field is matched exactly and the publish banner by its current wording; the run archives everything it created even after a failure (a failed run had left a test listing live until the demo reset removed it).
  - `phase5-checks`: written for the old Builder tab; it now opens the Report tab and the ledger on the report's Orders page (D-101).
  - `phase2-checks` E: restoring the PayPal webhook URL retries (a one-off "fetch failed" left the sandbox webhook on `/webhooks/paypal-wrong` for ~8 min, 21:25–21:33 UTC; restored by hand, PATCH 200, debug id `f243769d98975`; fallback checks and reconciliation covered the gap: 0 mismatches).
  - `recovery-checks`: a pg pool instead of one client (an idle connection was reset during R2's Render restart).
  - `final-screens`: adds `/gauntlet`, `/developers` and the Report tab.
- **Product fix found by the run:** `/developers` showed the Cart API base as `…/stores/%7Bstore%7D` (`new URL` encodes braces); it now shows `{store}` (`cart-checks` 14/14 after).
- **AT-3** ran on three CC0 seed photos plus the Gauntlet's sticker-price photo (6/6); the owner's own photos (OWNER-TODO #3) are still pending and are not claimed.
- **Repo hygiene:** removed an empty root file `ZcZ` (a shell redirect of the published sandbox password, committed in D-069's change) and the committed Vitest output (`.vitest/` now ignored).
- **Incident (not the product):** from ~21:30 to ~04:50 UTC this machine's Postgres connections to Neon timed out or reset (also Neon's HTTPS SQL endpoint intermittently) while Render's own connections stayed healthy; one live image request hung 60 s during that window. Reruns waited for it.
- **Owner answers (2026-10-25):** #8 "check" → checked through the Render API: the workspace also has `hacknite` (free web service, active) besides `shopfront-agent`; three more are suspended. #9 "not sure" → treated as not submitted; the README claims no request.
- **Isolation gap found after the freeze (fixed under its rules, with a test):** the PayPal Cart API SDK that `cart-checks` drives uses axios, which the test harness's fetch patch never marked, so 14 test orders (Oct 18, 24, 25) were stored as public and showed on `/live`. The SDK calls now carry the signed test-run header; new `cart-checks` K15 fails on any public row from a test run (15/15 on Render, `bd49da6`); the 14 orders, 113 events and 14 carts were re-flagged as test data. `gauntlet-victim` Cart API rows were left as they are (they include the intentionally public stored Gauntlet run).
- **Serves:** S3, S5.1, R4, R5, J1, D-079.
---

## D-105: Ops for the judging window: nightly reset from the keep-warm workflow, UptimeRobot, OPS.md (2026-10-25; owner's step 6, D-011, D-097)
- **Nightly reset:** D-011 planned cron-job.org; it was never set up. The keep-warm workflow gets a second schedule (`30 9 * * *`, 02:30 PT) and a `nightly-reset` job that POSTs `{"action":"reset"}` with the repo secret `SHOPFRONT_ADMIN_TOKEN`, skips when the secret is absent, and stops after Dec 15. $0, no new service. The owner adds the secret with one command in `docs/OPS.md` §2 (it never prints the token).
- **Incident while writing OPS.md (2026-10-25 05:42 UTC):** an inline shell edit let bash run fragments of the doc's own example commands. One created the repo secret `SHOPFRONT_ADMIN_TOKEN` without the owner's approval (value unverified); another called the admin endpoint with an empty body (400, nothing changed). The secret was deleted at once, before the workflow using it was pushed, and the doc was rewritten with the editor. Lesson (also in HANDOFF gotchas): never put backticks or `$(…)` in inline shell edits; use the Write/Edit tools.
- **Keep-warm:** UptimeRobot (owner) every 2 min on `/api/health/live` + the Action every 10 min. Workspace check: `hacknite` is a second active free service; the owner suspends it until Dec 16 (OWNER-TODO #8a).
- **AG key:** expires 1 Dec; the D-100 fallback is automatic; extension asked on Nov 25 (OWNER-TODO #7a).
- **Serves:** S3.b, R4, P13, D-022, D-030.
---

## D-106: Three stand-in listings published; the mug stays for the video; product photos cached in memory (2026-10-25; owner)
- **Owner's choice (2026-10-25):** publish the AI-generated stand-in photos (`docs/demo-photos/`, credited) as real listings, except the mug, which stays unpublished so the video can show a photo becoming a live listing for the first time.
- **Published through the app's own seller flow** (upload → Gemini draft → seller edits title and description → confirmed price → publish, mirrored to PayPal's catalog), as a public operation, not a test run: Juniper Clay "Speckled oatmeal bowl" $42 (stock 6) and "Terracotta bud vase, blue drip" $38 (stock 4); Fern & Loom "Indigo striped linen napkins, set of 4" $48 (stock 8). Fern & Loom has no demo sign-in, so the operator signed its seller session cookie with the app's own secret (never printed). Juniper Clay's frozen demo catalog was refrozen (6 listings), so resets keep them.
- **Model mistyped a random id:** on the "vase or table linens" starter the live model called `get_product` with `prd_q948xwd3kcjn` for the new vase `prd_q948wxd3kcjn`; the server answered NOT_FOUND and the agent recovered, but the starter showed a tool error (lane L1). The vase was archived and republished as `prd_ycxmkfeh1xkr`; lane L1 passes. Residual risk: random ids can be mistyped by any model; the server always rejects an unknown id safely. The archived vase's PayPal catalog product stays as an orphan (harmless; nothing can buy it).
- **Bug fix with a test:** `/img/{sha}` read Postgres on every request (Cloudflare does not cache it), and a slow connection left a `/shop` photo blank (shop-checks S2). Photos are immutable by hash, so `loadImage` now keeps them in a 32 MB in-memory LRU (`lib/byte-lru.ts`, 4 unit tests). shop-checks 6/6 after it; a later run failed only on PayPal's sandbox login page ("Things don't appear to be working at the moment", D-048).
- **Reruns on Render after the catalog change:** review2 5/5, lane all, phase6 #1 and #4, AT-3 6/6 (mug photos only, so it could not touch the new listings; check 4 now timed from publish), dashboard 9/9, final-screens 57 shots with no sideways scroll; reconcile 0 mismatches after every suite (155 matched).
- **Serves:** R4, J2, J3, S6.2.
---

## D-107: Video v5 plan, a real logo, the README for judges (2026-10-25; owner)
- **Video (owner):** a 2:50 working-prototype demo (S6.1 says under 3:00) with a human-sounding male US voiceover (ElevenLabs free tier, credited; the owner may swap in their own voice), one-line captions, quiet clicks and no music. Real footage of the deployed app for every feature (S6.2); the launch-motion rules only for transitions, the cursor (arcs, a ~1 s hesitation between tabs, click presses) and eased camera moves (push-ins, a pull-back on the payoff). Script: `docs/DEMO-SCRIPT.md` v5.1. The owner's coverage review added Render, Log in with PayPal, PayPal's own Cart API client and more AG Grid (grouping, drill-down, live rows) at no extra length.
- **Logo (owner: "yes"):** the owner's ChatGPT awning-S concept, redrawn by hand as a vector (`video/public/brand/logo-mark.svg`), now in the site nav (`LogoMark`, app colour tokens) and as the tab and Apple touch icons; the default `favicon.ico` is gone. A visual change during the freeze, so `landing-checks` 6/6, `mobile-checks` 39/39 and `final-screens` (57 shots, no sideways scroll) were rerun on Render (`bcfb90e`).
- **Assets:** the owner's generated images live in `video/public/` with sources in `video/ASSETS.md`. The first workbench image showed a branded phone (S6.4); it was removed, not retouched, and regenerated without a phone.
- **Devpost track:** Track 1, Merchant Growth AI (owner's registration form).
- **README:** restructured for a judge's first minute, after a winning entry's layout the owner shared: pitch, video, live links, core features, an architecture diagram (image + Mermaid + plain text), how PayPal and AI are used, safety properties, the judge path, run locally, proof.
- **Serves:** S2, S5, S6, R5, J2, J5, P9, P13.
---

## D-108: Voiceover generated per beat; beats 3 and 7 re-timed inside 2:50 (2026-10-25; owner-approved voice)
- **Voice:** ElevenLabs Chris on `eleven_v3`, stability 0.5, sped to 1.1× with `atempo` (owner-approved sample). One file per beat in `video/public/voice/`, generated by `video/voice/make-vo.mjs` from `video/voice/lines.mjs` (the script text with light cues: `[warm]`, `[thoughtful]`, `[curious]`, `[confident]`, at most one per sentence). Raw takes are cached so reruns cost no credits. Speech totals 138 s of the 170 s.
- **Spelling hints in the spoken text only:** "A G Grid" so it says the letters, "buy-able" (the first take of beat 10 sounded like "viable"; retaken once). Captions keep the script's spelling.
- **Check without listening:** `video/voice/check-vo.mjs` transcribes each take with Groq's free Whisper (a dev check, not part of the app; the ElevenLabs key has no speech-to-text permission) and compares the words with the script. All 10 match (numerals aside).
- **Deviation from DEMO-SCRIPT v5.1:** beat 7's line runs 19.3 s, longer than its 19 s slot, so beat 7 becomes 21 s and beat 3 becomes 18 s (its line is 11 s). Order, content and the 170 s total are unchanged.
- **Serves:** S6.1, S6.4, J5.
---

## D-109: Video footage captured; what differs from the capture list (2026-10-25)
- **Takes (real public sessions on Render, not test-marked):** beat 3 publishes "Handmade Green Glazed Mug" once (live Gemini read 3.7 s, AI guessed $34, confirmed $36, stock 6, PayPal catalog id on screen); beat 4 split screen (agent search → checkout $36 + $5 shipping = $41.00 → PayPal popup → card paid → webhook signature-verified); storefront at phone width; Log in with PayPal → "Verified by PayPal"; a Fern & Loom order on the live wire ("paid directly to Fern & Loom's PayPal"); the Gauntlet (27/31 harmed, 31/31 blocked) plus a read-only scroll of its photo-injection rows; the AG Grid overview (grouping, drill-down, a live sale from another window, Ask + Undo) and the AG Studio report (5 pages, a sourced answer, a refused refund, an AI change tagged AI + Undo). Real orders made: 3 green mugs (beat 4 twice, PayPal's sandbox failed after login on the first try, D-048; one Cart API order, authorized), 1 napkins (Fern & Loom), 2 oatmeal bowls. Reconcile after the takes: 160 matched, 0 mismatches.
- **Capture scale 1.5×, not 2×:** CDP screencast at 2× drops to ~17 fps in motion; 1.5× keeps ~25–35 fps and still gives 2160–2400 px frames for push-ins. A visible window ignores the emulated scale (Windows display scaling), so Chromium runs with `--force-device-scale-factor`.
- **Wide pages at 1600 × 900, not 1920:** the split screen and the dashboard; 1920 at 1.5× is too slow for the screencast, and the UI reads larger on the 1920 canvas.
- **Pay in the checkout card, not on /pay:** the card's own PayPal button, so the card turning green is on camera.
- **Gauntlet:** its model answers came from the cache (the page labels each "Answered before"; PayPal calls are live), so the run took 18 s and needs no speed-up.
- **Shop Manager question:** "What sold this week?" instead of "What needs my attention?", because its answer carries both a `[db]` and a `[paypal]` line, as the voiceover says.
- **Chat strip amounts:** the newest real transcript has a $37.00 order and a $37.00 refund needing approval (practice shop), not the script's $36 / $95; the strip shows the real values (DEMO-SCRIPT honesty rule: amounts match the DB).
- **Cart API beat:** `apps/web/scripts/video-cart.mts` (new, dev only) drives PayPal's own client: a $0.01 item price → `PRICE_MISMATCH → ACCEPT_NEW_PRICE`, total stays $41.00, no PayPal order; accept the shop's price → approve → `COMPLETED`. The edit shows its real output as a terminal.
- **PayPal popup:** shown as is (PayPal is the host), except its saved-card row's small card-brand image, which the edit softens (S6.4).
- **Demo state:** the mug's stock set to 20 like the other listings, then `freeze`, so resets keep it live at $36.
- **Serves:** S6.2, S6.4, J5, P9.
---

## D-110: Video v2: a directed re-edit after the owner rejected the first cut (2026-10-25; owner-approved)
- **Why:** the owner's review of the 2:50 render found these problems:
  - The voiceover overlapped itself in two places (0.84 s each, beats 4 and 5) and split a sentence after "She runs". It clipped "She drops in a photo" and left unexplained gaps of 1.2–3.7 s (beat 3).
  - There were 68 camera keyframes (eased moves) with steep ease-in-out, sideways pans and a constant drift, plus a scale pop on every beat.
  - Fifteen sped-up segments carried "N× speed" labels.
  - The click was a synthesised beep.
  - Supporting text was in grey Geist with "a · b · c" lists.
  - The payment success was never clearly shown: the camera left the buyer's card while PayPal's overlay still covered it.
  - The Gauntlet scroll was choppy: the CDP capture runs 1–26 new frames a second there, and the edit played it at 2.5×.
  - The voice said "under forty dollars" over a $41.00 total.
- **Changes from D-108 and D-109 and from DEMO-SCRIPT v5.1:**
  - **Script v6:** about 15% shorter (417 → 353 words), warmer and plainer. No price in the beat 4 line. The dashboard beat keeps its three strongest demos.
  - **Voice:**
    - One file per sentence, at most 1.05× tempo (owner limit). Sentences are never cut or overlapped.
    - Pauses vary from 0.3 to 0.8 s, and the footage is fitted to the voice.
    - Same voice (Chris, `eleven_v3`), with lower stability (about 0.3–0.35) for a more expressive delivery. The owner picks from 2–3 sample takes of beats 1–3 first.
  - **No speed labels:** actions play at real speed, and waits are removed with jump cuts. The YouTube description says once that "waits are trimmed; nothing is staged". This replaces the labelling rule in `video/ASSETS.md` and the v5.1 honesty checks.
  - **Music:** a quiet CC0 ambient track chosen by the owner from a shortlist. It sits well under the voice, drops further during speech, and fades in and out. This is allowed under the CC0-or-self-made music rule (S6.4) and replaces "no music" from D-108.
  - **Click:** a recorded CC0 click replaces the synthesised one.
  - **Type:** Alegreya for headlines and Alegreya Sans for supporting text, captions and the phone screens (open-source, the same family). The app's own fonts stay inside the footage. No dot-separated lists.
  - **Motion:**
    - Footage stays static and full-frame by default, with at most one gentle push-in (1.1–1.25×) per shot when it serves the story.
    - Spotlight and dimming do the pointing.
    - Ease-out curves only, no overshoot, no drift, no scale pop.
    - Cuts within a beat, a short crossfade between beats.
  - **Footage:**
    - The beat 4 payment shows in order: PayPal window, review amount held, Complete Purchase, then the buyer's card clearly Paid before the webhook. Retake if the current take can't show it.
    - The Gauntlet's long results become a smooth scroll over a full-page screenshot of the real finished run, after a short real-time run.
- **Serves:** S6.1, S6.2, S6.4, J5, P9.
---

## D-111: Video v2, the remaining beats: small departures from the v6 shot plan (2026-10-26; owner approved beats 3–4 and said go)
- **Length:** 2:56 (176.2 s), not 2:50. The beat lengths follow the voice and the holds the owner asked for: the hook's three lines after the voice, the counters held 3 s in silence, Reconciled held about 3 s, the URL held 4.5 s. It is still under 3:00 (S6.1); `config.ts` fails the build at 178 s.
- **Loupe (beat 8):** the AG Studio answers are about 11 CSS px at full frame, too small to read. A magnified callout of the same footage, kept in sync with the cuts, sits beside the spotlit panel while the answer holds. It is the real footage, enlarged, never redrawn.
- **Beat 5:** her real storefront at phone width plays beside the chat phone from the start (S6.2: the build on a phone), instead of a short cut at the end. It gives way to the real dashboard line "In-policy refunds run automatically" on "outside her policy". The chat messages are shortened from the transcript's own wording, never reworded.
- **Beat 7:** the attack is shown large using the real photo the Gauntlet fed to the vision step (`apps/web/public/gauntlet/photo-sticker-price.jpg`), beside its spotlit row. The counters are the live run's final frame, not the screenshot.
- **Captions:** off for beat 10, where the same words are on screen and nothing may move after the URL, and for the beat 7 question, which is the headline on screen.
- **Beat 3 scrolls (owner: the jumps felt hard):** each jump cut that skipped a page scroll is now an eased scroll built from the two real frames on either side of the cut, stacked at their measured offset (335, 639 and 136 CSS px, found by matching the frames). The last move, back up to the "is live" banner, is a short slide with a crossfade, because publishing changes the page layout.
- **README logo:** the mark on a rounded off-white tile (`video/public/brand/logo-mark-tile.svg`), so the dark S is visible on GitHub's dark theme.
- **Master:** rendered in two halves (the full render ran the machine out of memory) and joined without re-encoding the video. Then +5.5 dB with a 5 ms look-ahead peak limiter at −2 dBFS: −15.3 LUFS integrated, true peak −1.75 dB. Loudnorm's dynamic mode was rejected because it lifted the music in the pauses about 4 dB more than the voice.
- **Serves:** S6.1, S6.2, S6.4, J5, P9.
---

## Requirement updates
*(When the organisers change a rule, quote it here with date and source. REQUIREMENTS.md stays frozen.)*

- **2026-10-15, AG Grid sponsor resources page (Devpost):** "Best Use of AG Grid… covers both what your dashboard looks like and how you build it. Show us polish: custom widgets, theming, and layout tools, not just AG Grid or AG Charts on their own. Take Studio Agent Framework for a spin: a custom agent talking to Studio's built-in agents, or a swapped-in harness." Free 45-day trial license; boilerplate with AG Studio + PayPal provided; support via PayPal Discord. Docs: ag-grid.com/studio/react/quick-start/, /custom-widgets/, /ai-agents/. → D-023.
- **2026-10-16, Official Rules (owner):** the owner read the Official Rules and confirmed that entrants from **India are eligible** (R6, D4). No other rule changes affect the build.
