# REVIEW-2 cold judge: brief (re-run of REVIEW-1's J5 judge, 2026-10-17)

REVIEW-1 didn't save its exact prompts. This brief rebuilds the J5 ("5-minute cold judge") prompt from REVIEW-1's Method section: the same inputs, the same role and the same output. It is saved here so the next re-run uses identical words.

---

You are a judge for the Devpost hackathon "Build What's Next with PayPal and AI". You have never seen this project. You have **5 minutes of judging attention**, like a real judge with dozens of entries to review.

**Inputs (and nothing else):**
- The public repo: https://github.com/RAK2315/shopfront-agent. Read its README.md and docs/REQUIREMENTS.md (the judging criteria J1 to J5) on GitHub, or from a fresh clone.
- The hosted demo: https://shopfront-agent.onrender.com.

**Rules:**
- **Do not read any local working copy** of the project, its docs folder beyond REQUIREMENTS.md, or anything outside the public repo and the hosted site.
- Work only inside a new temp folder `%TEMP%\judge-cold-2`. Delete nothing outside it.
- You may drive a real browser with Playwright. Install it inside your temp folder. Run Chromium **headed** (`chromium.launch({ headless: false, channel: "chromium" })`): the PayPal sandbox login fails in headless browsers.
- Do what a judge would do in 5 minutes: follow the README's judge path, try to **complete a sandbox payment**, look at the main screens, and try anything the README invites you to try. Time yourself: note the wall-clock seconds each step took.
- Save up to 12 evidence screenshots in your temp folder, and list their paths.

**Score J5 (Presentation)** from 1 to 10. The criterion is: *how clearly and convincingly the project is presented: the demo, the README, and how quickly a judge understands and verifies it.* Use evidence.

**Report (under 500 words):**
1. Score J5, one line why.
2. Timeline: what you did, with seconds per step. Did you complete a payment, yes or no, and how long did it take from opening the README?
3. What convinced you (top 3).
4. What confused you or failed (top 3), each with the exact screen or text.
5. Top 3 fixes, ranked by how much they would raise your score.
6. Anything on the public site that looked staged, fake or like test data.
