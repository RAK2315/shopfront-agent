# HANDOFF: Shopfront Agent (updated 2026-10-18 during session "part 6"; part-5 text below is kept where still true)

## Part 6 so far (2026-10-18; D-079 to D-082)
- **Owner decisions (D-079):**
  - Phase 12 is cut.
  - Phase 13 lite is half a day: the hack card grows to about 12 attacks with a pass-rate board.
  - **The freeze is at the end of Nov 5.** The video is Nov 6–10; we submit on Nov 11.
  - **Priority:** AG Grid "Best Use" = the visual richness fixes > 10 > 9 > 11 > 13.
  - Vault is enabled.
  - The owner is requesting the AG Grid Enterprise key. PLAN is re-dated.
- **Spike G, go (D-080):**
  - The Studio key (`STUDIO-PRO-AI` trial, expires Nov 29) covers only Studio's own widgets.
  - Master-detail, grid sparklines, integrated charts and the AI Toolkit need an **AG Grid + AG Charts Enterprise (`BOTH`) key** in `NEXT_PUBLIC_AG_GRID_LICENSE_KEY`, behind a no-watermark guard with Community fallbacks.
  - Never use `_STUDIO_GRID_MODULES`.
- **Webhook recovery and the agent name (D-081), all on Render** (`docs/screenshots/recovery/RECOVERY.md`):
  - a verify outage gets 503;
  - a boot and fallback sweep picks up unprocessed events;
  - a decline makes the next capture `capture-<id>-1`;
  - `/mcp` names the agent from `x-shopfront-client` or the User-Agent.
  - Migration **`0010`** is applied, so Phase 9 uses `0011` and Phase 11 uses `0012`.
- **An older bug, fixed:** `instanceof PayPalApiError` was always false on Render (cross-bundle singleton). **Use `isPayPalApiError`.**
- **Phase 10 backend (D-082), `telegram-checks` T1–T6 on Render:**
  - `telegram_updates` dedupe;
  - one-time link codes (`POST /api/seller/telegram-link`; the public demo seller needs the admin token);
  - `/start judge`;
  - `runChatAction` (refund approve and decline wired; the rest come in the Phase 10 build);
  - `judge_demo` seeded (`seed -- --only judge_demo`), `test_only`, and isolated from search and `llms.txt`.
