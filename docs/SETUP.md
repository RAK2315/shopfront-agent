# SETUP — free accounts and keys (zero spend, no card on file)

> Secrets go **only** in `.env` (local) and the Render Environment tab, never in chat, code or git.
> ✔ = done and verified · ☐ = to do.

| # | Account / key | Status | `.env` keys |
|---|---|---|---|
| 1 | PayPal sandbox accounts (US Business + US Personal) | ✔ verified Oct 15 (D-034) | `SANDBOX_BUYER_EMAIL`, `SANDBOX_BUYER_PASSWORD` |
| 2 | PayPal REST app `shopfront-agent` (linked to US Business, Transaction Search on) | ✔ verified Oct 15 | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| 3 | PayPal webhook | ☐ after the first Render deploy | `PAYPAL_WEBHOOK_ID` |
| 4 | Gemini API (free) | ✔ key tested Oct 15 (D-028) | `GEMINI_API_KEY` |
| 5 | Groq (free) | ✔ key tested Oct 15 | `GROQ_API_KEY` |
| 6 | Neon Postgres (free) | ☐ paste the URLs (step 6) | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` |
| 7 | AG Studio trial key | ☐ paste the key (step 7) | `NEXT_PUBLIC_AG_LICENSE_KEY` |
| 8 | PayPal AI Toolkit (Claude Code plugin) | ☐ install + restart (step 8); token ✔ written | — |
| 9 | GitHub public repo | ☐ | — |
| 10 | Render (free web service) | ☐ | Render env |
| 11 | cron-job.org (free pinger) | ☐ before Nov 8 | — |
| 12 | Second sandbox buyer from another country (D-035) | ☐ | — |

---

## 1. Sandbox accounts ✔
- Buyer (US Personal): `sb-kaj47u53384870@personal.example.com`
- Merchant (US Business): `sb-0navv53304003@business.example.com`
- **To do:**
  - developer.paypal.com → **Testing Tools → Sandbox Accounts** → click the Personal account → **View/Edit account**.
  - Copy the password into `.env` as `SANDBOX_BUYER_PASSWORD`. The email is already filled in.
  - In the same screen, check that the **PayPal balance** is around $5,000 USD (edit it if it's 0).
- Optional: on the Business account, set the **business name** to `Juniper Clay Studio` (Edit → Business name). It shows in the approval popup.

## 2. REST app ✔
Done. Linked to the US Business account, with Transaction Search enabled (verified from the token scopes).

## 3. Webhook (after the first deploy)
1. developer.paypal.com → **Apps & Credentials** → `shopfront-agent` → scroll to **Sandbox Webhooks** → **Add Webhook**.
2. URL: `https://<your-service>.onrender.com/webhooks/paypal`. Events: **All Events**.
3. Save. Copy the **Webhook ID** → `PAYPAL_WEBHOOK_ID` (in `.env` and in Render env).

## 4–5. Gemini and Groq ✔
- Models (D-028): `GEMINI_MODEL=gemini-3.5-flash-lite`, `GEMINI_MODEL_STRONG=gemini-3.8-flash`, `GROQ_MODEL=openai/gpt-oss-120b`.
- Please check the **free quotas** once:
  - **Gemini:** https://aistudio.google.com → left menu **Usage & Billing → Rate limits** (or **Dashboard → Usage**). Send me the RPM and RPD for `gemini-3.5-flash-lite` and `gemini-3.8-flash`. These numbers aren't secret.
  - **Groq:** verified at 1,000 requests/day and 8,000 tokens/min for `gpt-oss-120b`.
- Keep billing **off** in Google Cloud for that project.

## 6. Neon: what to put in `.env`
Your screenshot shows **Connection pooling ON**. That pooled string is exactly what the app uses.

1. Neon console → your project → **Connect**.
   - Branch: `production` → Database: `neondb` → Role: `neondb_owner` → **Connection pooling ON** → **Copy snippet**.
   - Paste it as:
     ```
     DATABASE_URL=postgresql://neondb_owner:...@ep-xxxx-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     ```
