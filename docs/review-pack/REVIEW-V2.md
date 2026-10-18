# Review v2: the rebuilt screens (prepared 2026-10-18)

Same format as the first walkthrough. One step at a time, on Render (`https://shopfront-agent.onrender.com`):
- for each step: what to click (one or two lines) and what a judge should get in under 3 seconds;
- two questions: **Clear?** (yes / confusing / didn't work) and **Looks good?** (yes / boring / cluttered / ugly), plus an optional note;
- every answer is logged in `FEEDBACK-V2.md` (step, route, verdict, note, proposed fix);
- nothing is fixed during the walk;
- at the end: a ranked fix list with day estimates, marking what judges see. Nothing is built until the owner approves.

**Before the walk:** a demo reset; demo stock is at 20 or more; Render is warm; the sandbox test buyer is on every PayPal card.

| # | Step | Route | What to do | A judge should get in 3 s | Walk-1 feedback it answers |
|---|---|---|---|---|---|
| 1 | Landing | `/` | Read the top, scroll once, open the menu on a narrow window | "Your storefront, ready for AI agents": what it does, the two doors, a live feed proving it works | Step 1: headline, CTAs, navbar, flow, MCP chip, feed |
| 2 | Shop | `/shop` | Pick the blue-mug suggestion; approve with the PayPal button **inside the chat card**; watch the rail | Search → Found → Checkout → PayPal → Paid; who does each step; a clear paid state | Step 2: guidance, premium cards, success state, logs collapsed |
| 3 | Hack card | `/shop` | Click **Try to hack the price** | 13/13 blocked · price unchanged · 0 checkouts, in one glance | Step 3: punchy, fewer words |
| 4 | Live console | `/live` | Look at the four counts; open one row's **Details**; turn on **Group by checkout**; click a checkout | Real events with real PayPal ids, grouped and readable; technical details on demand | Step 4: summary, event types, grouping, ids hidden |
| 5 | Studio | `/studio` | Note the **Get paid** card and the Telegram card; drop a product photo; check the AI markers; confirm the price; publish | Photo → AI draft (marked as AI) → **you** confirm the price → live in the shop and PayPal's catalog | Step 5: AI vs seller, price prominence, photos, success state |
| 5b | Get paid | `/studio` | Click **Try Log in with PayPal** (sandbox seller login) | A seller's PayPal is verified by PayPal itself before it's ever paid | New (D-084) |
| 6 | Dashboard | `/studio/dashboard` | Ask "unshipped orders over $50 this week", then **Undo**; click an order; double-click a listing description and edit it; glance at **Builder** | KPIs, a grid that visibly changes with the banner listing what changed, the PayPal history in one click, write-back to PayPal | Step 6: data-rich, the AI visibly transforms, config hidden |
| 7 | Telegram | `t.me/juniper_clay_copilot_bot?start=judge` | Start → **Simulate a buyer** → approve in PayPal → the order ping → **Simulate a refund request** → Approve; send a photo | The seller's copilot: pings, one-tap approvals, photo → listing, all on a practice shop | Step 8: welcome card, buttons, a real ping, formatting |
| 8 | Mobile | the same pages on a phone (or Chrome device mode, iPhone 12 Pro) | Landing → shop (one search) → live → studio | Purpose-built on a phone, no sideways scroll, main actions in reach | Step 9 |

Proof screenshots of every step at desktop, 1920×1080 and mobile: `docs/screenshots/final/`.
