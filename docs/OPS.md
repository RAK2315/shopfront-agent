# OPS — keeping Shopfront up through judging (Nov 12 → Dec 15, 2026)

> Who: **the owner** (accounts, keys, anything in a dashboard) and **Claude Code** (diagnosis, code fixes, redeploys
> through `git push`). The live app is https://shopfront-agent.onrender.com (Render service `srv-db8e76dg1s2s739vvv0g`,
> Ohio; Neon project `shopfront`, branch `production`). No paid service is used anywhere ($0 rule).

## 1. Keep-warm (judges never wait for a cold start)

| What | Interval | Target | Owner |
|---|---|---|---|
| **UptimeRobot** (free), HTTP(s) monitor | every **2 min** | `https://shopfront-agent.onrender.com/api/health/live` | owner sets it up; alert contact = owner's email |
| **GitHub Action** `.github/workflows/keep-warm.yml` (backup) | every 10 min (GitHub may run it late) | same URL | in the repo; stops by itself after Dec 15 |

- `/api/health/live` **never touches the database** (D-030), so pings keep Render awake while Neon still suspends after 5 min idle.
- Render free sleeps after ~15 min without traffic; a cold start takes about **1 minute** (73 s measured, D-076). Two independent pingers make that rare.
- **Render hours:** the free plan gives **750 instance-hours per workspace per month**. Kept warm all month, one service uses 744 h (31-day months) or 720 h (November). That fits **only if `shopfront-agent` is the only free service running in the workspace**. If the free services together run out of hours, Render suspends all of them until the 1st.
- **Workspace check (2026-10-25, Render API):** `hacknite` is also an active free service; `faircore`, `cycleiq-api` and `ai-voice-detection-api` are suspended (no hours). **Suspended by the owner on 2026-10-25** (verified via the API), so `shopfront-agent` is the only running free service. Resume it after Dec 15 if wanted.
- **Neon free:** 100 CU-hours/month at 0.25 CU ≈ 400 h awake. Only real visits wake it (and the daily reconciliation while awake); expect well under the limit.
- GitHub disables scheduled workflows in a public repo after 60 days with no commits. The last commit lands around Nov 11, so the Action keeps running through Dec 15.

## 2. Nightly demo reset (D-105)
The shared demo seller ("Continue as Juniper Clay Studio") and Telegram judge mode are reset by `POST /api/admin/demo {"action":"reset"}` with the admin bearer token (D-011): the frozen catalog comes back, order history is kept, and `/live` shows one public row, "Demo shop reset · 4 listings restored".
- **Scheduled:** the keep-warm workflow's `nightly-reset` job runs at **09:30 UTC (02:30 PT, 15:00 IST)** through Dec 15. **It does nothing until the owner adds the repo secret** `SHOPFRONT_ADMIN_TOKEN`.
- **Owner, once:** from the repo root, with the GitHub CLI logged in, this stores the token without printing it:

  ```bash
  node --env-file=.env -e "process.stdout.write(require('crypto').createHmac('sha256', process.env.SESSION_SECRET).update('admin:demo-reset').digest('base64url'))" | gh secret set SHOPFRONT_ADMIN_TOKEN
  ```

  If `SESSION_SECRET` ever changes, run it again. To stop the nightly reset, delete the secret (`gh secret delete SHOPFRONT_ADMIN_TOKEN`).
- **Manual reset any time:** `node --env-file=.env scripts/admin.mjs '{"action":"reset"}'`.

## 3. AI free tiers and the replay fallback

| Limit | Value | What happens at the limit |
|---|---|---|
| Our daily cap | `LLM_MAX_CALLS_PER_DAY=400` | Further AI steps use the cache, then recorded replay (badged "Replayed recording") |
| Per visitor | `LLM_MAX_CALLS_PER_IP_PER_HOUR=30` | That visitor gets cached/replayed answers for the rest of the hour |
| Groq free tier | ~8k tokens/min on `openai/gpt-oss-120b` | Router falls back to Gemini (badged "Live · Gemini") |
| Gemini free tier | per-minute and per-day request caps | Vision answers are cached by image hash; past the cap, cache then replay |
| The Gauntlet | one run at a time, 3 min cooldown, ~40 calls when uncached | The stored public run is shown on load; cached answers are labelled |