2. In the same dialog, **toggle Connection pooling OFF** → copy again. The host loses `-pooler`. Paste it as:
   ```
   DATABASE_URL_UNPOOLED=postgresql://neondb_owner:...@ep-xxxx.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   Migrations use this one, because PgBouncer breaks some DDL and transaction features.
3. **Recommended:** a dev branch so local experiments don't touch the judging data.
   - Neon → **Branches → New branch** `dev` (from production).
   - Use the dev branch's two URLs in your local `.env`.
   - Use the `production` URLs only in Render. (Free allows 10 branches.)
4. **Compute guard (D-030):** Neon → **Branches → production → Compute → Edit** → set **min = max = 0.25 CU**, and leave scale-to-zero on (5 min). Do the same for `dev`.
5. Don't paste the URLs in chat. Tell me when they're in `.env`, and I'll run a connection test and the first migration.

## 7. AG Studio trial key
1. From AG Grid's trial email, copy the **whole** key string (one long line). Never paste it into docs, logs, screenshots or commits; it goes only in `.env` and Render as `NEXT_PUBLIC_AG_LICENSE_KEY`.
2. Put it in `.env` on one line: `NEXT_PUBLIC_AG_LICENSE_KEY=<whole key>`. No quotes are needed; if your editor wraps the line, make sure it stays a single line.
3. Add it to the Render env too, when we deploy.
4. The key **deactivates Nov 29, 2026**. Around **Nov 20**, email AG Grid (the contact named in your email) to ask for an extension through judging (D-032).
5. Also look on the Devpost AG Grid resources page for the "boilerplate with AG Studio and PayPal" link, and send it to me.

## 8. PayPal AI Toolkit in Claude Code
I already minted a sandbox token and wrote it to `~/.claude/settings.json` as `env.PAYPAL_SANDBOX_ACCESS_TOKEN`. It's valid until about 03:30 on Oct 16. **You do:**
1. In this Claude Code prompt, type `/plugin install paypal@claude-plugins-official`, then `/reload-plugins`.
2. **Fully quit Claude Code and reopen it** in this folder (`/clear` is not enough), so the new env var loads.
3. Type `/paypal:setup`. It should report the credentials and MCP as OK.
4. When the toolkit says **401** (after about 8–9 h), run `node scripts/refresh-paypal-ai-toolkit-token.mjs` (or `/paypal:setup refresh`), then restart Claude Code again.

## 9. GitHub
1. https://github.com/new → name `shopfront-agent` → **Public**. Don't add a README, .gitignore or license → **Create repository**.
2. `gh` is already installed on your machine. Run `gh auth login` in a terminal (GitHub.com → HTTPS → Login with a web browser).
3. Send me the repo URL. I'll push after you confirm. Then check that **MIT License** shows in the repo's About box (S5.2).

## 10. Render (free, no card)
1. https://dashboard.render.com/register → **Sign up with GitHub**. Skip any payment step; the free tier needs none.
2. Later (Phase 0/1 deploy), I'll add `render.yaml`. Then do **New + → Blueprint** → pick the repo → plan **Free** → region **Ohio (US East)**, which is close to Neon's us-east-2.
3. Paste the env vars in **Environment**, using the Neon **production** URLs.

## 11. cron-job.org pinger (turn on Nov 8, D-030)
1. https://console.cron-job.org/signup → free account → **Create cronjob**.
2. URL: `https://<your-service>.onrender.com/api/health/live`. Schedule: **every 10 minutes**. Save it **disabled** for now.
3. Enable it on **Nov 8**; it stays on through judging (PLAN §5).

## 12. Second buyer from another country (D-035, unhappy path #03)
1. developer.paypal.com → **Testing Tools → Sandbox Accounts → Create account**.
2. Choose **Personal**, Country **United Kingdom** (or Canada), then Create.
3. Note its email and password for the tests. This one isn't needed in `.env`.

## 13. Telegram bot (Phase 10, D-072): before Spike T on Oct 18
1. In Telegram, open **@BotFather**, then `/newbot`. Name: `Shopfront`. Username: something ending in `bot` (for example `shopfront_agent_bot`).
2. Copy the token into `.env` as `TELEGRAM_BOT_TOKEN=…`. Don't paste it anywhere else; Claude puts it on Render.
3. Optionally, in BotFather run `/setuserpic` (our logo) and `/setdescription` ("Run your shop from this chat. Sandbox demo: no real money moves.").
4. Claude generates `TELEGRAM_WEBHOOK_SECRET` (random) and runs `setWebhook` during the spike.
- **If the token ever leaks:** in BotFather run `/revoke`, put the new token in `.env`, and Claude re-runs `setWebhook`.

## 14. Sandbox seller 2 (Phase 9 multi-seller, D-066): before Spike M on Oct 18
developer.paypal.com → Testing Tools → **Sandbox Accounts** → **Create account** → **Business**, country **United States** → Create. Then ⋯ → **View/edit account** for the email and password. Put them in `.env` as `SANDBOX_SELLER2_EMAIL` / `SANDBOX_SELLER2_PASSWORD`.

## Local tools
- ✔ Node 24, pnpm 10, git, gh.
- ☐ **Docker Desktop** (https://www.docker.com/products/docker-desktop/). Only needed in Phase 7 to verify `docker compose up` for judges (S3.a). Not needed now, because dev runs against the Neon dev branch.

## Things only you can do
- Read the Devpost **Official Rules** and confirm India is eligible (R6).
- Join the **PayPal Discord**.
- Upload the video and submit.
