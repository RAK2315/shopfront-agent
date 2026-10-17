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
- [ ] Elevator pitch, 2–3 sentences (S7). **Lead with the Telegram seller copilot (owner, D-072)** once AT-10 passes; the draft is in `docs/DEVPOST.md`. If Spike T fails, keep the current pitch.
- [ ] Project story: inspiration, how built, tools, why, challenges, what's next (S7).
- [ ] Text description of features and functionality (S2).
  - **Planned for Phases 9–13, in the re-planned order (2026-10-17, D-071). Add each line only once its AT passes on Render; never describe a cut phase. The Telegram line goes first in the description:**
    - **Seller copilot on Telegram (the lead):** the seller runs the shop from her phone. A photo becomes a listing, the price is confirmed by tap, and the listing is mirrored to PayPal and agent-buyable. Order pings, a label photo becomes tracking on the PayPal order, refunds are approved by tap, and "what sold this week?" is answered with sourced figures. Every money action is a deterministic button, never the model. *(Phase 10; Spike T decides.)*
    - **Real multi-seller payouts:** Partner Referrals onboarding, per-seller payee routing, and a platform fee ledger. This retires the single-account caveat (D-006). *(Phase 9; Spike M decides.)*
    - **Agent reorder with consent:** the buyer saves PayPal once (Vault v3) with a spend cap; their agent reorders with no popup inside the cap; above the cap, or once revoked or expired, the popup returns; there is a per-agent audit log and instant revoke. *(Phase 11; Spike V decides.)*
    - **Dispute defense agent:** code assembles an evidence pack (tracking, delivery, chat, photos), the agent drafts the words, and the seller approves before it's submitted through the Disputes API. *(Phase 12)*
    - **Adversarial agent arena:** 50 live attacks against our own MCP server, each shown BLOCKED with the guardrail that caught it. *(Phase 13)*
- [ ] **Tools section**: each model or AI service and how it's used (S4). Add when shipped: the **Telegram Bot API** (Phase 10; the chat interface, with no AI of its own), **Partner Referrals / multiparty** (Phase 9), **PayPal Vault v3 payment tokens and merchant-initiated Orders** (Phase 11), and the **Disputes API** (Phase 12). The arena (Phase 13) uses no new tool: it is our own MCP client. Draft in `docs/DEVPOST.md`: Groq (agents), Gemini (vision, large Studio turns, fallback), Vercel AI SDK, MCP SDK, AG Studio + Studio Agent Framework, AG Grid Community, Render, Neon, PayPal AI Toolkit (development). **Not** the PayPal Agent Toolkit: the build calls PayPal's REST APIs directly.
- [ ] Hosted demo URL (S3.b), plus **testing notes**: sandbox buyer email and password (already in the README and on `/pay`, D-069), judge-seller login.
- [ ] GitHub repo URL (S5).
- [ ] YouTube video URL (S6.3).
- [ ] Prize categories selected: main, Agentic Commerce, PayPal + AI, Best Demo, Most Creative, Most Impactful, AG Grid, Render.

## Repository (S5)
- [x] Public (S5.2).
- [ ] MIT `LICENSE` at the root **and visible in the About section** (S5.2).
- [ ] All source, assets, seed photos and instructions are included (S5.1).
- [ ] README: problem, demo URL, judge credentials, architecture, PayPal APIs, AI tools, local run, env vars, limitations (D-006), roadmap. *(Judge credentials and the 60-second path published 2026-10-16, D-069; Docker dropped, D-056. Still missing: the Phase 3 photo proof.)*
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
- [ ] No third-party logos or UIs; music is licensed or absent (S6.4, D-015). **Telegram phone footage is cropped to the conversation, with no Telegram chrome or logo, or replaced by the labelled chat strip (owner decides, PLAN risk 21).**
- [ ] Captions, readable at 1080p.

## Final
- [ ] Submitted by **Nov 11, 2026** (hard deadline Nov 13 01:30 IST) (D-004).
- [ ] Every link re-tested after submitting.
