# HANDOFF: Shopfront Agent (updated 2026-10-16, end of session "part 3"; the next session is "part 4")

## Completed state

**Deployed:**
- **App:** https://shopfront-agent.onrender.com (Render free, service `srv-db8e76dg1s2s739vvv0g`, Ohio, auto-deploys on push to `main`).
- **Repo:** https://github.com/RAK2315/shopfront-agent (public, MIT).
- **Last code commit:** `eb76f15`, which Render serves.
- **Last commit overall:** the docs commit that adds this file. Run `git log -1`.

| Phase | Status | Proof |
|---|---|---|
| 1 The gate | ✅ Done | `docs/screenshots/phase-1/GATE-PROOF.md` |
| 2 Webhooks and reliability | ✅ Done | `docs/screenshots/phase-2/AT-2.md` |
| 3 Photos → catalog | Built; **AT-3 waits for the owner's photos** | (none yet) |
| 4 Seller ops | ✅ Done | `docs/screenshots/phase-4/AT-4.md` |
| 5 AG Studio dashboard | ✅ Done | `docs/screenshots/phase-5/AT-5.md` |
| 6 Buyer agent and guardrails | ✅ Done, plus **#7 compromised-agent test** and **#6 replay re-run** (D-061) | `docs/screenshots/phase-6/AT-6.md` |
| 7 Polish, docs, hardening | Done except AT-7 #2 (keep-warm, Nov 8) | `docs/screenshots/phase-7/AT-7.md` |
| 8 Video | Plan in PLAN.md; **toolchain proven** with a 20 s Remotion render (D-062) | `docs/screenshots/phase-7/video-test-clip.mp4` |
| 9–13 | **Planned** (PLAN.md, DESIGN.md, D-063 to D-067) | (not started) |

**Verified live on Render:**
- The full agent → MCP → Orders v2 → popup approval → capture → verified-webhook loop.
- Fallback checks, refunds (automatic and queued), tracking, Catalog mirroring (all 4 seed listings are now in the PayPal catalog), Transaction Search insights, AG Studio dashboard, `/capture` split screen.
- **AT-6 #7:** a real model sending injected money fields was rejected; an injected quantity was priced by the server ($101 in our DB = $101 on the PayPal order).
- Replay with no AI keys (11/11 AI steps replayed or cached; PayPal calls live).
- A fresh clone that follows only the README (D-059).

## REVIEW-1 (`docs/REVIEW-1.md`)

Five fresh-context judge agents scored the build:

| Criterion | Score |
|---|---|
| J1 Technological implementation | 8 |
| J2 Design | 7 |
| J3 Potential impact | 6 |
| J4 Innovation | 5 |
| J5 Presentation | 6 |
| **Average** | **6.4** |

**Fixes planned as Phase 9** (REVIEW-1 numbering):
1. **#2 Token leak (confirmed, HIGH).** `/pay/return` mints an order token for any checkout id.
2. **#1 Sandbox buyer credentials** in the README and on `/pay`. **Needs the owner's OK.**
3. **#3 Dead suggested prompt** ("housewarming" returns nothing).
4. **#7 Hack-demo result tone.**
5. **#4 Noisy live feeds:** collapse repeats, scope the feed to the session, plain source words, one timezone.
6. **#6 Dashboard as the seller's view.**
7. **#8 Webhook recovery.**
8. **#11 Orders grouping and one page frame.**
9. **#5 Real photos.**
10. **#9 "Who and why" story.**

## Plan: Phases 9–13 (PLAN.md, D-063)

**Order (spikes first), all inside the Nov 3 freeze:**

| Dates | Work |
|---|---|
| Oct 17–19 | Phase 9: review fixes |
| Oct 20 | **Spike V:** Vault plus a merchant-initiated order |
| Oct 21 | **Spike M:** Partner Referrals, payee routing, fee, Auth-Assertion refund |
| Oct 22–25 | Phase 10: agent reorder with Vault |
| Oct 26–29 | Phase 11: dispute defense (open sandbox disputes on Oct 26 morning) |
| Oct 30–Nov 1 | Phase 12: multi-seller payouts |
| Nov 2–3 | Phase 13: adversarial arena; freeze at end of Nov 3 |

