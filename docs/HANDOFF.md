# HANDOFF: Shopfront Agent (updated 2026-10-17, end of session "part 4"; the next session is "part 5")

## Completed state

**Deployed:**
- **App:** https://shopfront-agent.onrender.com (Render free, service `srv-db8e76dg1s2s739vvv0g`, Ohio, auto-deploys on every push to `main`, docs-only pushes included).
- **Repo:** https://github.com/RAK2315/shopfront-agent (public, MIT).
- **Last code commit:** `fea5ef0`. Run `git log -1` for the last commit overall (docs).

| Phase / step | Status | Proof |
|---|---|---|
| 1–2, 4–6 | ✅ Done | `docs/screenshots/phase-N/` |
| 3 Photos → catalog | Built; **AT-3 waits for the owner's photos** | (none yet) |
| 7 Polish | Done except AT-7 #2 (keep-warm, Nov 8) | `phase-7/AT-7.md` |
| 8 Video | Toolchain proven (D-062); D-062 issues are now Phase 8 tasks | PLAN Phase 8 |
| **Owner override Step 1 (Oct 17)** | ✅ All 4 fixes accepted on Render | `docs/screenshots/fixes-1/FIXES.md` |
| **Step 2 re-plan (Oct 17)** | ✅ PLAN, DESIGN, DEMO-SCRIPT v3, SUBMISSION, DEVPOST, SETUP, D-071/D-072 | — |
| 9–13 | **Planned in the new order**, not started | PLAN Phases 9–13 |

**Step 1, what changed (details in REVIEW-1 "After the fixes"):**
1. **Security (D-068):**
   - Order tokens are random or derived from the caller's idempotency key, and stored hashed. `orderTokenFor(id)` no longer exists.
   - `/pay/return` requires the creator's `t` **and** PayPal's `token` = the order id.
   - Reusing an idempotency key for other items gives `CONFLICT`. The hosted agent's keys are namespaced per buyer session.
   - The 70 pre-fix tokens were retired.
   - Tests: AT-6 #8 (10 attacks plus a real redirect return) and `apps/web/src/server/tokens.test.ts`.
2. **Judge path (D-069):**
   - The sandbox buyer login is in the README (the "Judges: pay in 60 seconds" section) and on `/pay`, as a "Judging?" box with copy chips. The box's values come from the Render env vars `SANDBOX_BUYER_EMAIL` / `SANDBOX_BUYER_PASSWORD`.
   - AT-6 #1: paid in 27 s.
3. **Isolation (D-070):**
   - `is_test` on `checkouts` and `events` (migration `0008`).
   - A request is a test run if it carries the signed header `x-shopfront-test-run` = `HMAC(SESSION_SECRET, "test-run")` (read via `next/headers`), or if the server runs with `SHOPFRONT_TEST_RUN=1`. Events with no request inherit the flag from their checkout.
   - Public pages (`/`, `/live`, `/api/events`, `/api/console/checkouts`) hide test rows. The seller views still show them (see the open item below).
   - Purge: 74 checkouts and 693 events flagged (2026-10-17T13:11:20Z), plus the REVIEW-2 judge's traffic.
   - Plain source badges: "Live · Groq", "Answered before", "Replayed recording".
   - Tests: `pnpm --filter web fixes-checks` (I1–I5).
4. **The D-062 video issues** are logged as Phase 8 tasks 1–4.

**REVIEW-2 (cold judge re-run):** J5 went from **6 to 7**, and the judge paid in about 68 s.
- Top remaining findings: the seller's Orders and Dashboard look like a test log, there are no product photos, "Answered before" reads as canned, and the dashboard answer has no figures.
- All are slotted in the PLAN review-fix lane. Evidence is in `docs/review-2/`.

## The plan from here (PLAN "Phases 9–13", D-071)

