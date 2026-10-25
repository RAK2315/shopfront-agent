# Demo script — v6 (2:50, a directed re-edit of the working-prototype demo)

> **Status:** DRAFT for the owner's approval (2026-10-25). Replaces v5.1 after the owner rejected the first cut (D-110).
> Nothing is regenerated until the owner approves the voiceover text below.
> **Requirements it serves:**
> - Under 3:00 (S6.1; target 2:50).
> - The real build working on desktop web and a phone (S6.2).
> - Public on YouTube (S6.3).
> - Music only CC0, and no third-party marks except PayPal, the host (S6.4).
> - Judging: problem, audience, why it matters, end to end (J5); the AG Grid dashboard shown properly (P9).
>
> **Aim:** a directed product film, not a collage of screen recordings with zoom effects. Every effect has to earn its
> place. Each scene goes context → action → result (held) → understanding, and should read even with the sound off.

## Direction rules (every beat)

- **Voice leads:**
  - One ElevenLabs file per sentence (Chris, `eleven_v3`, stability ~0.3–0.35, at most 1.05×).
  - Sentences are never cut, overlapped or sped up to fit.
  - Pauses vary from 0.3 to 0.8 s, and some moments are left with no narration.
  - The footage is cut to the voice.
- **Footage:**
  - Static, full-frame and readable by default (the captures are 1.5× scale, so full frame is sharp).
  - At most one gentle push-in per shot, 1.1–1.25×, about 1.5 s with an ease-out, then it settles and holds.
  - No drift, no sideways pans, no scale pop at scene start.
  - To point at something: a soft spotlight (the rest of the frame dims about 35%) and a thin outline, removed before the next action.
- **Time:**
  - Real speed. Waits are removed with clean jump cuts. No "N× speed" labels.
  - The YouTube description says once: "Waits are trimmed; nothing is staged."
  - Important states hold for 2–4 s.
- **Transitions:** a cut between actions inside a beat, an 8–10 frame crossfade between beats, and a match cut where two shots share an element. No wipes, and never more than one effect at a time.
- **Motion:**
  - Ease-out curves.
  - Springs only with almost no overshoot.
  - UI entrances: fade plus 12–16 px rise, staggered 80–120 ms.
  - Headlines: a masked upward reveal or a light word stagger, used on only a few headings. Most text is static.
- **Type:**
  - Alegreya for headlines; Alegreya Sans for supporting lines, captions and the phone screens.
  - Strong contrast, no faint grey, no "a · b · c" lists.
  - The app's own fonts stay inside the footage.
- **Captions:** one line, Alegreya Sans Medium. Fade in and out (about 6 frames each), shown for at least 1.2 s, never hard-swapped, timed from the sentence files.
- **Cursor:**
  - Human paths: a soft arc that slows as it arrives.
  - A short pause before important clicks.
  - The press scales to 0.94 with a faint ring.
  - A recorded CC0 click on the exact press frame.
  - After a click, stay on the result.
- **Sound:**
  - A quiet CC0 ambient bed under the voice that drops while he speaks, fading in at 0:00 and out at the end.
  - Clicks only, no whooshes.
  - Steady loudness across beats.
- **Honesty:**
  - Every price, name and colour matches the voice.
  - No invented UI behaviour.
  - A screenshot is only animated as a screenshot (the Gauntlet scroll), never passed off as a live interaction.

## How the video goes

Times are estimates until the voice is generated, since the edit follows the voice. Speech is about 128 s at roughly
2.7 words a second, plus pauses; the rest is silent holds on results.

