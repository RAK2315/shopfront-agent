# Demo script — v2 (target **2:45**, 13 beats)

> **How it's built:** programmatically in Phase 8 (D-057, D-058; toolchain proven in D-062). Every product beat is a real capture of `https://shopfront-agent.onrender.com` at 1920×1080 (S6.2). Motion graphics appear only in beats 1, 2, 12's transitions, and 13.
>
> **Logos:** PayPal (the host) and the sponsor tools actually used, unaltered. No others (D-057, S6.4).
>
> **Voice:** undecided: the owner's voice-over or free TTS. Lines run at ≤ 2.5 words/s, and the caption cues are the same words.
>
> **What changed from v1** (owner, 2026-10-16): a hero beat for the agent reordering with **no popup, inside consent** (Phase 10), plus a 15 s "it also…" montage (Phases 11–13). Everything else was shortened to keep 2:45; see the table at the end.
>
> **Conditional beats:**
> - Beat 10 exists only if Spike V passes (D-064). If it fails, its 20 s go back to beats 3 (+5), 5 (+5), 7 (+4) and 9 (+6), as in v1.
> - The montage drops multi-seller if Phase 12 is cut.
>
> **Demo seller:** Juniper Clay Studio (`juniper_clay`), renamed to match if the owner's photos aren't ceramics (D-050).

## Beat sheet

| # | Time | Len | Screen | What happens on screen |
|---|---|---|---|---|
| 1 | 0:00–0:10 | 10 s | *Motion graphic* | Social-post photos, a DM "is this still available?", then an agent cursor that can't buy: "no store, no feed". |
| 2 | 0:10–0:16 | 6 s | *Motion* → `/` | The title resolves into the landing hero (live wire). |
| 3 | 0:16–0:37 | 21 s | `/studio` | Six photos dropped. Drafts stream in; a low-confidence field shows "Check this"; the price reads "AI guess". She types prices and publishes; the toast says "live and mirrored to PayPal". |
| 4 | 0:37–0:42 | 5 s | `/s/juniper_clay` | The storefront with real photos; zoom on the "agent-buyable" note. |
| 5 | 0:42–1:05 | 23 s | `/capture?left=/shop&right=/live` | "Find me a handmade blue mug under $40 as a gift". Tool calls stream; the card shows "Total (set by the shop)". The same calls land on the wire. |
| 6 | 1:05–1:17 | 12 s | same split | "Try to hack the price" → "Protected: 3 of 3 blocked". Three blocked rows on the wire. |
| 7 | 1:17–1:34 | 17 s | `/pay/{id}` + PayPal popup | Approve in PayPal → Paid → the badge flips to "Webhook verified". |
| 8 | 1:34–1:44 | 10 s | `/studio/orders` | Label photo → "Confirm and add to PayPal order" → the thank-you note on the buyer's page. |
| 9 | 1:44–1:57 | 13 s | `/shop` → `/studio/orders` | "It arrived the wrong size" → automatic refund (server computed). A $95 refund waits in "Refunds waiting for you"; one tap. |
| **10** | **1:57–2:17** | **20 s** | consent card → `/capture?left=/shop&right=/consent/…` | **Hero.** The buyer saves PayPal with a $100 cap ("Let your agent reorder, up to $100"). Later: "restock my usual". The agent pays **with no popup**; the packet runs agent → MCP → PayPal → webhook; the cap meter fills to "$37 of $100". One more over-cap order → "cap reached → popup". |
| 11 | 2:17–2:25 | 8 s | `/studio/dashboard` | "What sold this week?" → an answer with `[db]`/`[paypal]` figures; the chart appears. |
| **12** | **2:25–2:40** | **15 s** | montage: `/studio/disputes` → `/arena` → `/studio/payouts` | **"It also…"** Evidence cards assemble and "Approve and submit" (5 s). Arena tiles flip to BLOCKED, "50 / 50" (5 s). "$42 → Fern & Loom · $2.10 fee" (5 s; if Phase 12 shipped, otherwise arena 7 s + disputes 8 s). |
| 13 | 2:40–2:45 | 5 s | *Motion graphic* | Tagline, the URL, and a stack row: PayPal Orders v2 · JS SDK v6 · Vault · Webhooks · Disputes · Catalog · Tracking · Refunds — MCP · Groq · Gemini · AG Studio · Render · Neon. |

**Total:** 10 + 6 + 21 + 5 + 23 + 12 + 17 + 10 + 13 + 20 + 8 + 15 + 5 = **165 s = 2:45**.

## Voice-over and caption cues
Cue times are absolute. Each cue is at most 2 lines × 42 characters.

