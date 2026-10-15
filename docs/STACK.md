# Tech stack — STATUS: **LOCKED** v3 (2026-10-15, owner-approved; D-039)

> v3 (2026-10-15) follows the owner's directive: **zero spend, every service on a free tier, no card on file**, and **visuals and tech depth are both top priority**. Supersedes v1 and v2. See DECISIONS D-027 to D-036.
> Free-tier facts below were verified on 2026-10-15 by live calls or official docs (marked ✔). Lock on owner approval.

## Shape: one free Render service running Next.js, plus Neon

```
Render FREE web service: one Node process, `next start`
  Next.js (App Router, React, TypeScript)
   ├─ UI: seller studio, AG Studio dashboard, /shop buyer agent, /pay, /s/[handle] storefronts (SSR + JSON-LD)
   ├─ Route handlers: /api/*, /mcp (MCP Streamable HTTP), /webhooks/paypal, /api/events (SSE)
   └─ instrumentation.ts: boots per-checkout fallback timers (no polling loop)
  packages/core   domain: money, pricing engine, checkout state machine, refund policy, Zod contracts
  packages/db     Drizzle schema + client
  packages/llm    provider-agnostic LLM adapter: Gemini → Groq → cache/replay, call log
  packages/mcp    MCP tool contracts + handlers (used by /mcp and the buyer agent)
Neon FREE Postgres
```

**Why one service (D-027):**
- Render free gives **750 instance-hours per workspace per month ✔**.
- Two always-on services need about 1,440 h, which is impossible, so Next.js + a separate Fastify service only works if both sleep. That means two ~1-minute cold starts and a split webhook path.
- Next.js route handlers on a long-lived `next start` process cover everything Fastify would: MCP, webhooks, SSE and in-process timers.
- The frontend is unchanged. Domain logic lives in framework-free packages, so a Fastify split stays a refactor, not a rewrite.

## Choices

