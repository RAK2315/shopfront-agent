# Demo script — v5 (2:50, a working-prototype demo with voiceover)

> **Status:** draft for the owner's review (2026-10-25). Replaces v4. Built in Remotion (`video/`), 1920 × 1080, 60 fps.
> **Requirements it serves:** under 3:00 (S6.1; target 2:50); the real build working on the devices it was made for,
> desktop web and a phone (S6.2); public on YouTube (S6.3); no third-party marks or music (S6.4). Judging:
> Presentation asks "what problem, who it's for, why it matters, end to end" (J5); the AG Grid prize wants the
> dashboard shown properly (P9).
>
> **Style:** real footage of https://shopfront-agent.onrender.com for every feature, captured at 2× so zooms stay
> sharp. Motion between shots follows the launch-motion rules the owner chose: canvas locked to 1920 × 1080 and laid
> out from the centre; eased camera pushes and pull-backs, never linear; a cursor that travels in arcs, presses on
> every click and hesitates about a second when it moves between tabs; staggered entrances; nothing ever fully still.
> **Type:** Geist (UI, captions) and Alegreya (titles), the app's own open-source fonts, loaded before frame 0.
> **Sound:** male US voiceover with warmth and personality (ElevenLabs free tier for the first cut, credited in the
> YouTube description; the owner may swap in their own voice); quiet UI clicks on presses; no music.
> **Captions:** one line at the bottom, the same words as the voiceover.
> **Persona:** "Juniper" runs Juniper Clay Studio, the demo shop; Fern & Loom is the second, directly paid seller.

## How the video goes

