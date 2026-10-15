# CLAUDE.md — Shopfront Agent (PayPal + AI hackathon)

## What this is
A hackathon entry for "Build What's Next with PayPal and AI" (Devpost). Shopfront Agent turns a social-only seller's product photos into a PayPal-backed store that AI shopping agents can buy from over MCP. The seller's own AI agent then runs post-sale operations. **Deadline: Nov 13, 2026, 01:30 IST. We submit Nov 11.**

## Read before doing anything
1. `docs/REQUIREMENTS.md`: **FROZEN** original rules, submission items and judging criteria, with IDs (R*, S*, D*, J*, P*, G*). Never edit it.
2. `docs/DECISIONS.md`: append-only decision log. **Every scope, stack or design change gets an entry first, citing requirement IDs.**
3. `docs/PLAN.md`: phases, acceptance tests, risks, cut list. Check which phase we're in.
4. `docs/ARCHITECTURE.md`: flows, data model, MCP tool schemas, guardrails.
5. `docs/STACK.md`: the stack (check whether it is PROPOSED or LOCKED).
6. `docs/SUBMISSION.md`: the live checklist. `docs/WEBINAR-NOTES.md`: official PayPal guidance in full. `docs/SETUP.md`: accounts and keys.
7. Background research: `personal research/claude web research` (idea ranking, competitor repos, risks).

## Non-negotiable rules
- **Money is moved only by deterministic code from schema-validated input.** No LLM gets a tool that creates orders, captures, refunds or adds tracking. Prices and totals come from the DB only (D-002).
- MCP tools take **IDs and quantities only**; inputs use `additionalProperties: false`. Never add a price, amount, discount or total input field.
- **$0 budget (owner rule).** LLMs are free tiers only, through the Vercel AI SDK (D-021): **Groq first for agent tool-calling and chat, Gemini only for vision** (D-038). There are no paid APIs and no Anthropic API. Every LLM call goes through the `llm.call` budget guard (cache → caps → fallback), uses `temperature: 0`, and returns Zod structured output. Model names come only from env.
- Hosting is a **Render free single service + Neon free Postgres** (D-022). Don't add services, workers or polling loops that keep the DB awake.
- PayPal: the OAuth token is fetched server-side and cached with auto-refresh. Send a `PayPal-Request-Id` on every POST. Capture the `PayPal-Debug-Id`. GET the capture before any refund. Webhooks are signature-verified and idempotent on event id. The poller is the fallback.
- **Sandbox only.** US Business and US Personal accounts. The base URL comes from env.
- Secrets live only in `.env` / Render env. Never commit, log or echo them. The client ID is the only PayPal value allowed in the browser.
- **Before writing PayPal integration code**, consult the PayPal AI Toolkit (`paypal-best-practices` skill; `/paypal:doctor`, `/paypal:explain-error`) and current docs. Don't trust memory for PayPal API shapes.
- Before writing AI SDK code, verify the API against the installed package docs (`node_modules/ai/docs/`) rather than memory. Do the same for AG Studio (ag-grid.com/studio docs and the sponsor boilerplate).
- No third-party logos or brand UIs in the product or video (S6.4).
- A phase is done only when its acceptance tests pass **on the Render deployment**.
- Honesty: never claim in the README, UI or video something the build doesn't do (e.g. settlement goes to one platform account, D-006).

## Repo layout (D-027)
```
apps/web          Next.js: UI (seller studio, AG Studio dashboard, /shop, /pay, /s/[handle]) + route handlers (/api, /mcp, /webhooks/paypal, SSE)
packages/core     money, ids, pricing engine, checkout state machine, refund policy, Zod contracts (no framework imports)
packages/db       Drizzle schema + client
packages/llm      provider-agnostic LLM adapter: cache → primary → fallback → replay; call log
packages/mcp      MCP tool contracts + handlers
scripts/          dev utilities (e.g. refresh-paypal-ai-toolkit-token.mjs)
docs/             requirements, decisions, plan, architecture
```
- Design: read `apps/web/PRODUCT.md` + `apps/web/DESIGN.md` before UI work (D-037). Tokens live in `apps/web/src/app/globals.css`; the style guide is `/design`. Craft retail for seller surfaces, live ops console for the dashboard; PayPal blue only on PayPal elements. Fraunces/Inter are banned.

## Commands
```
pnpm dev                      # Next.js dev server (apps/web) → http://localhost:3000, style guide at /design
pnpm build && pnpm start      # production build / serve
pnpm test                     # Vitest across packages (core, llm, mcp)
pnpm typecheck                # tsc in every package (web runs `next typegen` first)
pnpm lint                     # ESLint (web)
pnpm --filter @shopfront/db db:generate   # SQL migration from packages/db/src/schema.ts
pnpm --filter @shopfront/db db:migrate    # apply migrations (uses DATABASE_URL_UNPOOLED from .env)
pnpm paypal:toolkit-token     # refresh PayPal AI Toolkit sandbox token in ~/.claude/settings.json
```

## Working style for this repo
- Planning docs are the memory. When something changes, update PLAN, ARCHITECTURE or SUBMISSION and add a DECISIONS entry in the same change.
- Prefer the smallest change that passes the phase's acceptance tests. Respect the feature freeze (end of Nov 3) and the cut list.
