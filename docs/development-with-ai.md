# Development with AI

Shopfront was built in ten days (Oct 15 → Oct 24, 2026, then polish to Nov 5) by one owner working with an AI coding agent, **Claude Code**. This page says honestly who did what, how the work was kept on track, and where the AI got things wrong and how we caught it. AI is also *inside* the product (agents, vision, the Shop Manager); that part is described in the README and [threat-model.md](threat-model.md). This page is about the building.

## Who did what

| The owner | Claude Code |
|---|---|
| Picked the idea after a research pass (`personal research/claude web research`: idea ranking, competitor repos, risks) | Wrote the code, the tests and the planning docs, and ran the acceptance tests against the deployment |
| Froze the requirements (`REQUIREMENTS.md`, never edited) and approved every change of scope | Proposed changes as decision entries **before** making them, citing the requirement each one serves |
| Set the hard rules: $0 budget, sandbox only, money moved only by deterministic code, never mock PayPal | Kept to them, and stopped to ask when a rule and a request collided |
| Did the walkthroughs (review v1, v2) as a judge would, and wrote the fix lists | Turned each fix into a change with its own test |
| Did what only a person can: PayPal and AG Grid accounts, licence keys, the Log in with PayPal return URL, Render settings | Kept an owner to-do list (`OWNER-TODO.md`) so the build never waited on those |

## How the work stayed on track

- **Planning docs are the memory.** Each session starts by reading `CLAUDE.md`, `REQUIREMENTS.md` (frozen), `DECISIONS.md` (append-only, 102 entries by Oct 24), `PLAN.md` (phases, acceptance tests, cut list), `ARCHITECTURE.md` and `PROGRESS.md`. A session ends with a hand-off note, so the next one doesn't re-derive anything.
- **A decision before every deviation.** "Studio-only key: degrade gracefully" (D-100), "the Gauntlet's naive shop creates real sandbox orders, fenced" (D-102): each is written down with its reason, its limits and the requirement it serves, before the code changes.
- **Done means tested on the deployment.** A phase counts only when its acceptance suite passes against the Render deployment with real PayPal sandbox calls, screenshots at desktop, 1920 and phone width, and a reconciliation with PayPal at the end of every suite. The README's test counts are generated from the code (`pnpm --filter web test-counts`), and the per-call PayPal evidence from the app's own log (`sandbox-validation.md`).
- **One commit and push per step**, never during a test run (a push redeploys Render mid-test).
- **Free tiers only.** The agent itself runs on the owner's Claude Code plan; the product's models are free tiers (Groq, Gemini) behind a budget guard. No paid API was used.

## Tools the AI used, and why

- **PayPal's AI toolkit** (the `paypal-best-practices` skill, `/paypal:doctor`, `/paypal:explain-error`) before writing any PayPal code, instead of trusting memory for API shapes. Where the reference was silent (how long an unapproved order lives), the behaviour was checked against the sandbox itself and the evidence recorded (D-102).
- **Installed package docs and types** for the Vercel AI SDK and AG Studio (`node_modules/…/dist/types`), plus **PayPal's AG Grid hackathon boilerplate** as the reference pattern for Studio's data model (credited in the code).
- **Each library's own validator** to answer licensing questions: the AG key was run through AG Studio's, AG Grid's and AG Charts' validators, printing only verdict fields, never the key (D-080, D-100).
- **Playwright** for every acceptance test, headless, against the live deployment, including real PayPal sandbox logins and approvals.

## Where the AI got it wrong, and what caught it

Mistakes were found by tests, not by luck, and each fix is in the log:

- **A capture after a cancel** left two sandbox payments with no paid order (D-094). The new reconciliation found exactly those two; both were refunded through the app's own refund code (D-095), and reconciliation now runs at the end of every suite.
- **`instanceof` across Next.js bundles** silently skipped every PayPal error branch on Render until a decline test exercised it (D-081). The fix is a structural check, `isPayPalApiError`.
- **A type error in a test script failed a Render build**, because `next build` type-checks `scripts/` too; a grep for "Compiled successfully" had hidden it. The rule now: check the build's exit code.
- **AG Studio's panel state** uses the key `edit` for the Compose panel, not `compose`; the report silently lost half its width until the Phase AG screenshots showed it.
- **The Gauntlet's first run** reported seven "attacks that got through". They were parsing bugs in the new runner (a totals field read the wrong way, a non-UUID idempotency key), and the database check in the same suite (GA3: every guarded checkout at the database price) showed no real leak. Fixed before anything was committed.
- **Test assertions that pinned wording** (old Telegram copy, a nav link named like a KPI) failed after copy changes; the tests were updated to check facts, not phrasing.

## What the AI did not do

- It never received a tool that moves money in the product, and never ran a PayPal call that wasn't part of a test or the app's own flows.
- It never printed or committed a secret: keys are checked by length or hash only, and the one historical slip (a generic key prefix in an old SETUP.md line) is recorded in the hand-off.
- It didn't claim what wasn't built: Store Sync is "ready", not "live", until PayPal grants access; payouts to a seller's own PayPal are shown only for a verified account; the AG Grid Enterprise features stay off without the right key.