| Beat | Cue | Text |
|---|---|---|
| 1 | 0:00.5–0:04.5 | Makers sell through social posts and DMs. |
| 1 | 0:04.5–0:09.5 | AI agents shop for people now, but can't buy from her. |
| 2 | 0:10.3–0:15.7 | Shopfront Agent turns her photos into a store any agent can buy from. |
| 3 | 0:16.5–0:21.5 | She drops in six photos. |
| 3 | 0:21.5–0:28.5 | Gemini drafts each listing and marks what it isn't sure of. |
| 3 | 0:28.5–0:36.5 | Prices stay an AI guess until she confirms them, then mirror to PayPal. |
| 4 | 0:37.3–0:41.7 | Live, and buyable through one MCP endpoint. |
| 5 | 0:42.5–0:48.5 | A shopper asks an agent for a blue mug under forty dollars. |
| 5 | 0:48.5–0:56.5 | On the right, the live wire: every MCP call and PayPal request. |
| 5 | 0:56.5–1:04.5 | The agent sends IDs and quantities. The server sets the total. |
| 6 | 1:05.5–1:10.5 | Try to cheat: a zero price, a discount, a negative quantity. |
| 6 | 1:10.5–1:16.5 | All three blocked by the server. Nothing created. |
| 7 | 1:17.5–1:23.5 | The agent shops. The human approves, in PayPal. |
| 7 | 1:23.5–1:33.5 | A signature-verified webhook confirms it. A fallback check covers a lost one. |
| 8 | 1:34.5–1:43.5 | She photographs the label; tracking goes onto the PayPal order. |
| 9 | 1:44.5–1:50.5 | Refunds follow her policy, in code. Small ones are automatic. |
| 9 | 1:50.5–1:56.5 | Ninety-five dollars waits for her tap. |
| 10 | 1:57.5–2:03.5 | Once, the buyer lets her agent reorder, up to a hundred dollars. |
| 10 | 2:03.5–2:10.5 | "Restock my usual." It pays with no popup, inside that consent. |
| 10 | 2:10.5–2:16.5 | Over the cap, or revoked, and the popup comes back. |
| 11 | 2:17.5–2:24.5 | She runs the shop by asking, with figures from her database and PayPal. |
| 12 | 2:25.5–2:30.0 | It also defends disputes with evidence she approves, |
| 12 | 2:30.0–2:35.0 | survives fifty live attacks on its own MCP server, |
| 12 | 2:35.0–2:39.7 | and pays each seller directly through PayPal. |
| 13 | 2:40.3–2:44.8 | Shopfront Agent: every seller, buyable by every agent, settled by PayPal. |

*If Phase 12 is cut, replace the 2:35 cue with "and shows every guardrail that caught them." Change "settled by PayPal" only if the settlement claim changes (D-006).*

## What got shortened (v1 → v2)

| Beat | v1 | v2 | Change | What was cut |
|---|---|---|---|---|
| 1 Problem | 12 s | 10 s | −2 | One sentence merged |
| 2 Title | 8 s | 6 s | −2 | A shorter resolve into the hero |
| 3 Photos → catalog | 26 s | 21 s | −5 | The zoom on the catalog id is dropped; the toast stays |
| 4 Storefront | 8 s | 5 s | −3 | One zoom only |
| 5 Split buy | 28 s | 23 s | −5 | One cue fewer; the wire is shown sooner |
| 6 Hack | 15 s | 12 s | −3 | The result card only, no per-attack zooms |
| 7 Approve + webhook | 21 s | 17 s | −4 | The popup login is cut in the edit (the approval click stays) |
| 8 Label → tracking | 14 s | 10 s | −4 | The thank-you note is shown only briefly |
| 9 Refunds | 18 s | 13 s | −5 | Double-tap safety moves to the arena |
| 10 **Vault reorder (new)** | — | 20 s | +20 | |
| 11 Dashboard | 10 s | 8 s | −2 | One question |
| 12 **Montage (new)** | — | 15 s | +15 | |
| 13 Recap | 5 s | 5 s | 0 | |
| **Total** | **165 s** | **165 s** | 0 | |

## Capture prerequisites (checked by the capture script)
- **Before every take:** the service is warm, and a demo reset has run (D-054). The live wire uses `?from=now` (D-058). Old test checkouts are hidden from `/live` (D-062 #2, Phase 9).
- **Photos:** the owner's photo listings are published and frozen (AT-3).
- **Beat 9:** a $95 bowl order is paid off camera.
- **Beat 10:** a fresh consent exists for the sandbox buyer, with nothing used yet. The over-cap order must exceed the remaining cap.
- **Beat 12:**
  - Disputes are opened at least 1 day before (PLAN 11.1).
  - A finished arena run exists.
  - Seller 2 is onboarded (if Phase 12 shipped).
- **Beat 11:** sales were seeded at least 24 h earlier, for Transaction Search.
- **PayPal popups:** allowed, and the sandbox buyer is logged in once in the capture profile.

## Honesty checks for the edit
- Settlement goes to one platform account unless Phase 12 shipped (D-006).
- The consent cap is enforced by Shopfront, not PayPal (PLAN 10.4).
- "Agent-buyable", not "discoverable".
- Every AI step keeps its source badge (plain wording from Phase 9).
- No staged data: every number on screen comes from a real sandbox call.
