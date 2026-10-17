# Owner override, Step 1 fixes: acceptance on Render (2026-10-17)

| Step | What | Result | Evidence |
|---|---|---|---|
| 1.1 | Order tokens bound to the checkout's creator; every id-taking route audited (D-068) | ✅ 10/10 attacks blocked; the real redirect return captures once | `docs/screenshots/phase-6/AT-6.md` (#8), 7 unit tests in `apps/web/src/server/tokens.test.ts` |
| 1.2 | Sandbox buyer login published in the README and on `/pay`; 60-second path (D-069) | ✅ AT-6 #1: `/shop` → paid in **27 s**; the `/pay` box shows the exact login (token check) | `phase-6/judge-pay-test-buyer-desktop.png`, `phase-6/judge-paid-desktop.png` |
| 1.2 | Cold 5-minute judge re-run (REVIEW-2) | see `docs/REVIEW-1.md` → "After the fixes" | `docs/review-2/` |
| 1.3 | Test and replay runs flagged and kept off public views; old test data purged; plain replay wording (D-070) | ✅ `pnpm --filter web fixes-checks -- --base https://shopfront-agent.onrender.com --cutover 2026-10-17T13:11:20.579Z`: I1–I5 pass | below |
| 1.4 | D-062 video issues logged as Phase 8 tasks | ✅ | `docs/PLAN.md` Phase 8 |

## Step 1.3 detail (commit `fea5ef0`)
- **I1:** a test-run checkout (`chk_b73uheazu7zw`) and its 2 events are flagged. It is absent from the public console, the public event stream, `/` and `/live`, and visible to a test run.
- **I2:** a real visitor's checkout (no header) appears on the public console and stream. It was then archived as test.
- **I3:** public `/`, `/live`, the console and the event backlog show **0** test rows.
- **I4:** all 8 events of a paid test checkout are flagged (`chk_abtj36xdbfl6`), including 2 PayPal webhook events that had no request context.
- **I5:** 0 public events since the cutover contain "mode:replay".
- **Purge at the cutover (`2026-10-17T13:11:20Z`):** 74 checkouts and 693 events flagged as test, nothing deleted. 1 boot "re-armed" event that listed test ids was flagged afterwards, and fixed in code.
- **Found and fixed during the run:**
  - The boot re-arm event listed test checkout ids on the public wire.
  - The Render copy of the buyer password had been truncated by shell `$` expansion when it was set. It was re-set via Node, and AT-6 #1 now compares the displayed login token by token.

## Screenshots (public view, no test header)
`home-*`, `live-*`, `shop-*` at desktop, mobile and 1920×1080 (`-video`). `/` and `/live` now show their empty states ("Quiet right now…" / "Waiting for the first agent call…") until a real session arrives.