- **Signed fault hooks** (`server/faults.ts`): `verify-unavailable`, and `capture-declined` (PayPal's own `PayPal-Mock-Response` negative testing).
- **Part 6, Part 1 (owner, after approvals; D-083):**
  - AT-5 re-run, 6/6, with a demo reset after each run.
  - `/pay` shots at three sizes (`docs/screenshots/recovery/pay-agent-name/`). Mobile scrolls 29 px sideways (an older issue, logged for the UI review).
  - **Phase 9 backend done on Render** (`phase9-checks` P1–P5 and AT-4 7/7):
    - payee routing per seller (`fern_and_loom` → seller 2, verified);
    - the refund handoff (`refund_status = handoff`, deep link, 0 refund calls);
    - seller refunds closed by webhook in 9 s, with the GET fallback proven.
  - Migration `0011`.
- **Admin actions** on `/api/admin/demo`: `set_payout`, `handoff_check`.
- **Next:** Part 2, the guided UI walkthrough with the owner (`docs/review-pack/FEEDBACK.md`). It starts when the owner says "start review". Nothing gets built until the owner approves the ranked fix list.

## Completed state

**Deployed:**
- **App:** https://shopfront-agent.onrender.com (Render free, service `srv-db8e76dg1s2s739vvv0g`, Ohio). It auto-deploys on every push to `main`, docs-only pushes included.
- **Repo:** https://github.com/RAK2315/shopfront-agent (public, MIT).
- **Last code deploy:** `78a3344`, live, with the isolation checks I1–I6 passing on it. Run `git log -1` for the latest commit.

| Phase / step | Status | Proof |
|---|---|---|
| 1–2, 4–6 | ✅ Done (AT-4 and AT-5 re-run green on Oct 17) | `docs/screenshots/phase-N/`, `fixes-2/` |
| 3 Photos → catalog | Built; **AT-3 waits for the owner's photos** | (none yet) |
| 7 Polish | Done except AT-7 #2 (keep-warm, Nov 8) | `phase-7/AT-7.md` |
| 8 Video | **Deferred (D-073)**. The toolchain is proven; tasks are logged | PLAN Phase 8 |
| Owner override Step 1 (security, judge path, isolation) | ✅ | `fixes-1/FIXES.md` |
| **Review-fix lane, Oct 18 items (D-074)** | ✅ Seller views hide test orders; starters; legend; calm hack card; insights answers with figures | `docs/screenshots/fixes-2/FIXES-2.md` |
| **UI review pack (D-073)** | ✅ 15 screens (+2 test-run views) at desktop and mobile, each with its route, purpose and message | `docs/review-pack/README.md` |
| **Spike M** | ✅ **Partial, go** (D-075, D-076) | DECISIONS |
| **Spike T** | ✅ **Go**, with the 73 s cold start measured (D-076) | DECISIONS |
| Phase 10 prep (no screens) | ✅ Price parser and chat-action check (core, 40 tests); migration `0009` (Telegram tables, `sellers.test_only`) **applied**; the `test_only` seller-view exception | `packages/core/src/price-input.ts`, `chat-action.ts` |
| Owner answers (D-076) | ✅ "Restarted" boot rows are off public views; `/spike/studio` deleted; the two registers kept | — |
| Planning (D-077, D-078) | ✅ The AG Grid "Best Use" track (protected) and the visual richness fixes are planned, with ATs, in PLAN and DESIGN | PLAN, DESIGN |

### What the spikes proved (D-075, D-076)
- **Gated by PayPal for our non-partner sandbox app:**
  - Partner Referrals onboarding: 403.
  - `platform_fees`: 422 PLATFORM_FEES_NOT_SUPPORTED.
  - A refund of another merchant's capture: 403 without `PayPal-Auth-Assertion`, 400 with it.
- **Works:**
  - Orders with `payee` = seller 2 settle into seller 2's PayPal ($35.22 net of $37).
  - Our webhook receives that order's APPROVED, CAPTURE.COMPLETED and **CAPTURE.REFUNDED** events (signature-verified). The refund event arrived 13 s after seller 2 refunded in its own PayPal.
  - The deep link `sandbox.paypal.com/activity/payment/{captureId}` opens the seller's own transaction page, with "Issue a refund".
- **Owner's pre-approved Partial path:**
  - Each seller is paid directly. **Shopfront takes no cut**, so there's no fee ledger.
  - Refunds for routed sellers are a one-tap handoff to the seller's own PayPal, tracked by webhook, with a GET of the capture as the fallback.
  - The README "Honest limitations" already says so.
- **Telegram:**
  - The bot is `@juniper_clay_copilot_bot`. The webhook is registered with its secret, and forged updates get 401.
  - Text, the phone photo through `getFile`, and buttons with callbacks all work on Render.
  - **Cold start: 73 s.** Telegram's first delivery got "Read timeout expired", and its retry landed. The update was processed once.

## The plan from here (PLAN "Phases 9–13", re-dated 2026-10-17 by D-076 to D-078)

| Dates (IST) | Work |
|---|---|
| **Oct 18 (Sun)** | **Owner reviews `docs/review-pack/`.** Me, backend only (**no new screens until the owner's feedback**): **Spike G** (1 h: can AG Studio's own grid widgets use Enterprise features under the Studio key? `ag-studio` depends on `ag-grid-enterprise` and its types mention sparklines; else the owner requests an Enterprise trial key; else the Community fallbacks, D-077). Webhook recovery (#8). The `mcp_client_name` header fix. More Phase 10 backend: the real `telegram_updates` dedupe, linking by code, the action executor. |
| Oct 19–21 | **Phase 9, the Partial path:** seller connect (email or merchant id, verified by the first capture; check "Log in with PayPal" for 30 min); `payee` routing; the refund handoff (deep link plus webhook or GET tracking); migration `0010`. AT-9. |
| Oct 22–24 | **AG Grid "Best Use"** (D-077, protected): PayPal Catalog write-back (description, category and image only: **a catalog product has no price or stock field**, per PayPal's schema), live rows, master-detail, the AI Toolkit, charts, REVIEW-1 #6. AT-G. |
| Oct 25–29 | **Phase 10: Telegram copilot, including judge mode** (`judge_demo` is a `test_only` seller), plus lane #4, #11 and #9. AT-10. |
| Oct 30–31 | **Visual richness fixes** (D-078). AT-V. |
| Nov 1 | Spike V (Vault) |
| Nov 2–3 | Phase 11 compressed to 2 days. **Freeze at end of Nov 3.** |
| **At risk** | **Phase 12 and Phase 13 have no slot.** They're the first cuts under the cut rule (13 → 12 → 11). The owner confirms. |

- **Hold:** all new screen work waits for the owner's review-pack feedback (owner, part 5). Still open from the review pack: the heading on the paid `/pay` page, and the hack button colour.
- **The video stays deferred (D-073).** `DEMO-SCRIPT.md` beat 9 still describes Partner Referrals and a fee split; it is stale and gets rewritten when the video resumes.

## IDs (not secrets)

| Thing | Value |
|---|---|
| Sandbox buyer (US Personal), **public since D-069** | `sb-kaj47u53384870@personal.example.com` (password in the README). Spare buyer `sb-tuny953392663@personal.example.com` (credentials only in `.env`) |
| Platform sandbox merchant (US Business) | `sb-0navv53304003@business.example.com`, merchant id `DY7U9FZDLKJRE`, "Juniper Clay Studio" |
| **Seller 2 (US Business, Phase 9)** | merchant id `B83JSV9ELHV74` (email and password only in `.env`); for `fern_and_loom` |
| PayPal REST app | `shopfront-agent` (`APP-0ET80889P79461507`), Transaction Search on; **not** an approved partner |
| PayPal webhook | `5M73856081740924U` → `/webhooks/paypal`, events `*` |
| **Telegram bot** | `@juniper_clay_copilot_bot`, webhook `/telegram/webhook` (a spike route until Phase 10) |
| Seed sellers | `juniper_clay` (platform account), `fern_and_loom` (→ seller 2) |
| Test variant | `var_cobalt120000` (Cobalt drip mug, $32 + $5 shipping) |
| Neon | project `shopfront`, branch `production`, migrations `0000`–`0009` |
| Data-isolation cutover | `2026-10-17T13:11:20.579Z` (pass it as `fixes-checks --cutover`) |
| AG Studio trial | key in env; **expires 2026-11-29** |

## Env var names (values only in `.env` and on Render)
- `PAYPAL_*`, `LLM_*`, `GEMINI_*`, `GROQ_*`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `APP_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_AG_LICENSE_KEY`, `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD`.
- **New in part 5, in `.env` and on Render:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (generated by `spike-t setup`).
- **New in part 5, local only:** `SANDBOX_SELLER2_EMAIL`, `SANDBOX_SELLER2_PASSWORD`.
- Local only: `SANDBOX_BUYER2_*`, `DEV_ALLOW_UNVERIFIED_WEBHOOKS`, `RENDER_API_KEY`, `SHOPFRONT_DISABLE_TIMERS`, `SHOPFRONT_TEST_RUN=1`.
- **Not needed after all:** `PAYPAL_PARTNER_MERCHANT_ID` and `PAYPAL_PARTNER_ATTRIBUTION_ID` (partner features are gated).
- Later: Phase 13 `ARENA_COOLDOWN_SECONDS` (if Phase 13 survives).

## Known quirks
- **Test-run marking:**
  - Every AT or recording script runs through its `package.json` entry (it preloads `scripts/lib/test-run.ts`).
  - `screens` and the spike scripts have no preload.
  - Send `x-shopfront-public-view: 1` to act as the public.
- **The seller views now hide test orders** (D-074), so the demo seller's Orders and dashboard are **empty for the public** until the owner's real purchases.
  - **After every AT-5 run, call the demo reset.** AT-5 #3 saves a red refund-spike alert into the saved layout.
  - The reset is `POST /api/admin/demo {"action":"reset"}` with the admin bearer token, sent as a test run.
- **Shell:**
  - Never `source .env`; parse it with Node or Python.
  - Set Render env vars with Node.
  - In Git Bash, use `MSYS_NO_PATHCONV=1` for `/` paths. **Never pass `/c/...` paths to node with it:** they resolve to `D:\c\...`. That happened once in part 5, and the owner was asked to delete the stray `D:\c\` folder.
- **Long Python heredocs in bash can fail to parse.** Write the script to the scratchpad and run the file.
- **A transient `.git/index.lock`** (an editor's git) failed one commit. Re-run; don't delete the lock while a git.exe is running.
- **Every push redeploys Render** (about 2–3 min). Don't push during an AT run or a cold-start measurement.
- **The PayPal sandbox login is flaky in headed runs** ("popup did not open", or the email box never appears). Re-run once before debugging (D-048).
- **Seller-side PayPal UI (Playwright, seller 2):**
  - Sign in at `sandbox.paypal.com/signin` (`#email`, `#btnNext`, `#password`, `#btnLogin`).
  - "Issue a refund" sits on the transaction page.
  - The refund form's amount field wasn't found by a generic selector, so PayPal defaulted to a **full** refund. Find the real selector before AT-9.
- **The stateless `/mcp` never sees `initialize`,** so `checkouts.mcp_client_name` is null (the fix is planned for Oct 18).
- **Replay keys include the MCP tool list:** never change a tool description casually (D-055).
- **The circular import** `services` → `events` → `run-context` → `services` is safe: everything is called at runtime only.
- Older quirks: D-038, D-048, D-052, D-059, D-061.

## Open items for the owner
1. **Review `docs/review-pack/README.md`** (style, plus the 2 open questions). All new screens wait for it.
2. **Spike G may need you (Oct 18):** an AG Grid Enterprise trial key (ag-grid.com trial form, or the sponsor channel in the PayPal Discord), if AG Studio's key doesn't cover the Enterprise grid features.
3. **Confirm the cuts:** Phases 12 and 13 have no slot in the re-dated plan.
4. Vault enabled in the sandbox app before **Nov 1** (moved from Oct 28).
5. One real public purchase before Nov 8, and again on Nov 11 (PLAN §5).
6. The photos (AT-3, and the visual fix #5).
7. Delete the stray folder `D:\c\` (only two duplicate PNGs).
8. Still open: the Claude Desktop connector check; cron-job.org from Nov 8; the AG Grid trial email around Nov 20.

## Standing rules (owner)
- Commit and push after each step.
- ATs run on Render.
- Screenshots at desktop, mobile and 1920×1080.
- A 5-line report per phase.
- Every deviation goes in DECISIONS.
- **Never mock a PayPal call.**
- Free tiers only.
- **Echo the resolved absolute path before any `rm`.** Part 5 slipped once, on a generated `.next/types` folder; it's reported.
- Feature freeze at end of Nov 3.
- Stop only for irreversible decisions, scope cuts, or changes to what judges see.
- Sub-agents only when the owner asks.

## Docs reading order
1. `CLAUDE.md`
2. this file
3. `docs/DECISIONS.md` D-074 to D-078
4. `docs/PLAN.md` "Phases 9–13" (the re-dated table, Phase 9 Partial, AG Grid "Best Use", Visual richness, Phase 10)
5. `docs/review-pack/README.md`
6. `apps/web/PRODUCT.md` and `DESIGN.md` (Phase 9, AG Grid, Visual richness)
7. `docs/REVIEW-1.md` (incl. REVIEW-2), `SUBMISSION.md`
8. As needed: `REQUIREMENTS.md` (frozen), `ARCHITECTURE.md`, `SETUP.md`

## Commands
- **Checks:** `pnpm test` (132 tests), `pnpm typecheck`, `pnpm lint`.
- **Acceptance:** `pnpm --filter web phaseN-checks -- --base <url>` (AT-4 needs `--label <photo>`; AT-5 and AT-6 take `--only`).
- **Isolation:** `pnpm --filter web fixes-checks -- --base <url> --cutover 2026-10-17T13:11:20.579Z`.
- **Review-fix lane:** `pnpm --filter web lane-checks -- --base <url>` (starters, the hack card, the legend).
- **Review pack (stateful screens, headed PayPal):** `pnpm --filter web review-pack -- --base <url>`.
- **Spikes:** `pnpm --filter web spike-m`, `spike-m2` (seller 2), `spike-t -- setup|info`.
- **Screenshots:** `MSYS_NO_PATHCONV=1 pnpm --filter web screens -- --base <url> --out <dir> [--video] [--seller juniper_clay] [--settle 9000] <paths>`.
- **Re-record replay transcripts:** `pnpm --filter web record-demo -- --base <url>`.
- **Admin bearer token:** `HMAC-SHA256(SESSION_SECRET, "admin:demo-reset")`, base64url. Never print it.

---

## Part 7: autonomous run to feature-complete (2026-10-18, D-085…D-092)

**The owner's instruction (D-085):**
- Build every remaining item in order, each with ATs on Render, screenshots, a commit, DECISIONS and a 5-line PROGRESS report. Don't stop between items.
- Stop only for irreversible decisions, feature cuts, impossible PayPal capabilities, or security issues.
- Owner waits go to `docs/OWNER-TODO.md`.

**Done (see `docs/PROGRESS.md`):**
- #13/#12 the approval bug and dead ends (D-086);
- #1 photos and #2 demo history (D-087);
- #4 /shop (D-088);
- #3 the dashboard (D-089);
- #9 studio, #6 landing, #7 live and #11 mobile (D-090);
- #5 the hack card (D-091);
- #10 Phase 9 screens + Log in with PayPal, built but gated (D-092; owner Return URL, OWNER-TODO #4);
- #8 + Phase 10, the Telegram copilot (D-092).

**Remaining:**
- the `telegram-flow-checks` result;
- #13 README (written, commit pending);
- #14 the final regression: every AT, the isolation checks, the security suite, a fresh clone, `final-screens`.

**AT scripts (all under `apps/web/scripts`, run as `pnpm --filter web <name> -- --base https://shopfront-agent.onrender.com`):**
- `approval-checks`, `shop-checks`, `dashboard-checks`, `studio-checks`, `landing-checks`, `live-checks`, `mobile-checks`, `hack-checks`;
- `telegram-flow-checks`, `connect-checks`, `final-screens`;
- plus the older `phase2/4/5/6/9-checks`, `recovery-checks`, `telegram-checks`, `fixes-checks`, `lane-checks`;
- `cart-checks` (AT-C, K1–K14), `cart-agent` (PayPal's Cart API client as a buyer agent), `spike-c`;
- `reconcile-checks` (the badge) and `reconcile` (the bare check). Every suite above also ends with `reconcile --settle` by itself (the preload, D-095); `AT_RECONCILE=0` skips it.

**Habits from this run:**
- Run `pnpm typecheck 2>&1 | grep "error TS"`, because `pnpm -s typecheck` hides errors and a Render build failed that way. Run `pnpm --filter web build` before pushing **and check its exit code**: `next build` also type-checks `scripts/`, and a grep for "Compiled successfully" hides a later type-check failure (a Render build failed that way on 2026-10-18).
- `docs/**` pushes no longer deploy (Render build filter).
- Never push during an AT run.
- Delete files only with `node scripts/safe-rm.mjs`.
- Admin calls: `node --env-file=.env scripts/admin.mjs '<json>'` (reset, freeze, sync_catalog, set_payout, connect_url, tg_photo).

**Part 7 later (2026-10-18 evening, D-093/D-094):**
- The final regression is all green (`docs/screenshots/final-regression.log`). Log in with PayPal is live; `connect-checks` passes 7/7.
- When this machine has no interactive desktop, run the ATs with `AT_HEADLESS=1`.
- `/api/health` shows `booted_at`.
- Don't use `scripts/render-deploy.mjs` as is: its env PUT replaces all of Render's variables. For one key, use the single-key `PUT /services/{id}/env-vars/{key}` call.
- Next: review v2 on the owner's "start review v2" (`docs/review-pack/REVIEW-V2.md`).

**Reconciliation (D-095, 2026-10-18 night):**
- `src/server/ledger.ts` compares PayPal's captures with our orders (pure rules in `packages/core/src/ledger-check.ts`). It runs on boot, daily, from a stale dashboard, at once when a capture webhook conflicts with a cancelled order, and at the end of every AT suite.
- A capture with no order by design goes in `EXPLAINED_CAPTURES` with its decision (today only the D-076 spike), never hidden.
- Refunding a stray capture: admin action `refund_stray` (`{checkout_id, note}`). It goes through `executeRefund` and is idempotent.
