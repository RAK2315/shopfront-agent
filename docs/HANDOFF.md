# HANDOFF: Shopfront Agent (written 2026-10-15, end of session "part 1")

## Where we are
- **Phase 1 (gate): DONE and confirmed by the owner.** The proof is in `docs/screenshots/phase-1/GATE-PROOF.md`.
- **Exact next step:** start **Phase 2** (`docs/PLAN.md` §1): events, webhooks, reliability.
  1. Per-checkout fallback timers in `apps/web/src/instrumentation.ts` (D-025), with the `confirmed_via` badge.
  2. An SSE route `/api/events` fed by `apps/web/src/server/events.ts` (`bus`).
  3. Live timeline v0, using `components/console/timeline.tsx`.
  4. Refund and reversal reconciliation stubs, which already exist in `server/webhooks.ts`.
  5. A 2-hour AG Studio spike.
  6. Then run AT-2, including resending a webhook from the Dashboard, a forged webhook, popup cancel and a second US buyer (D-040).
- **Do not** skip the owner's standing rules below.

## Deployed
- **URL:** https://shopfront-agent.onrender.com. Render free tier, service `srv-db8e76dg1s2s739vvv0g`, region Ohio, auto-deploy on push to `main`.
- **Repo:** https://github.com/RAK2315/shopfront-agent (public, MIT detected).
- **Live health:** `GET /api/health`, deep check of DB, PayPal token and webhook. `GET /api/health/live` is the keep-warm ping and never touches the DB.
- **Routes:**
  - `/mcp`: MCP over Streamable HTTP, stateless, JSON responses.
  - `/pay/[id]?t=`: JS SDK v6 approval page.
  - `/pay/return`: return URL for redirect-mode approvals.
  - `/api/checkouts/[id]/capture` and `/api/checkouts/[id]/status`.
  - `/webhooks/paypal`.
  - `/design`: the style guide.
- **Verified live:**
  - Agent → MCP → Orders v2 → popup approval → capture → verified webhooks → Neon `paid`.
  - MCP Inspector connect.
  - Protocol-level injection rejected.
  - Idempotency.
  - Buyer and merchant evidence of the payment.
- **Deploy:** `node scripts/render-deploy.mjs` (create or update the service, sync env, deploy, wait). Add `--webhook` to also create or reuse the PayPal webhook.

## IDs (not secrets)
| Thing | Value |
|---|---|
| Sandbox buyer (US Personal) | `sb-kaj47u53384870@personal.example.com` |
| Sandbox merchant (US Business) | `sb-0navv53304003@business.example.com`, merchant id `DY7U9FZDLKJRE`, display name "Juniper Clay Studio" (renamed by owner 2026-10-15) |
| PayPal REST app | `shopfront-agent` (`APP-0ET80889P79461507`), Transaction Search on |
| PayPal webhook | `5M73856081740924U` → `/webhooks/paypal`, events `*` (D-041) |
| Gate order / capture | `08472107251603326` / `4S9806225X591341H` |
| Gate webhook events | `WH-3PX21178M1172734P-09203140H58494013` (CAPTURE.COMPLETED), `WH-7TS05562SW8095046-2WT23330J4087021Y` (ORDER.APPROVED) |
| Seed sellers | `juniper_clay` (Juniper Clay Studio), `fern_and_loom` |
| Seed variant used by tests | `var_cobalt120000` (Cobalt drip mug $32 + $5 shipping) |
| Neon | project `shopfront`, branch `production`, PostgreSQL 18.6, 16 tables, migrations `0000`, `0001` |
| AG Studio trial | key in env; **deactivates 2026-11-29**; email for an extension around Nov 20 (D-032) |

