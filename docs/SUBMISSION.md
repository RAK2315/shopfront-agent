# SUBMISSION — live checklist

> The living tracker for everything the judges need. Tick an item only when it's verified (link or evidence).
> Every line cites its requirement ID in `REQUIREMENTS.md`.

## Day-1 admin
- [ ] Registered on Devpost for the hackathon.
- [ ] **Read the Official Rules**; confirmed eligibility from India; noted anything new in DECISIONS "Requirement updates" (R6, D4).
- [ ] Joined the PayPal Discord (G17).
- [ ] Checked the AG Grid, Render and APIMatic sponsor resource pages for licences and credits (P9, P13).

## Project (S1, R0–R8)
- [ ] PayPal is central, not bolted on (G1). The APIs actually called are listed in the README with the reason for each.
- [ ] AI is meaningful (R3). The README lists each AI component and what it decides versus what code decides.
- [ ] Everything runs on the PayPal **sandbox** (R1).
- [ ] Working prototype, not a mockup (R4, S3.x).

## Devpost form
- [ ] Project name (S7).
- [ ] Elevator pitch, 2–3 sentences (S7).
- [ ] Project story: inspiration, how built, tools, why, challenges, what's next (S7).
- [ ] Text description of features and functionality (S2).
- [ ] **Tools section**: each model or AI service and how it's used (S4). Includes Google Gemini (free tier: vision cataloging, buyer agent, ops agent, insights), Groq (fallback), Vercel AI SDK, MCP (`@modelcontextprotocol/sdk`), PayPal Agent Toolkit, AG Studio + Studio Agent Framework, Render, Neon.
- [ ] Hosted demo URL (S3.b), plus **testing notes**: sandbox buyer email and password, judge-seller login.
- [ ] GitHub repo URL (S5).
- [ ] YouTube video URL (S6.3).
- [ ] Prize categories selected: main, Agentic Commerce, PayPal + AI, Best Demo, Most Creative, Most Impactful, AG Grid, Render.

## Repository (S5)
- [ ] Public (S5.2).
- [ ] MIT `LICENSE` at the root **and visible in the About section** (S5.2).
- [ ] All source, assets, seed photos and instructions are included (S5.1).
- [ ] README: problem, demo URL, judge credentials, architecture, PayPal APIs, AI tools, local run (`docker compose up`), env vars, limitations (D-006), roadmap.
- [ ] Claude Desktop / claude.ai MCP connector snippet.
- [ ] No secrets in history (`gitleaks`).

## Functional demo (S3)
- [ ] The hosted URL works from an incognito window, on desktop and mobile (S3.b).
- [ ] A full judge path completes in under 3 minutes using only the README (AT-6).
- [ ] Local run verified on a clean machine (S3.a, D-020).
- [ ] Services stay up **through results announcement**; paid tier; DB doesn't expire (D-005).
- [ ] Sandbox buyer passwords are not changed after submission.

## Video (S6)
- [ ] Under 3:00. Target is 2:50 or less (S6.1).
- [ ] Shows the real build functioning (S6.2).
- [ ] Public on YouTube (S6.3).
- [ ] No third-party logos or UIs; music is licensed or absent (S6.4, D-015).
- [ ] Captions, readable at 1080p.

## Final
- [ ] Submitted by **Nov 11, 2026** (hard deadline Nov 13 01:30 IST) (D-004).
- [ ] Every link re-tested after submitting.
