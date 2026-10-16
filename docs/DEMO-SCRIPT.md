# Demo script — v1 (target **2:45**, 11 beats)

> Built programmatically in Phase 8 (D-057, plan in PLAN.md Phase 8). Every product beat is a real capture of the deployed app at `https://shopfront-agent.onrender.com`, 1920×1080 (S6.2). Motion graphics only for beats 1, 2 and 11. Logos: PayPal (host) and the sponsor tools actually used, unaltered; no others (D-057, S6.4).
>
> **Voice:** undecided (owner VO or free TTS). Each beat's line is written at ≤ 2.5 words/s so either fits, and the caption cues below are the same words. `video/src/beats.ts` is generated from this table in Phase 8; if they disagree, this file wins until then.
>
> **Demo seller:** Juniper Clay Studio (`juniper_clay`). If the owner's photos are not ceramics, the studio is renamed to match (D-050) and beats 3–4 change wording only.

## Beat sheet

| # | Time | Len | Screen (real route unless marked) | What happens on screen |
|---|---|---|---|---|
| 1 | 0:00–0:12 | 12 s | *Motion graphic* | A grid of social-post product photos; a DM thread "is this still available?"; an agent cursor hovering, then a "no store, no feed" state. |
| 2 | 0:12–0:20 | 8 s | *Motion graphic* → `/` | Title "Shopfront Agent" resolves into the landing page hero (the live wire). |
| 3 | 0:20–0:46 | 26 s | `/studio` | Six photos dropped on "Drop photos of your pieces". Draft cards stream in; low-confidence fields show the warning tint and "Check this"; the price field says "AI guess". She types prices and publishes ("Publishes to your shop and PayPal's catalog"); the toast says "is live and mirrored to PayPal" and the tile shows "In PayPal catalog". Zoom on one low-confidence field, then on the PayPal catalog id. |
| 4 | 0:46–0:54 | 8 s | `/s/juniper_clay` | The public storefront with the new listings; zoom on the "agent-buyable" note with the MCP endpoint. |
| 5 | 0:54–1:22 | 28 s | `/capture?left=/shop&right=/live` (split) | Left: the starter "Find me a handmade blue mug under $40 as a gift". Tool calls stream (`search_products` → `get_product` → `create_checkout`), with the Groq source badge. The checkout card shows "Total (set by the shop)" and "Review and pay with PayPal". Right: the same calls arrive on the live wire, then PayPal "order created" with its id. |
| 6 | 1:22–1:37 | 15 s | same split | "Try to hack the price": three attacks, each blocked by the server; "Checkouts created: 0". Right: three `create_checkout blocked by server` rows. |
| 7 | 1:37–1:58 | 21 s | `/pay/{id}` + PayPal sandbox popup | "Review and pay with PayPal" → popup → sandbox buyer approves → page shows Paid, then the confirmation badge flips to "Webhook verified". Cut-in of the live wire row `PAYMENT.CAPTURE.COMPLETED · verified`. |
| 8 | 1:58–2:12 | 14 s | `/studio/orders` | Label photo uploaded on the paid order; carrier and tracking number suggested; she taps "Confirm and add to PayPal order"; the order shows "read from label photo · on the PayPal order". The thank-you note is shown on the buyer's order page. |
| 9 | 2:12–2:30 | 18 s | `/shop` (left of split) → `/studio/orders` | Buyer: "It arrived the wrong size. Can I get a refund?" → `request_refund` → "auto refund · $32.00 (server computed)". Cut: a $95 bowl refund (a prior order) in "Refunds waiting for you"; one tap → executed; the live wire shows the PayPal refund and `PAYMENT.CAPTURE.REFUNDED`. |
| 10 | 2:30–2:40 | 10 s | `/studio/dashboard` | AG Studio: "What sold this week?" → answer with `[db]` and `[paypal]` figures; "chart refunds by product" → a chart widget appears. |
| 11 | 2:40–2:45 | 5 s | *Motion graphic* | Tagline, the hosted URL, and the stack row: PayPal Orders v2 · JS SDK v6 · Webhooks · Catalog · Tracking · Refunds — MCP · Groq · Gemini · AG Studio · Render · Neon. |