**Rules for these phases:**
- **Cut order** if a phase slips more than 1 day: 13 → 12 → 11 → 10.
- A failed spike cuts its phase, gets logged, and is never faked.
- No feature work before AT-9 passes on Render.

**Exact next step:** start Phase 9 with **REVIEW-1 #2, the `/pay/return` token leak.**
1. Require PayPal's `token` query to equal the checkout's `paypal_order_id`.
2. Stop minting the order token there.
3. Hash checkout ids for display in `/api/events` and `/live`. Keep a server-side hash → id map for the follow filter (PLAN 9.1).

Then do #1 (once the owner decides), #3 and #7 the same day.

## IDs (not secrets)

| Thing | Value |
|---|---|
| Sandbox buyer (US Personal) | `sb-kaj47u53384870@personal.example.com`; spare buyer `sb-tuny953392663@personal.example.com` (credentials only in `.env`) |
| Sandbox merchant (US Business) | `sb-0navv53304003@business.example.com`, merchant id `DY7U9FZDLKJRE`, display name "Juniper Clay Studio" |
| PayPal REST app | `shopfront-agent` (`APP-0ET80889P79461507`), Transaction Search on |
| PayPal webhook | `5M73856081740924U` → `/webhooks/paypal`, events `*` |
| Seed sellers | `juniper_clay`, `fern_and_loom` |
| Test variant | `var_cobalt120000` (Cobalt drip mug, $32 + $5 shipping) |
| Seed listings in the PayPal catalog | `prd_cobaltdrip00`, `prd_speckledmug0`, `prd_ashbowl00000`, `prd_budvases0000` |
| Neon | project `shopfront`, branch `production`, migrations `0000`–`0007` |
| AG Studio trial | key in env; **expires 2026-11-29** |
| Render service | `srv-db8e76dg1s2s739vvv0g` |

## Env var names (values only in `.env` and on Render)

