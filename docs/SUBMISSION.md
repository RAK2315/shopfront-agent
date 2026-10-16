# SUBMISSION — live checklist

> The living tracker for everything the judges need. Tick an item only when it's verified (link or evidence).
> Every line cites its requirement ID in `REQUIREMENTS.md`.

## Day-1 admin
- [ ] Registered on Devpost for the hackathon.
- [x] **Read the Official Rules**; confirmed eligibility from India; noted anything new in DECISIONS "Requirement updates" (R6, D4). *(owner, 2026-10-16)*
- [ ] Joined the PayPal Discord (G17).
- [ ] Checked the AG Grid, Render and APIMatic sponsor resource pages for licences and credits (P9, P13).

## Project (S1, R0–R8)
- [x] PayPal is central, not bolted on (G1). The APIs actually called are listed in the README with the reason for each. *(README "PayPal APIs used", 2026-10-15)*
- [x] AI is meaningful (R3). The README lists each AI component and what it decides versus what code decides. *(README "AI used" + "Guardrails")*
- [x] Everything runs on the PayPal **sandbox** (R1). *(env refuses non-sandbox base URLs)*
- [x] Working prototype, not a mockup (R4, S3.x). *(AT-1…AT-6 on Render)*

## Devpost form
- [ ] Project name (S7).
- [ ] Elevator pitch, 2–3 sentences (S7).
- [ ] Project story: inspiration, how built, tools, why, challenges, what's next (S7).
- [ ] Text description of features and functionality (S2).
  - **Planned for Phases 9–13 (2026-10-16). Add each line only once its AT passes on Render; never describe a cut phase:**
    - **Agent reorder with consent:** the buyer saves PayPal once (Vault v3) with a spend cap; their agent reorders with no popup inside the cap; above the cap, or once revoked or expired, the popup returns; there is a per-agent audit log and instant revoke. *(Phase 10; Spike V decides.)*
    - **Dispute defense agent:** code assembles an evidence pack (tracking, delivery, chat, photos), the agent drafts the words, and the seller approves before it's submitted through the Disputes API. *(Phase 11)*
    - **Real multi-seller payouts:** Partner Referrals onboarding, per-seller payee routing, and a platform fee ledger. This retires the single-account caveat (D-006). *(Phase 12; Spike M decides.)*
    - **Adversarial agent arena:** 50 live attacks against our own MCP server, each shown BLOCKED with the guardrail that caught it. *(Phase 13)*
- [ ] **Tools section**: each model or AI service and how it's used (S4). Add when shipped: **PayPal Vault v3 payment tokens and merchant-initiated Orders** (Phase 10), the **Disputes API** (Phase 11), and **Partner Referrals / multiparty** (Phase 12). The arena (Phase 13) uses no new tool: it is our own MCP client. Draft in `docs/DEVPOST.md`: Groq (agents), Gemini (vision, large Studio turns, fallback), Vercel AI SDK, MCP SDK, AG Studio + Studio Agent Framework, AG Grid Community, Render, Neon, PayPal AI Toolkit (development). **Not** the PayPal Agent Toolkit: the build calls PayPal's REST APIs directly.
- [ ] Hosted demo URL (S3.b), plus **testing notes**: sandbox buyer email and password, judge-seller login.
- [ ] GitHub repo URL (S5).
- [ ] YouTube video URL (S6.3).
- [ ] Prize categories selected: main, Agentic Commerce, PayPal + AI, Best Demo, Most Creative, Most Impactful, AG Grid, Render.

## Repository (S5)
- [x] Public (S5.2).
- [ ] MIT `LICENSE` at the root **and visible in the About section** (S5.2).
- [ ] All source, assets, seed photos and instructions are included (S5.1).
- [ ] README: problem, demo URL, judge credentials, architecture, PayPal APIs, AI tools, local run, env vars, limitations (D-006), roadmap. *(Written 2026-10-15; still missing the judge credentials (submission day), Phase 3 proof, and a decision on `docker compose`.)*
- [x] Claude Desktop / claude.ai MCP connector snippet. *(README; owner to verify in Claude)*
- [x] No secrets in history. *(2026-10-15: the full `git log -p` was scanned for every secret value in `.env` (9 values) plus key patterns, with 0 hits; gitleaks itself not run.)*

## Functional demo (S3)
- [ ] The hosted URL works from an incognito window, on desktop and mobile (S3.b).
- [x] A full judge path completes in under 3 minutes (AT-6: 33 s automated). Re-check with the README once credentials are in.
- [x] Local run verified from a fresh clone with only the README (S3.a, D-056). *(2026-10-16, D-059: one fix needed, then health, MCP and pages OK)*
- [ ] Services stay up **through results announcement**: Render free + Neon free (D-022), keep-warm ping in the PLAN §5 windows, nightly demo reset.
- [ ] Sandbox buyer passwords are not changed after submission.

## Video (S6)
- [ ] Under 3:00. Target is **2:45** (S6.1, D-057; beat sheet in `DEMO-SCRIPT.md`).
- [ ] Shows the real build functioning (S6.2).
- [ ] Public on YouTube (S6.3).
- [ ] No third-party logos or UIs; music is licensed or absent (S6.4, D-015).
- [ ] Captions, readable at 1080p.

## Final
- [ ] Submitted by **Nov 11, 2026** (hard deadline Nov 13 01:30 IST) (D-004).
- [ ] Every link re-tested after submitting.