| Layer | Choice | Why (one line) | Serves |
|---|---|---|---|
| Language | TypeScript, Node 22+ (local Node 24 ✔), pnpm workspaces ✔ | One language end to end; shared Zod contracts. | J1 |
| Frontend | **Next.js App Router + React** | SSR storefronts with JSON-LD, app-grade UI, route handlers in the same process. | J2, J4 |
| Design system | **Tailwind v4 design tokens** (CSS variables via `@theme`), `class-variance-authority`, custom components, **Motion** (Framer Motion) | A real token system plus physics-based motion for the photo→card morph and timeline packets. | J2, J5, P6 |
| Typography | **Alegreya** (serif headings), **Geist** (UI and data, tabular figures), **Geist Mono** (request IDs), via `next/font` (D-037) | Craft retail for seller surfaces, live ops console for the dashboard; one token system; neutral off-white; one clay accent; PayPal blue only on PayPal elements. | J2 |
| Dashboard | **AG Studio Pro trial ✔** (key received; expires **Nov 29, 2026**) + AG Grid ledger | Custom widgets, theming, and the Studio Agent Framework are what the AG Grid prize judges (D-023, D-032). | P9 |
| MCP | `@modelcontextprotocol/sdk`, Streamable HTTP in a route handler; same contracts in the buyer agent | One public endpoint for any MCP client. | P8, J1 |
| LLM adapter | `packages/llm`: **one interface** (`extract` vision, `object` structured output, `runTools` tool calling) on top of the **Vercel AI SDK** providers | Switching provider is a config change. Every call logs provider and model, and the timeline shows them. | R3, J1 |
| LLM vision | **Gemini free tier** (D-038: vision cataloging + label reading only), `gemini-3.5-flash-lite` ✔ (vision + JSON schema + function calling all tested; 3–11 s) | It was the fastest reliable free model in our tests. | R3 |
| LLM strong (optional) | `gemini-3.8-flash` (what `gemini-flash-latest` resolves to) ✔ works, but took **41 s and returned 503 once** on free | Offline cataloging only, with retry; never on the live chat path. | R3 |
| LLM agent + chat | **Groq free**, `openai/gpt-oss-120b` ✔ (0.6 s; tool calling tested; **1,000 req/day, 8k tokens/min**), Gemini as fallback (D-038) | Fast enough for the live split-screen; Gemini took ~12 s. | R4, P6 |
| Resilience | Cache by input hash → primary with backoff on 429/503 → fallback provider → **recorded transcript replay** | The whole demo can replay with **zero live AI calls** (D-029). | P6, J1 |
| Determinism | `temperature: 0` ✔ accepted by Gemini and Groq; Zod structured output; fixed demo photos | A reproducible demo. | J1 |
| PayPal REST | Our thin typed client (OAuth cache and refresh, `PayPal-Request-Id`, debug-id capture, call log → timeline) | Uniform logging and real request IDs in the UI. | R2, G5, G8 |
| PayPal browser | **JS SDK v6** (client-ID auth; verify on day 2) | The human-approval step. | R2, G1 |
| PayPal agent tooling | **PayPal Agent Toolkit** (`@paypal/agent-toolkit/ai-sdk`), read-only actions, for the insights agent | PayPal's own agent tooling, with no money-moving tools exposed. | P7, G12 |
| PayPal dev tooling | **PayPal AI Toolkit** plugin in Claude Code; token via `scripts/refresh-paypal-ai-toolkit-token.mjs` ✔ | Best practices, `/paypal:doctor`, `/paypal:explain-error`. | G11 |
| Database | **Neon free** ✔: 1 GB/project, **100 CU-hours/month** (about 400 h at 0.25 CU), suspends after 5 min idle, data never deleted when limits hit | Doesn't expire like Render's free Postgres. Compute pinned at 0.25 CU; nothing pings the DB. | S3.b |
| ORM / driver | Drizzle ORM + `pg` (pooled URL for the app, direct URL for migrations) | Typed schema and plain SQL migrations. | J1 |
| Background work | Webhook processing async after the 200 response; per-checkout fallback timers at +60 s, +3 min, +10 min; recovered on boot | Webhooks are primary ("Don't poll"), and the DB can sleep. | G7 |
| Realtime | SSE route handler | Live split-screen and timeline. | J2, J5 |
| Images | `sharp` resize to 200 KB or less, stored in Postgres, served at `/img/[sha]` | Render free has no disk ✔. Public `image_url` for PayPal Catalog. | R2 |
| Hosting | **Render free web service** ✔ (750 h/month per workspace; sleeps after 15 min; ~1 min cold start; no disk; no SMTP) | Public URL for webhooks; Render prize. | S3.b, P13 |
| Keep-alive | cron-job.org (free) pings `/api/health/live` (**no DB access**) every 10 min, **only in the windows set in PLAN.md** | Saves Render hours and protects Neon CU-hours. | S3.b |
| Tests | Vitest (unit and contract), Playwright (end-to-end including the sandbox popup), MCP Inspector | Phase acceptance tests. | R4, G9 |
| CI | GitHub Actions (free for public repos) | typecheck, lint, unit, injection suite. | J1 |
| Local | `pnpm dev` against a Neon **dev branch**. For judges: Docker Compose (Postgres + app). Docker isn't installed on your machine yet; it's only needed to verify S3.a in Phase 7 | No local DB install needed now. | S3.a |
| License | MIT | S5.2. | S5.2 |

## Rejected
- **Anthropic API, paid Render, any paid plan**: owner rule, zero spend.
- **Next.js + separate Fastify service**: exceeds free hours when both are warm; two cold starts.
- **Vite SPA** (D-026): the owner requires Next.js. Superseded by D-027.
- **Render free Postgres**: expires 30 days after creation, mid-judging.
- **Supabase free**: pauses after 7 days without activity, and judging can be quiet for days; Neon only suspends compute.
- **OpenRouter free models**: about 50 requests/day without credits; unreliable availability.
