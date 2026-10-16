# HANDOFF: Shopfront Agent (updated 2026-10-16, session "part 2")

## Where we are (updated 2026-10-15, session "part 2")
- **Phase 1: DONE.** Proof: `docs/screenshots/phase-1/GATE-PROOF.md`.
- **Phase 2: DONE.** AT-2 passed on Render. Proof: `docs/screenshots/phase-2/AT-2.md`. Run it again with `pnpm --filter web phase2-checks -- --base <app>`.
- **Phase 3: BUILT, AT-3 pending.** The owner is shooting 6 real product photos plus 1 shipping label into `docs/demo-photos/` (format in D-049). Then run `pnpm --filter web phase3-checks -- --base <app> --photos ../../docs/demo-photos --injection <file> --keep`. Strip EXIF/GPS before committing the photos.
- **Phase 4: DONE.** AT-4 passed on Render. Proof: `docs/screenshots/phase-4/AT-4.md`. Re-run the label check with the real label photo.
- **Phase 5: DONE.** AT-5 passed on Render. Proof: `docs/screenshots/phase-5/AT-5.md`. Dashboard at `/studio/dashboard` (D-052, D-053).
- **Phase 6: DONE.** AT-6 passed. Proof: `docs/screenshots/phase-6/AT-6.md`. The owner still verifies the Claude Desktop / claude.ai connector from the README.
- **Phase 7: in progress.** Done: landing page `/`, README rewritten for judges, `docs/DEVPOST.md` draft, git-history secret scan (clean), Official Rules confirmed (India eligible). **Next, in order:**
  1. **Write the Phase 8 plan into PLAN.md** (D-057 says it's there; it is NOT yet): capture script (Playwright, 1920×1080), Remotion project folder and structure, caption file format, render command, beat timings for 2:45.
  2. **Rewrite `docs/DEMO-SCRIPT.md`**: it is still v0 (says "Claude reads", 2:50). Make it 2:45, Groq/Gemini, the real routes (`/shop`, `/studio`, `/studio/orders`, `/studio/dashboard`, `/live`), with caption timings that work for voice-over or TTS.
  3. **Capture-friendly screens**: a 16:9 split-screen route for the video (`/shop` left plus dashboard or `/live` right at 1920×1080), stable data (demo freeze/reset) and replay mode.
  4. **Fresh-clone verification (D-056)**: clone the public repo into a clean temp folder, follow only the README, fix anything that breaks.
  5. **Design polish pass** (`impeccable` critique/polish) on `/studio`, `/studio/orders`, `/shop`, `/s/juniper_clay`, `/live`.
  6. AT-7's idle-load check waits for the keep-warm ping (Nov 8).
- **Open owner items:**
  - The 6 demo photos and the label photo, then AT-3 and re-freezing the demo catalog (`POST /api/admin/demo {freeze}`).
  - The Claude connector check.
  - Sandbox buyer credentials into the README on submission day.
  - cron-job.org from Nov 8: keep-warm ping plus nightly reset.
  - The AG Studio trial extension email around Nov 20.
- **Admin token:** `HMAC-SHA256(SESSION_SECRET, "admin:demo-reset")`, base64url. Compute it locally; never commit it.
- New surfaces:
  - `/live`: public console.
  - `/studio`: seller studio, judge-mode sign-in.
  - `/studio/orders`: refund queue + shipping.
  - `/s/[handle]` and `/s/[handle]/[productId]`: storefront.
  - `/llms.txt`.
  - `/spike/studio`: internal AG Studio spike.

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
- **Local only:** `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD`, `SANDBOX_BUYER2_EMAIL`, `SANDBOX_BUYER2_PASSWORD`, `DEV_ALLOW_UNVERIFIED_WEBHOOKS`, `RENDER_API_KEY`, `SHOPFRONT_DISABLE_TIMERS` (set to 1 when running a local server against the shared DB). These are never sent to Render.

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
0. **Sandbox popup flakiness (D-048).** After many automated logins the sandbox sometimes refuses or won't open the popup. Use a fresh browser context per purchase and retry. Resends of fresh webhook events can take minutes.
1. **Headless PayPal popup fails.** In headless Chromium, the sandbox shows "Things don't appear to be working at the moment" after login. Run automated approval **headed** (`--headed`); the gate script already defaults to the full Chromium channel.
2. **Gemini latency.** The free tier takes ~12–14 s per call, including vision. So Groq leads for agent and chat (D-038), and Gemini is for vision only, hidden behind the card animation and cached by image hash. `gemini-3.8-flash` returned 503 once.
3. **Token expiry.** PayPal tokens last about 8–9 h. The app refreshes its own automatically. The Claude Code PayPal AI Toolkit MCP token does not: run `pnpm paypal:toolkit-token`, then restart, or use `/paypal:setup refresh`.
4. **Render cold starts.** About 1 minute after 15 minutes idle. The pinger stays **OFF** until Nov 8, then cron-job.org hits `/api/health/live` every 10 minutes (PLAN §5). Webhooks that land on a sleeping service are retried by PayPal.
5. **Neon free compute** is 100 CU-hours a month. Nothing may poll the DB; compute is pinned at 0.25 CU.
6. **Groq free limits** are 8k tokens/min and 1,000 requests/day. Keep agent histories and tool schemas small.
7. **The prompt-injection live test is weak.** The agent declined rather than checking out; add a stronger test in Phase 6.
8. **Merchant display name:** renamed to "Juniper Clay Studio" by the owner (2026-10-15). Payments made before the rename still show "Test Store".
9. **MCP client name isn't stored.** In stateless mode the client name doesn't reach later requests, so `checkouts.mcp_client_name` is null. Pass it via a header or initialize info in Phase 6.
10. **`request_refund` is implemented** (Phase 4, `server/refunds.ts`): policy engine → server-computed amount → GET capture → refund with `PayPal-Request-Id = refund-{id}`.
11. **Repeat-buyer limit vs. the demo:** the policy allows 2 automatic refunds per buyer per 30 days. Judges and test runs share the sandbox buyers, so automatic refunds will start going to the seller queue. Decide in Phase 6 (judge-mode reset or a higher demo limit).

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