| # | Time | Act | What you see | Voiceover |
|---|---|---|---|---|
| 1 | 0:00–0:10 | Hook | The sunlit studio photo with a slow push-in, then hands wrapping a mug. A phone (drawn in code) fills with DMs: "is this still available?" An AI agent's cursor reaches for a Buy button that isn't there. Three words land: **No store · No feed · No checkout.** | Millions of makers sell only through social posts, like Juniper's pottery studio. But shopping now starts with AI agents, and an agent can't buy from a DM. |
| 2 | 0:10–0:16 | Promise | Paper texture; the awning-S mark builds panel by panel; the wordmark settles. | Shopfront Agent turns her photos into a store any AI agent can buy from, paid through PayPal. |
| 3 | 0:16–0:34 (18 s, D-108) | Photo → listing | Real `/studio`: the green mug photo drops in, "Reading your photo…", the draft card fills field by field with AI tags. Camera pushes in on **"AI guess · confirm before publishing"**. Cursor arcs to **Confirm price** (press), then **Publish**. Push in on **"Mirrored to PayPal's catalog"** and its catalog id. | She drops in a photo. Gemini drafts the listing and marks every field it filled. The price stays a guess until she confirms it herself. One tap, and it's live in her store and mirrored into PayPal's catalog. |
| 4 | 0:34–0:58 | An agent buys | Real `/capture` split: the shopper's chat on the left, the live wire on the right. "Find me a handmade green mug under $40." The camera pans with the tool calls (search_products, get_product, create_checkout), pushes in on **"total, set by the shop"**, then the PayPal popup: the sandbox buyer approves. The card turns green; push in on **"Webhook received and signature verified"** and the PayPal debug id on the wire. | A shopper asks an AI agent for a green mug under forty dollars. The agent shops her store over MCP, and it can only send product IDs and quantities. The price always comes from her catalog, on our server. The agent can't pay. The human approves in PayPal, and a signature-verified webhook confirms it. |
| 5 | 0:58–1:16 | Seller on her phone | A phone frame. The chat strip, rebuilt from a real bot session and labelled so: **Order paid · $36.00**, a label photo → **Add tracking?** → tap → **Tracking is on the PayPal order**; **Refund request · $95 · needs you** → **Approve** → **Refunded through PayPal**. A 2 s cut to the real storefront at phone width. | She runs the rest from a chat on her phone. The order pings her. She snaps the shipping label, and the tracking lands on the PayPal order. A refund outside her policy waits for her tap. Small ones follow her rules automatically. |
| 6 | 1:16–1:33 | Paid directly · any agent · Store Sync | Real Studio **Get paid** card: Log in with PayPal → "Verified by PayPal". Real `/live`: a Fern & Loom order, push in on **"paid to Fern & Loom"**. Then a terminal: PayPal's own Cart API client (`cart-agent`) builds a cart and checks out; push in on **PRICE_MISMATCH → ACCEPT_NEW_PRICE** for an agent price of $0.01. | Sellers connect with Log in with PayPal, and only a verified account gets paid, straight into its own PayPal. Every store also speaks PayPal's Cart API: here, PayPal's own client shops through it. So every store is ready for Store Sync. |
| 7 | 1:33–1:54 (21 s, D-108) | The Gauntlet | Real `/gauntlet`: *Run the Gauntlet*, tiles stream in two columns, naive shop vs Shopfront, same model. Push in on a photo-injection pair: naive → a real PayPal sandbox order at the attacker's price; Shopfront → blocked, with the reason. Counters land: **27/31 harmed · 31/31 blocked**. | Can an agent be tricked into a cheaper price? We ran thirty-one attacks on a naive shop and on Shopfront, with the same AI model: injections in chat, prices hidden in photos and shipping labels, forged webhooks, replays. The naive shop made real PayPal orders at the attacker's price. Shopfront blocked all thirty-one. |
| 8 | 1:54–2:30 | Dashboard (AG Grid) | Real `/studio/dashboard` Overview at 1920: orders grouped by product with subtotals; click an order → its full PayPal history; a new sale slides into the grid without a reload. The Ask bar, "unshipped orders over $50": grid, chips and chart change; a banner says what changed; **Undo**. Then **Report · AG Studio**: five page tabs flick by. The Shop Manager: "What needs my attention?" → `[db]` / `[paypal]` lines. "Refund order …" → it can't. "Add a donut of refunds by reason" → the change strip tagged **AI** → **Undo**. End on **Reconciled with PayPal ✓**. | Her dashboard runs on AG Grid and AG Studio. Orders group by product, a click opens the full PayPal history, and new sales appear live. She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo. The Studio report joins orders, payments, refunds and agent carts. Its Shop Manager agent answers from her database and from PayPal, and labels every number's source. It has no tool that moves money, so a refund request gets a polite no. Every change it makes is listed and undoable, and her books are checked against PayPal on every run. |
| 9 | 2:30–2:42 | Why you can trust it | A clean architecture diagram (built in code) draws itself: agent → MCP → Shopfront → PayPal (Orders, Webhooks, Catalog, Cart API), the model off to the side and never touching money, the whole app inside one **Render** box. Counters: **148 checks against this live deployment · 0 mismatches with PayPal**. Camera pulls back to the whole board. | No model ever moves money; that's plain code. It all runs on one free Render service, and every feature is tested against this live deployment, with real PayPal sandbox calls. |
| 10 | 2:42–2:50 | Close | Paper texture; the logo; **shopfront-agent.onrender.com**; small line: "PayPal sandbox · test buyer in the README". | Shopfront Agent. Any seller, buyable by any AI agent, paid through PayPal. Try it live. |

**Length:** 10 + 6 + 18 + 24 + 18 + 17 + 21 + 36 + 12 + 8 = **170 s = 2:50**.

**Coverage (owner review, 2026-10-25):** main idea (1–2) · PayPal + AI throughout · Agentic Commerce (4, 6) · AG Grid prize (8, 36 s) · Render prize (9) · Most Creative (7) · Most Impactful (1, 5) · Presentation (end to end, who and why up front). Left to the README on purpose: the replay fallback, the 13-attack hack card, Telegram judge mode, reconciliation internals.

## Voiceover (full text, for the recording)