- **Every PayPal call, price and total stays live** in every mode: replay only replaces model words (D-055).
- **If both providers are down for hours:** set `LLM_MODE=replay` on Render (single-key `PUT /services/{id}/env-vars/LLM_MODE`, never the bulk env PUT — OWNER-TODO #6), redeploy, and set it back to `live` afterwards.
- Model names and keys come only from env (`GROQ_*`, `GEMINI_*`). If a provider retires a model, change the env var, redeploy and run `phase6-checks --only 1,5`.

## 4. The AG Studio licence (expires **1 Dec 2026**)
- The key in Render (`NEXT_PUBLIC_AG_LICENSE_KEY`) is a Studio-only trial; Studio's validator says expiry **1 December 2026** (D-103).
- **The fallback is automatic (D-100):** with an expired key, the *Report · AG Studio* tab never mounts Studio; it shows a notice and the Community overview with the same data. No watermark, no console error. Everything else is unaffected.
- **Owner, Nov 25:** ask AG Grid for an extension through Dec 15. When the new key arrives: set it on Render (single-key PUT or the dashboard), **redeploy** (NEXT_PUBLIC_ values are baked in at build time), then run `pnpm --filter web ag-checks -- --base https://shopfront-agent.onrender.com --only L1,P` and update OWNER-TODO #7a.

## 5. What to check on Dec 1 (and weekly from Nov 12)
1. `GET /api/health` → `ok, db, paypal_token, webhook_configured` all true.
2. The Report tab at 1440 px: Studio mounted (new key) **or** the "AG Studio report is paused" notice with the overview (no new key). Either is acceptable; a watermark or a blank tab is not.
3. `/shop` purchase with the published sandbox buyer completes; the card says the webhook was verified.
4. The dashboard badge says **Reconciled with PayPal ✓** (or `pnpm --filter web reconcile -- --base …`).
5. UptimeRobot shows no outage longer than 5 min; Render "Usage" shows hours on track (< 750 by month end).
6. `/gauntlet` loads the stored run; `/live` shows recent events.
Weekly: the same list, plus Render's event log for failed deploys and Neon's compute usage.

## 6. If the site goes down

| Symptom | First check | Who | Fix |
|---|---|---|---|
| UptimeRobot alert, `/api/health/live` times out | Render dashboard: service status, last deploy, events | owner sees the alert; Claude diagnoses | If suspended for hours: confirm it's the only free service (§1). If a deploy failed: Render keeps the last good one live; fix and push. If crashed: *Manual Deploy → Deploy latest commit*. |
| `/api/health` shows `db: false` | Neon console: project `shopfront` status, compute hours | owner | Neon over its monthly limit: wait for the reset or ask Neon support; the app shows its error pages, no data is lost. |
| `paypal_token: false` | PayPal sandbox status; the REST app in the developer dashboard | owner | Credentials revoked or sandbox outage. Never rotate the sandbox buyer's password (it's published). |
| Payments stay "awaiting" | `/live` for webhook rows; PayPal dashboard → Webhooks events | Claude | Fallback checks still confirm by GET; resend from PayPal's dashboard if needed. Reconciliation will list any mismatch. |
| AI answers all "Replayed recording" | Groq/Gemini status pages; today's call count | Claude | Expected at the daily cap; recovers at midnight UTC. See §3. |
| Report tab paused | the key's expiry | owner | §4. |
| Bad deploy | Render events | Claude | Roll back: Render dashboard → the previous live deploy → *Rollback*, or `git revert` and push. |

**Contacts:** the owner is the only person with dashboard access (Render, Neon, PayPal developer, AG Grid, UptimeRobot, Telegram BotFather). Claude Code needs the repo and `.env` to diagnose and push fixes. No secret is ever pasted into an issue, a commit or a chat.

## 7. After judging (Dec 15)
The keep-warm Action stops itself. The owner may pause UptimeRobot. Nothing needs deleting: everything is sandbox and free.