Total: 12 + 8 + 26 + 8 + 28 + 15 + 21 + 14 + 18 + 10 + 5 = **165 s = 2:45**.

## Voice-over and caption cues

Cue times are absolute (video time). One cue = at most 2 lines × 42 characters.

| Beat | Cue | Text |
|---|---|---|
| 1 | 0:00.5–0:05.0 | Makers sell through social posts and DMs. |
| 1 | 0:05.0–0:11.5 | AI agents now shop for people, but they can't buy from a seller with no website and no product feed. |
| 2 | 0:12.5–0:19.5 | Shopfront Agent turns her photos into a store any agent can buy from, settled by PayPal. |
| 3 | 0:20.5–0:26.0 | She drops in six photos. |
| 3 | 0:26.0–0:33.5 | Gemini reads each one into a draft listing and marks what it isn't sure of. |
| 3 | 0:33.5–0:39.0 | Prices stay an AI guess until she types them. |
| 3 | 0:39.0–0:45.5 | She approves, and each listing is mirrored into PayPal's catalog. |
| 4 | 0:46.5–0:53.5 | Her store is live, and buyable through one MCP endpoint shared by every Shopfront seller. |
| 5 | 0:54.5–1:01.0 | A shopper asks an agent for a blue mug under forty dollars. |
| 5 | 1:01.0–1:08.5 | On the right, the live wire: every MCP call and every PayPal request. |
| 5 | 1:08.5–1:14.5 | The agent sends product IDs and quantities, never prices. |
| 5 | 1:14.5–1:21.5 | The total comes from her catalog, on the server. |
| 6 | 1:22.5–1:29.5 | Now try to cheat: a zero price, a fake discount, a negative quantity. |
| 6 | 1:29.5–1:36.5 | The server rejects all three. No checkout, and no model is even called. |
| 7 | 1:37.5–1:44.0 | The agent shops. The human approves, in PayPal. |
| 7 | 1:44.0–1:51.0 | The server captures the payment, and a signature-verified webhook confirms it. |
| 7 | 1:51.0–1:57.5 | If a webhook is ever lost, a fallback check confirms it instead. |
| 8 | 1:58.5–2:04.5 | To ship, she photographs the label. |
| 8 | 2:04.5–2:11.5 | She confirms the tracking number it reads, it's attached to the PayPal order, and a thank-you note is posted. |
| 9 | 2:12.5–2:18.5 | Refunds follow her policy, written in code. |
| 9 | 2:18.5–2:23.5 | A small wrong-size refund runs automatically. |
| 9 | 2:23.5–2:29.5 | A ninety-five-dollar one waits for her tap, and a double tap can't refund twice. |
| 10 | 2:30.5–2:35.0 | And she runs the shop by asking. |
| 10 | 2:35.0–2:39.5 | Her dashboard agent answers from her database and from PayPal, labelled, and builds the chart. |
| 11 | 2:40.3–2:44.8 | Shopfront Agent. Every seller's store, buyable by every agent, settled by PayPal. |

## Capture prerequisites (checked by the capture script)
- Service warm (`/api/health` ok), then `POST /api/admin/demo {reset}` (D-054).
- The owner's photo listings published and the catalog re-frozen (AT-3). Until then beats 3–4 use the rendered placeholders and are re-captured later.
- A paid $95 Ash-glaze serving bowl order by the sandbox buyer, made off camera before beat 9, so the queue has a real over-threshold request.
- Seeded sales at least 24 h before recording, so Transaction Search has PayPal figures for beat 10 (D-007, PLAN §2 #10).
- Popups allowed and the sandbox buyer logged in once in the capture profile (PLAN §2 #2).

## Honesty checks for the edit
- No claim that sales settle to the seller's own PayPal account: the sandbox settles to one platform account (D-006).
- "Agent-buyable", not "discoverable": an agent needs our MCP connector added (PLAN §0 #1).
- Every AI step shows its source badge (Groq, Gemini, cache, replay) as captured; never edit a badge out.