| Dates (IST) | Work |
|---|---|
| **Oct 18 (Sun)** | Review-fix lane (about 2 h): the **seller views hide `is_test` orders for the demo seller**, then seed 4–6 varied real orders; the "Answered before" legend; README "within about 20 seconds"; #3 starters; #7 hack tone. Then **Spike M** (multi-seller) and **Spike T** (Telegram), each logged as go or no-go in DECISIONS. |
| Oct 19–22 | **Phase 9: real multi-seller payouts** (Partner Referrals, payee, platform fee, Auth-Assertion refunds). Also webhook recovery (#8), the `mcp_client_name` fix, and dashboard #6 on day 1. |
| Oct 23–27 | **Phase 10: seller copilot on Telegram** (the lead story, D-072). Plus lane items #4, #11 and #9. The owner records phone footage on Oct 27. |
| Oct 28 | **Spike V** (Vault) |
| Oct 29–31 | **Phase 11: Vault reorder.** Open the sandbox disputes on **Oct 29 morning**. |
| Nov 1–2 | **Phase 12: dispute defense** |
| Nov 3 | **Phase 13: arena.** Freeze at end of day. |

- **Cut rule:** cut 13, then 12, then 11. **Phases 9 and 10 are protected** unless their own spike fails. A failed spike cuts its phase, gets logged, and is never faked.
- **Exact next step:** the review-fix lane's top item.
  - In `apps/web/src/server/orders.ts` and `dashboard.ts` (the seller queries for orders, the ledger, KPIs and the refund queue), filter `checkouts.is_test = false` unless `await isTestRun()`.
  - Check that AT-4 and AT-5 still pass, since they carry the header.
  - Then seed the varied orders as real sessions (`x-shopfront-public-view: 1` in scripts).

## IDs (not secrets)

| Thing | Value |
|---|---|
| Sandbox buyer (US Personal), **public since D-069** | `sb-kaj47u53384870@personal.example.com` (password in the README); spare buyer `sb-tuny953392663@personal.example.com` (credentials only in `.env`, unpublished) |
| Sandbox merchant (US Business) | `sb-0navv53304003@business.example.com`, merchant id `DY7U9FZDLKJRE`, "Juniper Clay Studio" |
| PayPal REST app | `shopfront-agent` (`APP-0ET80889P79461507`), Transaction Search on |
| PayPal webhook | `5M73856081740924U` → `/webhooks/paypal`, events `*` |
| Seed sellers | `juniper_clay`, `fern_and_loom` (seller 2 for Phase 9) |
| Test variant | `var_cobalt120000` (Cobalt drip mug, $32 + $5 shipping) |
| Neon | project `shopfront`, branch `production`, migrations `0000`–`0008` |
| Data-isolation cutover | `2026-10-17T13:11:20.579Z` (pass it as `fixes-checks --cutover`) |
| AG Studio trial | key in env; **expires 2026-11-29** |

## Env var names (values only in `.env` and on Render)
- **Existing:**
  - `PAYPAL_*`, `LLM_*`, `GEMINI_*`, `GROQ_*`.
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `APP_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_AG_LICENSE_KEY`.
  - **Now also on Render:** `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD`.
  - Local only: `SANDBOX_BUYER2_*`, `DEV_ALLOW_UNVERIFIED_WEBHOOKS`, `RENDER_API_KEY`, `SHOPFRONT_DISABLE_TIMERS`, and **`SHOPFRONT_TEST_RUN=1`** (for every local server that writes to the shared DB, such as replay checks).
- **New, by phase:**
  - **Phase 9:** `SANDBOX_SELLER2_EMAIL` / `SANDBOX_SELLER2_PASSWORD` (local; SETUP §14). `PAYPAL_PARTNER_MERCHANT_ID` = `DY7U9FZDLKJRE`. `PAYPAL_PARTNER_ATTRIBUTION_ID` only if the spike shows it's needed.
  - **Phase 10:** `TELEGRAM_BOT_TOKEN` (owner, BotFather; SETUP §13) and `TELEGRAM_WEBHOOK_SECRET` (generate a random one).
  - **Phase 11:** no new var; turn on Vault in the app.
  - **Phase 13:** `ARENA_COOLDOWN_SECONDS`.

## Known quirks
- **Test-run marking:** every AT or recording script must run through its `package.json` entry, which preloads `scripts/lib/test-run.ts`. Running a script with bare `node` makes its traffic public.
  - To act or look as the public from a script, send `x-shopfront-public-view: 1`.
  - `screens` deliberately has no preload: it shows the public view.
- **Shell:**
  - **Never `source .env`.** Values contain spaces and `$`, and it printed secret fragments once in part 4. Parse `.env` with Node or Python.
  - **Set Render env vars with Node, not curl in a shell.** Shell `$` expansion truncated the buyer password once.
  - In Git Bash, pass `/`-style URL paths with `MSYS_NO_PATHCONV=1` (for example `screens … / /live`).
- **Every push redeploys Render** (about 3–5 min). Don't push during an AT run or a judge review.
- **Headless PayPal popup fails:** run approvals headed. The sandbox login is sometimes flaky ("popup did not open", or the email box never appears). Re-run once before debugging (D-048). PayPal's redirect return appends `token` (the order id) and `PayerID`, as verified in AT-6 #8.
- **The stateless `/mcp` never sees `initialize` on a tool call,** so `checkouts.mcp_client_name` is always null. The fix (read the `x-shopfront-client` header) is planned for Phase 9.
- **Replay keys include the MCP tool list,** so changing any tool description invalidates the recorded demo (D-055). Re-record with `record-demo` after such a change.
- **Older quirks still apply:** Gemini latency, Groq's 8k tokens per minute, Render cold starts, the AG Studio trial ending Nov 29, `next dev` being unusable on this machine, and the repeat-buyer refund rule (2 per buyer since the last reset). Details in DECISIONS D-038, D-048, D-052, D-059 and D-061.

## Open items for the owner
1. **Before Oct 18:**
   - Create the Telegram bot (SETUP §13) and put `TELEGRAM_BOT_TOKEN` in `.env`.
   - Create sandbox seller 2 (SETUP §14).
2. **Decide on the video before Oct 27:** real Telegram footage vs S6.4 (no third-party UIs). Either crop to the conversation (the plan) or use the labelled chat-strip fallback (PLAN risk 21, DEMO-SCRIPT v3).
3. **Photos:** 6 product photos and 1 label into `docs/demo-photos/`. REVIEW-2's second finding.
4. **Before Oct 28:** enable Vault in the sandbox app.
5. **Oct 27:** record the 4 Telegram phone takes (DEMO-SCRIPT v3, "Phone footage").
6. **Optional:** rotate the spare buyer's password. Part of it was printed in the part 4 session output; it was never committed.
7. **Still open:** the Claude Desktop connector check; cron-job.org from Nov 8; the AG Grid trial email around Nov 20.

## Standing rules (owner)
- Commit and push after each step or phase.
- Acceptance tests run **on Render**.
- Screenshots at desktop, mobile and 1920×1080 go in `docs/screenshots/phase-N/`.
- A 5-line report per phase.
- Every deviation goes in DECISIONS.
- **Never mock a PayPal call.**
- Free tiers only.
- **Echo the resolved absolute path before any `rm`.**
- Feature freeze at end of Nov 3.
- Stop only for irreversible decisions, scope cuts, or changes to what judges see.
- Sub-agents only when the owner asks (the owner approved the REVIEW-2 judge).

## Docs reading order
1. `CLAUDE.md`
2. this file
3. `docs/REVIEW-1.md`, including "After the fixes" and REVIEW-2
4. `docs/PLAN.md`: Phases 9–13, the review-fix lane, Phase 8 tasks
5. `docs/DECISIONS.md`: D-068 to D-072
6. `apps/web/PRODUCT.md` and `DESIGN.md`
7. `docs/DEMO-SCRIPT.md` (v3) and `SUBMISSION.md`
8. As needed: `REQUIREMENTS.md` (frozen), `ARCHITECTURE.md`, `SETUP.md`

## Commands
- **Checks:** `pnpm test` (89 tests), `pnpm typecheck`, `pnpm lint`.
- **Acceptance:** `pnpm --filter web phaseN-checks -- --base <url>`. AT-6 takes `--only 1,…,8`.
- **Isolation:** `pnpm --filter web fixes-checks -- --base <url> --cutover 2026-10-17T13:11:20.579Z`.
- **Screenshots:** `MSYS_NO_PATHCONV=1 pnpm --filter web screens -- --base <url> --out <dir> --video / /live /shop`.
- **Re-record replay transcripts:** `pnpm --filter web record-demo -- --base <url>`.
- **Admin bearer token:** `HMAC-SHA256(SESSION_SECRET, "admin:demo-reset")`, base64url. Compute it and never print it.