**Existing:**
- **PayPal:** `PAYPAL_BASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- **LLM:** `LLM_MODE`, `LLM_AGENT_PROVIDERS`, `LLM_VISION_PROVIDERS`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_MODEL_STRONG`, `GROQ_API_KEY`, `GROQ_MODEL`, `LLM_MAX_CALLS_PER_DAY`, `LLM_MAX_CALLS_PER_IP_PER_HOUR`.
- **App:** `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `APP_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_AG_LICENSE_KEY`.
- **Local only:** `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD`, `SANDBOX_BUYER2_EMAIL`, `SANDBOX_BUYER2_PASSWORD`, `DEV_ALLOW_UNVERIFIED_WEBHOOKS`, `RENDER_API_KEY`, `SHOPFRONT_DISABLE_TIMERS`.

**New, by phase:**

| Phase | Var or setting | Where to get it |
|---|---|---|
| 10 | **No new env var.** Turn on the **Vault** feature. The client token is minted from the existing client id and secret. | developer.paypal.com → Apps & Credentials → **Sandbox** → `shopfront-agent` → Features → tick "Save payment methods" / Vault → **Save** (allow about 10 min to apply) |
| 12 | `PAYPAL_PARTNER_MERCHANT_ID` (= our sandbox business merchant id, `DY7U9FZDLKJRE`) | sandbox.paypal.com, logged in as the business account → Account settings → Business information → "PayPal Merchant ID" |
| 12 | `PAYPAL_PARTNER_ATTRIBUTION_ID` (optional BN code; only if the spike shows it's needed) | Issued by PayPal to approved partners. Leave unset in sandbox unless asked. |
| 12 (local only) | `SANDBOX_SELLER2_EMAIL`, `SANDBOX_SELLER2_PASSWORD` | developer.paypal.com → Testing Tools → **Sandbox Accounts** → Create account → **Business**, country **United States** → Create; then ⋯ → View/edit account for the password |
| 13 | `ARENA_COOLDOWN_SECONDS` (not secret, default 600) | none |

## Known quirks (details in `docs/DECISIONS.md` and in the session notes in the OS temp folder)
- **Headless PayPal popup fails:** always run approvals **headed** (`channel: "chromium"`). The popup sometimes won't open after many logins; retry with a fresh context and a reload (D-048). The scripts already do this.
- **Gemini latency** is about 12–14 s per call. Groq is primary for agents and chat; Gemini is for vision and big Studio turns (D-038, D-052). Groq's free limit is 8k tokens/min.
- **PayPal AI Toolkit token** (for Claude Code's PayPal MCP): run `pnpm paypal:toolkit-token`, then **fully restart Claude Code**. It was last refreshed 2026-10-16 and expires about 22:55 that day. The app refreshes its own tokens.
- **Render cold starts** take about 1 min after 15 min idle. The keep-warm ping is **OFF until Nov 8**, then cron-job.org hits `/api/health/live` every 10 min, plus a nightly `POST /api/admin/demo {reset}`.
- **AG Studio trial ends Nov 29.** Email AG Grid for an extension around Nov 20.
- **Local server:** `next dev` is unusable on this Windows machine. Use a production build, `SHOPFRONT_DISABLE_TIMERS=1`, port 3000. The root `.env` now loads automatically (D-059). **A local server writes to the shared production database**, including public events.
- **Repeat-buyer refund rule:** 2 automatic refunds per buyer since the last demo reset. Reset before any refund demo or replay (D-061).

## Open items for the owner
1. **Photos:** 6 product photos and 1 shipping label, into `docs/demo-photos/`. Then AT-3, freeze the catalog again (this also mirrors listings to PayPal), and add the README row.
2. **Decision:** publish the sandbox buyer credentials now (REVIEW-1 #1) or on submission day (D-034).
3. **Before Spike V (Oct 20):** enable Vault in the sandbox app (click path above).
4. **Before Spike M (Oct 21):** create seller 2 (a US sandbox Business account). Optionally ask in the PayPal Discord whether sandbox partner referrals and platform fees work without partner approval.
5. **Restart Claude Code** to load the refreshed toolkit token.
6. **Official Rules:** done (2026-10-16, India eligible). Re-read only if the organisers post updates.
7. **Still open from before:** the Claude Desktop / claude.ai connector check; cron-job.org from Nov 8; the AG Grid trial email around Nov 20; buyer credentials on submission day if not published earlier.

## Standing rules (owner)
- Commit and push at the end of every phase.
- Acceptance tests run **on Render**.
- Screenshots at desktop, mobile **and 1920×1080** go in `docs/screenshots/phase-N/`.
- Give a 5-line report per phase: done, tests, screenshots, risks, next.
- Stop only for irreversible decisions, scope cuts, or changes to what judges see.
- Visual clarity and real PayPal integration are **equal priority**.
- **Never mock a PayPal call.**
- Every deviation goes in `DECISIONS.md`.
- Free tiers only: Groq or Gemini through the `llm` router, Render free, Neon free. No Anthropic API.
- **Feature freeze at end of Nov 3.**
- No tooling changes mid-build unless something breaks.

## Docs reading order
1. `CLAUDE.md`
2. `docs/HANDOFF.md` (this file)
3. `docs/REVIEW-1.md`
4. `docs/PLAN.md`: Phases 9–13, Phase 8, §2 risks, §3 cut list, §5 calendar
5. `docs/DECISIONS.md`: D-058 to D-067 are new this session
6. `apps/web/PRODUCT.md`, then `apps/web/DESIGN.md` (its Phases 9–13 section) before any UI work
7. `docs/DEMO-SCRIPT.md` (v2), `docs/SUBMISSION.md`
8. `docs/REQUIREMENTS.md` (frozen), `docs/ARCHITECTURE.md`, `docs/STACK.md`, `docs/SETUP.md`, as needed

## Commands
- **Checks:** `pnpm test` (80 tests), `pnpm typecheck`, `pnpm lint`.
- **Acceptance:** `pnpm --filter web phaseN-checks -- --base <url>`. AT-6 adds `--only 7` (the compromised agent).
- **Re-record the AI transcripts** after any prompt change: `pnpm --filter web record-demo -- --base <url>` (D-061).
- **Screenshots:** `pnpm --filter web screens -- --base <url> --out <dir> [--seller juniper_clay] [--video] <paths>`.
- **Video:**
  - Install: `cd video && pnpm install --ignore-workspace`.
  - Capture: `node capture/capture.mts --beat split-shop`.
  - Render: `pnpm render:test`.
- **Admin:** the demo reset/freeze bearer token is `HMAC-SHA256(SESSION_SECRET, "admin:demo-reset")`, base64url. Compute it locally and never print it.
