# Demo script — v3 (target **2:45**, 12 beats; leads with the Telegram copilot)

> **What changed from v2** (owner override, re-planned 2026-10-17, D-071/D-072):
> - The story now **opens on the seller's phone.** She runs her shop from a Telegram chat with the Shopfront copilot (Phase 10): photo to store, order pings, label to tracking, and refund approval.
> - Multi-seller payouts (Phase 9) get their own beat.
> - The Vault reorder (Phase 11) is no longer the hero. Disputes and the arena (Phases 12–13) stay in the closing montage.
>
> **How it's built:** programmatically in Phase 8 (D-057, D-058; the toolchain was proven in D-062).
> - **Desktop beats:** real captures of `https://shopfront-agent.onrender.com` at 1920×1080.
> - **Phone beats:** the owner's **real phone screen recordings** (portrait), placed on a neutral 1920×1080 canvas, with the matching `/live` wire beside them where it helps.
> - Motion graphics appear only in beats 1, 2 and 12, and in transitions (S6.2).
>
> **Third-party UI (S6.4, D-015/D-057): a risk the owner must accept or change.** Telegram's interface is a third-party brand UI.
> - **Plan:** crop every phone clip to the conversation area only. No status bar, no app header showing "Telegram", no Telegram logo or splash screen. What remains is our bot's name ("Shopfront"), its avatar, and our messages and buttons.
> - The narration says "a chat app" or "her chat", and the word "Telegram" appears only in the README and the Devpost text (described, not shown as a mark).
> - If the owner prefers zero risk: re-create the same chat turns from the real bot transcripts as an on-brand motion "chat strip", clearly labelled "from a real session". That trades authenticity for safety, so it is the owner's call.
>
> **Logos:** PayPal (the host) and the sponsor tools actually used, unaltered. No others.
> **Voice:** undecided: the owner's voice-over or free TTS. Lines run at ≤ 2.5 words/s, and the caption cues use the same words.
> **Demo seller:** Juniper Clay Studio (`juniper_clay`). Seller 2 for payouts: Fern & Loom (`fern_and_loom`).

## Beat sheet

| # | Time | Len | Screen | What happens on screen | Phase |
|---|---|---|---|---|---|
| 1 | 0:00–0:08 | 8 s | *Motion graphic* | Her product posts and DMs ("is this still available?"), then an agent cursor that can't buy: "no store, no feed, no checkout". | — |
| 2 | 0:08–0:13 | 5 s | *Motion* | The title, and "Your shop, run from a chat. Buyable by AI agents." | — |
| 3 | 0:13–0:37 | 24 s | **Phone** (then 2 s of `/s/juniper_clay`) | She snaps a mug. "Reading your photo…" becomes a draft card: title, material, "Check this" on one field, and the price "AI guess $32". She taps **Confirm $32**. "Live: buyable by any AI agent", plus the PayPal catalog id. Cut to the storefront with the new listing. | 10 |
| 4 | 0:37–0:59 | 22 s | `/capture?left=/shop&right=/live` | "Find me a handmade blue mug under $40 as a gift". The tool calls stream; the card shows "Total (set by the shop)". "Try to hack the price" → "Protected: 3 of 3 blocked". | 6 |
| 5 | 0:59–1:11 | 12 s | `/pay/{id}` + the PayPal popup | Approve in PayPal → Paid → "Webhook verified". If Phase 9 shipped: "Paid directly to Juniper Clay Studio · fee to Shopfront" on the wire. | 1, 2, 9 |
| 6 | 1:11–1:23 | 12 s | **Phone** + `/live` strip | The ping arrives: "New order · Cobalt drip mug · $37.00 · paid, webhook verified". She replies with a label photo → "UPS 1Z… · confirm?" → taps → "Tracking is on the PayPal order". | 10 |
| 7 | 1:23–1:35 | 12 s | **Phone** | "Refund $95.00 needs you: 'arrived cracked'" → **Approve $95** → "Refunded through PayPal". The caption notes that small refunds inside her policy were automatic. | 10 |
| 8 | 1:35–1:45 | 10 s | **Phone** → `/studio/dashboard` | "what sold this week?" → the answer with `[db]`/`[paypal]` figures. A 3 s cut to the AG Studio dashboard chart (P9). | 10, 5 |
| 9 | 1:45–2:02 | 17 s | `/studio/payouts` → `/capture?left=/shop&right=/live` | Fern & Loom taps **Connect PayPal** (real Partner Referrals onboarding, status "payments receivable"). An agent buys from her; the wire splits "$42.00 → Fern & Loom · $2.10 fee → Shopfront". | 9 |
| 10 | 2:02–2:20 | 18 s | consent card → `/capture?left=/shop&right=/consent/…` | The buyer saves PayPal with a $100 cap. "Restock my usual" pays **with no popup**; the meter fills to "$37 of $100". Over the cap → "cap reached → popup". | 11 |
| 11 | 2:20–2:38 | 18 s | montage: `/studio/disputes` → `/arena` | "It also…" Evidence cards assemble, then "Approve and submit" (9 s). Arena tiles flip to BLOCKED, "50 / 50" (9 s). | 12, 13 |
| 12 | 2:38–2:45 | 7 s | *Motion graphic* | Tagline, the URL, and a stack row: PayPal Orders v2 · JS SDK v6 · Webhooks · Catalog · Tracking · Refunds · Partner Referrals · Vault · Disputes — MCP · Telegram Bot API · Groq · Gemini · AG Studio · Render · Neon. Only the tools that shipped are listed, as text with no third-party logos. | — |

**Total:** 8 + 5 + 24 + 22 + 12 + 12 + 12 + 10 + 17 + 18 + 18 + 7 = **165 s = 2:45**.

