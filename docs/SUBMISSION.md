# SUBMISSION — live checklist

> Everything the judges need, each line citing its requirement id in `REQUIREMENTS.md` (frozen).
> **[x]** verified (evidence in brackets) · **[ ] OWNER** only the owner can do it · **[ ] VIDEO** waits for the video (Nov 6–10).
> Final 2026-10-25, after the final regression and the feature freeze (D-104). Only OWNER and VIDEO items remain.

## Admin
- [ ] **OWNER** Registered on Devpost for the hackathon (S1).
- [x] Read the Official Rules; entrants from India are eligible (R6, D4). *(owner, 2026-10-16)*
- [ ] **OWNER** (optional) Joined the PayPal Discord (G17).
- [x] AG Grid sponsor resources read; AG Studio trial key in use, expires 1 Dec; extension asked on Nov 25 (P9; OWNER-TODO #7a, D-103).
- [x] Render workspace: `hacknite` suspended by the owner; `shopfront-agent` is the only running free service, so keep-warm fits the 750 h month (P13; verified 2026-10-25 via the Render API).
- [ ] **OWNER** UptimeRobot monitor on `/api/health/live` every 2 min (`docs/OPS.md`).

## Project (S1, R0–R8)
- [x] PayPal is central, not bolted on (R0, R2, G1). *(README "PayPal APIs used": 9 APIs, each with its use)*
- [x] AI is meaningful (R3, R8). *(README "Tools used"; DEVPOST "Tools")*
- [x] Sandbox only (R1). *(env refuses non-sandbox base URLs; README "Honest limitations")*
- [x] Working prototype, not a mockup (R4, S3.x). *(final regression on Render, all green: `docs/screenshots/final-regression.log`, D-104)*
- [x] Documented for judges (R5). *(README top section, threat model, sandbox validation, development with AI)*
- [x] New project built during the hackathon (R7, S8). *(first commit 2026-10-15)*

## Devpost form (S2, S4, S7) — text ready in `docs/DEVPOST.md`
- [x] Project name: Shopfront Agent (S7).
- [x] Elevator pitch, 197 of 200 characters (S7).
- [x] Project story: inspiration, what it does, how built, challenges, accomplishments, learned, what's next (S7).
- [x] Text description of features and functionality (S2). *(DEVPOST "What it does"; every line has a passing check)*
- [x] Tools section: each model or AI service and how it's used (S4).
- [x] "Built with" tags.
- [x] Judge testing notes: demo URL, sandbox buyer, the 60-second path, Telegram judge mode, MCP URL (S3.b).
- [ ] **OWNER** Paste the text into Devpost; add the YouTube link (S6.3) and the repo link (S5).
- [ ] **OWNER** Prize categories: main, Best Use of Agentic Commerce, Best Use of PayPal + AI, Best Demo Delivery, Most Creative, Most Impactful, Best Use of AG Grid, Best Use of Render (P1–P9, P13).
- [ ] **OWNER** One real public purchase on Nov 11 before submitting, so `/live` isn't empty for the first judge (PLAN §5).

## Repository (S5)
- [x] Public on GitHub: https://github.com/RAK2315/shopfront-agent (S5, S5.2).
- [x] MIT `LICENSE` at the root, detected by GitHub and shown in the About panel (S5.2). *(GitHub API: `license: MIT`, 2026-10-25)*
- [ ] **OWNER** (suggested) Set the About panel's website to the demo URL and add topics (`paypal`, `mcp`, `ai-agents`, `ag-grid`, `hackathon`).
- [x] All source, seed photos (CC0, credited), migrations and instructions included (S5.1). *(fresh clone, below)*
- [x] README: problem, demo URL, judge credentials and path, criteria table, APIs, tools, guardrails, limitations, local run, credits (R5).
- [x] MCP connector instructions for Claude and other clients.
- [x] No secrets in history (2026-10-15 scan of `git log -p` for every `.env` value: 0 hits); `.env` is ignored.

## Functional demo (S3)
- [x] Hosted URL works (S3.b). *(final regression on Render; `final-screens` at desktop, 1920 and mobile)*
- [x] Fresh clone from the README alone builds and runs (S3.a). *(2026-10-25: install, migrate, seed on a throwaway DB, `pnpm test` 198/198, `pnpm build`, `pnpm start`: health ok, MCP search, 8 pages 200)*
- [x] Judge path under 3 minutes (AT-6 #1). *(phase6-checks, final regression)*
- [x] Test runs never show on public views (isolation, `fixes-checks` I1–I6).
- [ ] **OWNER** Hosted URL checked from an incognito window on the owner's own phone and laptop.
- [x] Up through judging (Dec 15): keep-warm Action every 10 min + UptimeRobot (owner) + the AG key fallback; see `docs/OPS.md`.
- [ ] **OWNER** Never change the published sandbox buyer's password after submitting.

## Video (S6) — Nov 6–10
- [x] Under 3:00: 2:50.05, 5,100 frames at 30 fps (S6.1; `docs/DEMO-SCRIPT.md` v5.1, D-108) [`video/out/shopfront-agent-demo.mp4`, ffprobe].
- [x] Shows the real build working (S6.2): real takes of the deployed app for every feature beat (D-109).
- [ ] **OWNER** Upload `video/out/shopfront-agent-demo.mp4` to YouTube as Public, credit "Voice: ElevenLabs" in the description (S6.3); then add the link to README, DEVPOST and here.
- [x] No third-party marks or brand UIs beyond the host and sponsor tools used; no music (S6.4). The chat beat is a rebuilt strip from a real transcript, labelled; the card-brand image in PayPal's popup is blurred. Voice credit for the YouTube description: "Voice: ElevenLabs".
- [x] Captions readable at 1080p: one line, 36 px Geist on a dark pill (stills checked, `video/out/stills/`).

## Final
- [ ] **OWNER** Submitted by **Nov 11, 2026** (binding deadline Nov 13, 01:30 IST; D2, D3).
- [ ] **OWNER** Every link re-tested after submitting.