| # | ≈ Time | Act | Shot plan: context → action → result | Voiceover |
|---|---|---|---|---|
| 1 | 0:00–0:11 | Hook | Sunlit studio photo with one slow push (1.0 → 1.05). Crossfade to hands wrapping a mug. The phone (drawn in code, as before) fills with DMs, one after another. Three lines stacked, masked reveal: **No store. No feed. No checkout.** | [warm] Millions of makers, like Juniper, sell only through social posts. But shopping is moving to AI agents, and an agent can't buy from a DM. |
| 2 | 0:11–0:18 | Promise | Paper texture. The awning-S builds panel by panel. The wordmark rises from its mask. The tagline sits still underneath in Alegreya Sans. | Shopfront Agent turns her photos into a store that any AI agent can buy from, paid through PayPal. |
| 3 | 0:18–0:37 | Photo → listing | `/studio`, full frame, still. The mug photo slides into the drop zone (one eased path, no spin). Jump cut over the Gemini read. **Result:** the draft card, held 3 s, spotlight on the AI tags. The price block: spotlight plus a 1.15× push on "AI guess · confirm before publishing". She types $36 at real speed, presses Confirm, then Publish. Jump cut over publishing. **Result:** "Live" and "Mirrored to PayPal's catalog" with the catalog id, held 3 s. | She drops in a photo, and Gemini drafts the listing for her. The price stays a guess until she confirms it. One tap, and it's live, in her store and in PayPal's catalog. |
| 4 | 0:37–1:04 | An agent buys | The `/capture` split at full frame (shopper's agent left, live wire right). The query types at real speed (if long, the shot starts partway through it). Tool calls arrive on the wire (spotlight right). The checkout card lands: a 1.15× push on "Items $36.00 · Shipping $5.00 · $41.00, total set by the shop". Pay with PayPal → PayPal's window over a dimmed page → jump cut over the login → **the review screen held 2.5 s, $41.00 readable** → Complete Purchase → the window closes → **the buyer's card turns Paid, held 3 s, with no PayPal overlay on it** → only then the wire: "Webhook … signature verified", spotlight. | A shopper asks their AI agent for a green mug. The agent shops her store over MCP. It can choose the mug, but never the price, and it can't pay. The shopper approves in PayPal… and it's paid. A verified PayPal webhook confirms it. |
| 5 | 1:04–1:21 | Seller on her phone | Kept from v1, which the owner liked: the phone with the chat strip rebuilt from a real bot session and labelled as such. Type changes to Alegreya Sans, and the bounce is removed. Order paid $37.00 → label photo → Add tracking → tap → Tracking added; refund request $37.00 (outside policy) → tap → refunded. Her refund policy card from the real dashboard. A short cut to the real storefront at phone width. | She runs her shop from a chat on her phone. An order comes in. She snaps the shipping label, and the tracking lands on the PayPal order. A refund outside her policy waits for her tap. |
| 6 | 1:21–1:38 | Paid directly · Cart API | **Get paid** card → Log in with PayPal → jump cut over PayPal's login → **"Verified by PayPal", held 2.5 s**. Cut to the live wire: the Fern & Loom row "paid directly to Fern & Loom's PayPal", spotlight. Cut to the terminal (the real output of PayPal's own Cart API client, replayed and labelled so): a spotlight on `PRICE_MISMATCH → ACCEPT_NEW_PRICE`, no zoom. | Sellers sign in with PayPal, and a verified seller can get paid straight into their own PayPal. Every store also speaks PayPal's Cart API. Here's PayPal's own client buying through it, so every store is ready for Store Sync. |
| 7 | 1:38–1:59 | The Gauntlet | `/gauntlet`, full frame. Run pressed, the first attacks stream in at real speed (about 4 s). Crossfade to a smooth, steady scroll over a full-page screenshot of the same finished run (the real results). It slows and holds on the photo-injection pair, spotlight: naive → a real PayPal order at $1.00; Shopfront → blocked, with the reason. **Counters held 3 s with no narration: 27/31 harmed · 31/31 blocked.** | [curious] Can an agent be tricked into paying less? We threw thirty-one attacks at a naive shop and at Shopfront, same AI model: fake prices in chats, photos and shipping labels, forged webhooks, replays. The naive shop made real PayPal orders at the attacker's price. Shopfront blocked all thirty-one. |
| 8 | 1:59–2:32 | Dashboard (AG Grid + AG Studio) | Three demos, each still at full frame with spotlights. **1.** Group by product → the grouped grid with subtotals, held → click an order → its PayPal history panel, held 3 s. **2.** The Ask bar types "unshipped orders over $50" → the grid filters, the banner says what changed, held → Undo → restored. **3.** Crossfade to the AG Studio report: the Shop Manager's answer with `[db]` and `[paypal]` sources, held 4 s → "Refund order … in full" → the polite no, held 3 s. Ends on **Reconciled with PayPal ✓**, 2.5 s with no narration. Dropped: the five-page flip, the donut chart with AI-change Undo, the live sale (kept only if it shows naturally inside demo 1). | Her dashboard is built on A G Grid and A G Studio. Orders group by product, and a click opens the full PayPal history. She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo. Her Shop Manager agent answers from her database and from PayPal, and shows every number's source. It has no tool that moves money, so a refund request gets a polite no. |
| 9 | 2:32–2:43 | Why you can trust it | The architecture board (drawn in code) builds in order: agent → MCP → Shopfront → PayPal, the model to the side and never touching money, everything inside one **Render** box. Counters ease up to **148 checks against this live deployment · 0 mismatches with PayPal** (numbers re-checked before render). One slow pull-back to the whole board. | [confident] No AI model ever moves money; plain code does. It all runs on one free Render service, tested live with real PayPal sandbox calls. |
| 10 | 2:43–2:50 | Close | Paper. The logo. **shopfront-agent.onrender.com** with "Try it live". Below it, still: "Runs on the PayPal sandbox. The test buyer's login is in the README." | [warm] Shopfront Agent. Any seller, buy-able by any AI agent, paid through PayPal. Try it live. |

**Words:** 353 (v5.1 had 417, so about 15% shorter).

**Coverage:**
- The idea (1–2) and PayPal + AI throughout.
- Agentic commerce (4, 6).
- AG Grid prize (8).
- Render prize (9).
- Most Creative (7) and Most Impactful (1, 5).
- Presentation (who it's for and why, up front).

Left to the README: the replay fallback, the hack card, Telegram judge mode, reconciliation internals, the AI change and Undo strip, the report pages.

## Voiceover (full text, for approval)

The sentences are generated one at a time. Cues in [brackets] are spoken direction, not words. "A G" and "buy-able" are spelling hints for the voice; the captions read "AG" and "buyable".

> [warm] Millions of makers, like Juniper, sell only through social posts. But shopping is moving to AI agents, and an agent can't buy from a DM.
>
> Shopfront Agent turns her photos into a store that any AI agent can buy from, paid through PayPal.
>
> She drops in a photo, and Gemini drafts the listing for her. The price stays a guess until she confirms it. One tap, and it's live, in her store and in PayPal's catalog.
>
> A shopper asks their AI agent for a green mug. The agent shops her store over MCP. It can choose the mug, but never the price, and it can't pay. The shopper approves in PayPal… and it's paid. A verified PayPal webhook confirms it.
>
> She runs her shop from a chat on her phone. An order comes in. She snaps the shipping label, and the tracking lands on the PayPal order. A refund outside her policy waits for her tap.
>
> Sellers sign in with PayPal, and a verified seller can get paid straight into their own PayPal. Every store also speaks PayPal's Cart API. Here's PayPal's own client buying through it, so every store is ready for Store Sync.
>
> [curious] Can an agent be tricked into paying less? We threw thirty-one attacks at a naive shop and at Shopfront, same AI model: fake prices in chats, photos and shipping labels, forged webhooks, replays. The naive shop made real PayPal orders at the attacker's price. Shopfront blocked all thirty-one.
>
> Her dashboard is built on A G Grid and A G Studio. Orders group by product, and a click opens the full PayPal history. She asks for unshipped orders over fifty dollars, and the grid filters itself, with one-click undo. Her Shop Manager agent answers from her database and from PayPal, and shows every number's source. It has no tool that moves money, so a refund request gets a polite no.
>
> [confident] No AI model ever moves money; plain code does. It all runs on one free Render service, tested live with real PayPal sandbox calls.
>
> [warm] Shopfront Agent. Any seller, buy-able by any AI agent, paid through PayPal. Try it live.

## Footage: what we have, and what v6 still needs

All takes are from D-109 and live on disk in `video/public/clips/`.

| Beat | Take | Status for v6 |
|---|---|---|
| 3 | `studio-publish` | Usable. Jump cuts replace the sped-up parts. |
| 4 | `split-shop` | **Check first:** does PayPal's "secure browser" overlay clear by about 105 s, leaving the Paid card readable for 3 s? If not, **retake** (one more sandbox order; mug stock −1; reconcile afterwards; no pushes to main during the take). |
| 5 | `storefront-phone`, `dashboard-overview` (policy card) | Usable. |
| 6 | `get-paid`, `live-fern`, `cart-agent.json` | Usable. |
| 7 | `gauntlet`, `gauntlet-tour` | Usable for the real-time start. **New:** a full-page screenshot of the stored finished run, which is read-only and starts no new run. |
| 8 | `dashboard-overview`, `dashboard-report` | Usable for the three demos. Check that each held state stays on screen long enough at real speed; retake only the part that doesn't. |

## Honesty checks for the edit

- Juniper Clay is paid into the platform's sandbox account; only Fern & Loom is paid directly. Say "a verified seller can get paid", never "every seller is".
- "Ready for Store Sync", never "on Store Sync" (access not requested).
- The naive shop's orders are real but never approved, so never captured (D-102).
- The chat strip says "Rebuilt from a real session"; no Telegram interface or logo.
- The Cart API terminal says it is the real output, replayed.
- The Gauntlet scroll is over a screenshot of the real finished run.
- Product photos are AI-generated stand-ins (credited in the README and `video/ASSETS.md`).
- No voice line contradicts a number on screen. The $36 item is under the shopper's "$40", and the total with shipping is $41.00.
- Waits are trimmed with cuts, disclosed once in the YouTube description, and nothing is staged.

## Before the render is accepted (QC)

**The edit fails to build (`config.ts` checks) if:**
- any two voice sentences overlap;
- a caption shows for less than 1.2 s;
- a beat's voice runs past its end.

**Then a person watches it end to end and checks for:**
- clipped or overlapping speech, or unexplained silence;
- captions that hard-swap or vanish;
- stutter, scale jumps, too much zoom, bounce;
- clicks out of sync;
- unreadable or cut-off states;
- a proof moment that is blurred, choppy or sped up;
- text that moves while it reveals;
- black or frozen frames;
- any spoken or visual contradiction.

## Order of work

1. **Script:** the owner approves the v6 text above.
2. **Voice:** sample takes of beats 1–3 at two or three settings. The owner picks, then I generate the rest one sentence at a time.
3. **Sound:** a shortlist of 2–3 CC0 ambient tracks for the owner to choose from; a CC0 click.
4. **Footage:** the beat 4 overlay check (retake if needed) and the Gauntlet full-page screenshot.
5. **Motion system:** reusable pieces (still shot, push-in, spotlight, caption, crossfade, cursor, text reveal) built to the rules above, and the voice-led timeline in `config.ts`.
6. **Preview:** beats 3–4 (about 46 s) rendered for the owner to check before anything else is built.
7. **The rest:** the remaining beats with the same system, the full render, a full watch-through against the QC list, then to the owner.