## Env var names (values live only in `.env` and Render)
- **PayPal:** `PAYPAL_BASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- **LLM:** `LLM_MODE`, `LLM_AGENT_PROVIDERS` (=groq,gemini), `LLM_VISION_PROVIDERS` (=gemini), `GEMINI_API_KEY`, `GEMINI_MODEL` (gemini-3.5-flash-lite), `GEMINI_MODEL_STRONG`, `GROQ_API_KEY`, `GROQ_MODEL` (openai/gpt-oss-120b), `LLM_MAX_CALLS_PER_DAY`, `LLM_MAX_CALLS_PER_IP_PER_HOUR`.
- **App:** `DATABASE_URL` (pooled, `sslmode=verify-full`), `DATABASE_URL_UNPOOLED` (migrations), `APP_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_AG_LICENSE_KEY`.
- **Local only:** `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD`, `DEV_ALLOW_UNVERIFIED_WEBHOOKS`, `RENDER_API_KEY`. These are never sent to Render.

## Commands
- **Day to day:** `pnpm dev`, `pnpm test` (48 tests), `pnpm typecheck`, `pnpm lint`.
- **Database:** `pnpm --filter @shopfront/db db:generate`, then `db:migrate`.
- **Web app scripts:**
  - `pnpm --filter web seed`.
  - `pnpm --filter web buyer-agent -- --url <app>/mcp "request"`.
  - `pnpm --filter web gate -- --base <app> --headed`.
  - `pnpm --filter web phase1-checks -- --base <app>`.
- `pnpm paypal:toolkit-token` refreshes the PayPal AI Toolkit token in `~/.claude/settings.json`. **Restart Claude Code after running it.**

## Open risks and known quirks
1. **Headless PayPal popup fails.** In headless Chromium, the sandbox shows "Things don't appear to be working at the moment" after login. Run automated approval **headed** (`--headed`); the gate script already defaults to the full Chromium channel.
2. **Gemini latency.** The free tier takes ~12–14 s per call, including vision. So Groq leads for agent and chat (D-038), and Gemini is for vision only, hidden behind the card animation and cached by image hash. `gemini-3.8-flash` returned 503 once.
3. **Token expiry.** PayPal tokens last about 8–9 h. The app refreshes its own automatically. The Claude Code PayPal AI Toolkit MCP token does not: run `pnpm paypal:toolkit-token`, then restart, or use `/paypal:setup refresh`.
4. **Render cold starts.** About 1 minute after 15 minutes idle. The pinger stays **OFF** until Nov 8, then cron-job.org hits `/api/health/live` every 10 minutes (PLAN §5). Webhooks that land on a sleeping service are retried by PayPal.
5. **Neon free compute** is 100 CU-hours a month. Nothing may poll the DB; compute is pinned at 0.25 CU.
6. **Groq free limits** are 8k tokens/min and 1,000 requests/day. Keep agent histories and tool schemas small.
7. **The prompt-injection live test is weak.** The agent declined rather than checking out; add a stronger test in Phase 6.
8. **Merchant display name:** renamed to "Juniper Clay Studio" by the owner (2026-10-15). Payments made before the rename still show "Test Store".
9. **MCP client name isn't stored.** In stateless mode the client name doesn't reach later requests, so `checkouts.mcp_client_name` is null. Pass it via a header or initialize info in Phase 6.
10. **`request_refund` is honestly unimplemented.** It returns `NOT_REFUNDABLE` until Phase 4.

## Standing rules from the owner (apply to Phases 2–8)
- **Run Phases 2–8 per PLAN.md without waiting between phases**, except:
  - Commit and push at the end of **every** phase.
  - At each phase end:
    - Run the acceptance tests.
    - Save screenshots of every new screen (desktop and mobile) to `docs/screenshots/phase-N/`.
    - Give a **5-line report**: done, tests, screenshots, risks, next.
  - **Stop and ask only** for irreversible decisions, scope cuts, or anything that changes what the judges see.
  - Visual quality and real PayPal integration are **equal priority**. **Never replace a real PayPal call with a mock** to save time.
  - Update `DECISIONS.md` for **every** deviation from PLAN.md.
- **Feature freeze: end of Nov 3** (PLAN). After that, only fixes, polish, README, the judge test path and the demo script.
- **Zero spend:** free tiers only. No Anthropic API, no paid Render.
- **No tooling changes mid-build unless something breaks.** The impeccable update is declined.
- **The second-country buyer is skipped** (D-040).

## Reading order for a fresh session
1. `CLAUDE.md`: the rules and the commands.
2. `docs/HANDOFF.md`: this file.
3. `docs/REQUIREMENTS.md`: frozen; requirement IDs.
4. `docs/DECISIONS.md`: D-001 to D-042, append-only.
5. `docs/PLAN.md`: phases, acceptance tests, risks (§2 and §2b), keep-alive calendar (§5).
6. `docs/ARCHITECTURE.md` and `docs/STACK.md` (LOCKED v3).
7. `apps/web/PRODUCT.md` and `apps/web/DESIGN.md`, before any UI work.
8. `docs/screenshots/phase-1/GATE-PROOF.md`.
9. `docs/SETUP.md`, `docs/SUBMISSION.md`, `docs/WEBINAR-NOTES.md`, as needed.