**If a phase is cut** (decided at the freeze, Nov 3):
- **Phase 13 (arena) cut:** disputes take all of beat 11 (18 s).
- **Phase 12 also cut:** beat 11 is dropped. Its 18 s go to beats 6, 7 and 8 (+6 s each).
- **Phase 11 (Vault) cut:** beat 10 is dropped. Its 18 s go to beats 3 (+6, the "Change price" path), 4 (+6, the hack rows) and 9 (+6, onboarding steps).
- **Phase 9 failed its spike:** beat 9 is dropped. Its 17 s go to beats 3 (+7), 5 (+5, the fallback check named) and 8 (+5, the dashboard). Beat 5 says "settles to the platform account" (D-006).
- **Phase 10 failed its spike:** go back to the v2 web-studio story (beats 3, 8 and 9 of v2, in git history at `3240714`).

## Voice-over and caption cues
Cue times are absolute. Each cue is at most 2 lines × 42 characters.

| Beat | Cue | Text |
|---|---|---|
| 1 | 0:00.5–0:04.0 | She sells from her phone: posts and DMs. |
| 1 | 0:04.0–0:07.7 | AI agents shop for people now. They can't buy from her. |
| 2 | 0:08.3–0:12.7 | Shopfront: her shop runs from a chat, and any agent can buy. |
| 3 | 0:13.5–0:18.5 | She sends a photo. |
| 3 | 0:18.5–0:26.0 | Gemini drafts the listing and flags what it isn't sure of. |
| 3 | 0:26.0–0:31.5 | The price stays a guess until she taps Confirm. |
| 3 | 0:31.5–0:36.5 | It's live, mirrored to PayPal, and agent-buyable. |
| 4 | 0:37.5–0:44.0 | A shopper asks an agent for a blue mug under $40. |
| 4 | 0:44.0–0:51.0 | The agent sends IDs and quantities. The server sets the total. |
| 4 | 0:51.0–0:58.5 | Try to cheat: price zero, a discount, minus five. All blocked. |
| 5 | 0:59.5–1:05.0 | The agent shops. The human approves, in PayPal. |
| 5 | 1:05.0–1:10.5 | A signature-verified webhook confirms the payment. |
| 6 | 1:11.5–1:16.5 | Her phone buzzes: paid, and verified. |
| 6 | 1:16.5–1:22.5 | She snaps the label. Tracking goes onto the PayPal order. |
| 7 | 1:23.5–1:29.0 | Small refunds follow her policy, automatically. |
| 7 | 1:29.0–1:34.5 | Ninety-five dollars waits for her tap. |
| 8 | 1:35.5–1:44.5 | She asks what sold, with figures from her database and PayPal. |
| 9 | 1:45.5–1:52.0 | A second maker connects her own PayPal account. |
| 9 | 1:52.0–2:01.5 | Each sale pays her directly. The platform fee is split in code. |
| 10 | 2:02.5–2:09.0 | A buyer lets their agent reorder, up to $100. |
| 10 | 2:09.0–2:19.5 | It pays with no popup, inside that cap. Over it, the popup returns. |
| 11 | 2:20.5–2:29.0 | It also defends disputes with evidence she approves, |
| 11 | 2:29.0–2:37.5 | and survives fifty live attacks on its own MCP server. |
| 12 | 2:38.3–2:44.8 | Shopfront Agent: every seller, buyable by every agent, settled by PayPal. |

*Cut phases also cut their cues. If Phase 9 failed, beat 5's second cue says "One platform account settles in this demo." "Settled by PayPal" stays true either way.*

## Phone footage (owner, Oct 27; Phase 10 AT)
- **Device:** the owner's real phone, in portrait, using its built-in screen recorder.
- **Before recording:**
  - Turn on Do Not Disturb.
  - Use a neutral wallpaper.
  - Make sure the chat holds only the demo conversation.
  - Run a demo reset and keep the service warm (`/api/health` 10 minutes before).
- **The 4 takes:**
  1. Photo → confirm → live.
  2. Order ping → label photo → tracking.
  3. Refund approve.
  4. "what sold this week?"
  - Retake any take where the AI is slow: the drafts replay (D-055), and the taps are deterministic.
- **The edit:**
  - Crop to the conversation area (S6.4, see above).
  - Speed up only the "Reading your photo…" wait, at most 2×, and label it "sped up".
  - Never cut out a button press.

## Capture prerequisites (checked by the capture script)
- **Before every desktop take:**
  - The service is warm, and a demo reset has run (D-054).
  - The live wire uses `?from=now`, and its checkout list starts empty (Phase 8 task 2).
  - Captions sit in the reserved band (Phase 8 task 3).
  - Test runs never appear on public views (D-070). Capture takes are real sessions.
- **Photos:** the owner's photo listings are published and frozen (AT-3).
- **Beat 7:** a $95 order is paid off camera, and its refund request is open.
- **Beat 9:** seller 2 has completed onboarding (if Phase 9 shipped).
- **Beat 10:** a fresh consent with nothing used yet (if Phase 11 shipped).
- **Beat 11:**
  - The disputes were opened on Oct 29 (PLAN 12.1).
  - A finished arena run exists.
- **Beat 8:** sales were seeded at least 24 h earlier, for Transaction Search.
- **PayPal popups:** allowed, and the sandbox buyer is logged in once in the capture profile.

## Honesty checks for the edit
- Settlement goes to one platform account unless Phase 9 shipped (D-006).
- The consent cap is enforced by Shopfront, not PayPal (PLAN 11.4).
- Every money action in the chat is a button tap running deterministic code. The chat model never moves money (D-002, D-072).
- "Agent-buyable", not "discoverable".
- Every AI step keeps its source badge, in plain words (D-070).
- No staged data: every number on screen comes from a real sandbox call. Any sped-up wait is labelled.