> Millions of makers sell only through social posts, like Juniper's pottery studio. But shopping now starts with AI agents, and an agent can't buy from a DM.
>
> Shopfront Agent turns her photos into a store any AI agent can buy from, paid through PayPal.
>
> She drops in a photo. Gemini drafts the listing and marks every field it filled. The price stays a guess until she confirms it herself. One tap, and it's live in her store and mirrored into PayPal's catalog.
>
> A shopper asks an AI agent for a green mug under forty dollars. The agent shops her store over MCP, and it can only send product IDs and quantities. The price always comes from her catalog, on our server. The agent can't pay. The human approves in PayPal, and a signature-verified webhook confirms it.
>
> She runs the rest from a chat on her phone. The order pings her. She snaps the shipping label, and the tracking lands on the PayPal order. A refund outside her policy waits for her tap. Small ones follow her rules automatically.
>
> Sellers connect with Log in with PayPal, and only a verified account gets paid, straight into its own PayPal. Every store also speaks PayPal's Cart API: here, PayPal's own client shops through it. So every store is ready for Store Sync.
>
> Can an agent be tricked into a cheaper price? We ran thirty-one attacks on a naive shop and on Shopfront, with the same AI model: injections in chat, prices hidden in photos and shipping labels, forged webhooks, replays. The naive shop made real PayPal orders at the attacker's price. Shopfront blocked all thirty-one.
>
> Her dashboard runs on AG Grid and AG Studio. Orders group by product, a click opens the full PayPal history, and new sales appear live. She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo. The Studio report joins orders, payments, refunds and agent carts. Its Shop Manager agent answers from her database and from PayPal, and labels every number's source. It has no tool that moves money, so a refund request gets a polite no. Every change it makes is listed and undoable, and her books are checked against PayPal on every run.
>
> No model ever moves money; that's plain code. It all runs on one free Render service, and every feature is tested against this live deployment, with real PayPal sandbox calls.
>
> Shopfront Agent. Any seller, buyable by any AI agent, paid through PayPal. Try it live.

## Capture list (real footage, 2× device scale, one take per beat, right after a demo reset)

| Beat | Route | Flow to record | Needs |
|---|---|---|---|
| 3 | `/studio` | Upload `mug.jpg`, wait for the draft, confirm price ($36), publish | The mug kept unpublished until this take (D-106); after the take it stays live |
| 4 | `/capture?left=/shop&right=/live` | The green-mug query → checkout → PayPal popup → paid | Warm service; popups allowed; sandbox buyer logged in once in the capture profile |
| 5 | `/s/juniper_clay` at 390 px | 2 s scroll | — |
| 6 | `/studio` Get paid card; `/live`; a terminal | The Log in with PayPal check (as the demo shop it only shows the check); a Fern & Loom order made just before; `pnpm --filter web cart-agent -- --store juniper_clay --query mug` with the $0.01 price step | One real Fern & Loom purchase |
| 7 | `/gauntlet` | Run, ~90 s, middle sped up 2× and labelled | Cooldown passed; cached answers labelled as such |
| 8 | `/studio/dashboard` (both tabs) at 1920 | Grouped grid, drill-down, a live row (a purchase made in another window during the take), Ask bar + Undo; report pages; Shop Manager questions; AI change + Undo | Dashboard state reset; the AG key valid (expires 1 Dec) |
| 5 (strip) | — | No capture: the chat strip is rebuilt from the newest `docs/screenshots/telegram/transcript-*.json` | — |

## Honesty checks for the edit
- Juniper Clay is paid into the platform's sandbox account; only Fern & Loom is paid directly. Say "can be paid straight into their own PayPal".
- "Ready for Store Sync", never "on Store Sync" (access not requested).
- The naive shop's orders are real but never approved, so never captured (D-102).
- The chat strip says "Rebuilt from a real session"; no Telegram interface or logo.
- Product photos are AI-generated stand-ins (credited in the README and `video/ASSETS.md`).
- Any sped-up wait is labelled; every AI step keeps its source badge; every number on screen comes from a real sandbox call.
