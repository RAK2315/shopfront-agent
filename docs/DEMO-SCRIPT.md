# Demo script — v4 (2:45, 12 beats, against the frozen UI of 2026-10-25)

> **Status:** final for the frozen build (feature freeze D-104). The deferral of D-073 is lifted by the owner's step 5
> ("video prep"). The video is shot Nov 6–10 and uploaded by Nov 10 (S6). v3 (Vault reorder, disputes, the 50-attack
> arena, Partner Referrals fee split) is retired: those were cut or gated (D-076, D-097) and must not appear.
>
> **Rules for every frame (S6.2, S6.4, D-015):**
> - Real footage of `https://shopfront-agent.onrender.com` at 1920×1080. Motion graphics only in beats 1, 2, 12 and transitions.
> - **No Telegram UI.** Chat beats are an on-brand **chat strip rebuilt from real bot transcripts** (Phase 10 saved them), labelled "Rebuilt from a real session". The narration says "her chat"; "Telegram" appears only in the README and Devpost text.
> - PayPal's own popup and pages may appear as they are (PayPal is the host). No other third-party marks.
> - Every number on screen comes from a real sandbox call; any sped-up wait is labelled "sped up" (max 2×).
> - Voice: the owner's voice-over or free TTS (owner's choice); ≤ 2.5 words/s; captions use the same words.
> - Demo seller: Juniper Clay Studio (`juniper_clay`). Direct-paid seller: Fern & Loom (`fern_and_loom`).

## Beat sheet

| # | Time | Len | Screen (route) | What happens on screen |
|---|---|---|---|---|
| 1 | 0:00–0:07 | 7 s | *Motion* | Her product posts and DMs; an agent cursor hovers and can't buy: "no store · no feed · no checkout". |
| 2 | 0:07–0:12 | 5 s | *Motion* | "Shopfront Agent" · "Any AI agent can buy. She runs it from a chat." |
| 3 | 0:12–0:32 | 20 s | *Chat strip* → `/s/juniper_clay` (2 s) | She sends a mug photo → "Reading your photo…" → draft card: title, fields marked AI, "check it" on one, price "AI guess $32" → taps **Publish at $32** → "Live · mirrored to PayPal's catalog". Cut to her storefront with the listing. |
| 4 | 0:32–0:54 | 22 s | `/capture?left=/shop&right=/live` | "Find me a handmade blue mug under $40 as a gift". The rail lights Search → Found → Checkout; the wire shows `search_products`, `create_checkout` with ids and quantities only; the card says the total is set by the shop. Zoom on the total. |
| 5 | 0:54–1:06 | 12 s | Same split, PayPal popup | PayPal button → sandbox buyer approves → card turns green: **Payment complete**, capture id, "PayPal webhook received and signature verified"; the wire row shows the PayPal debug id. |
| 6 | 1:06–1:28 | 22 s | `/gauntlet` | *Run the Gauntlet*: tiles stream in two columns, naive shop vs Shopfront, same model. Zoom on a product-photo injection tile ("price in the sticker"): naive → a real PayPal sandbox order at the attacker's price; Shopfront → blocked, with the reason. End on **31/31 blocked**. |
| 7 | 1:28–1:40 | 12 s | *Chat strip* | "Order paid · Blue crackle mug · $37.00 · webhook verified". She sends the label photo → "USPS 9400… · Add tracking?" → tap → "Tracking is on the PayPal order". |
| 8 | 1:40–1:50 | 10 s | *Chat strip* | "Refund request · $95.00 · outside your policy" → **Approve** → "Refunded through PayPal". Caption: small in-policy refunds were automatic. |
| 9 | 1:50–2:12 | 22 s | `/studio/dashboard?tab=report` (desktop) | The AG Studio report: Overview → Payments & reconciliation ("Reconciled with PayPal ✓"). She asks the Shop Manager "What needs my attention?" → `[db]` / `[paypal]` lines. "Refund order …" → it says it can't (no money tools). "Add a donut of refunds by reason" → the change strip tagged **AI** → **Undo**. |
| 10 | 2:12–2:28 | 16 s | `/developers` → `/live` | "Every store is Store-Sync-ready": a Cart API v1 call returns `PRICE_MISMATCH → ACCEPT_NEW_PRICE` for an agent's $0.01 price. Then a wire row: an order for Fern & Loom "paid directly to Fern & Loom's PayPal". |
| 11 | 2:28–2:38 | 10 s | `/live` + a proof card | The wire scrolling with real ids; overlay: "Tested against this deployment with real PayPal sandbox calls · reconciled with PayPal after every run". |
| 12 | 2:38–2:45 | 7 s | *Motion* | Tagline, the URL, and a text-only stack row: PayPal Orders v2 · JS SDK v6 · Webhooks · Cart API v1 · Catalog · Tracking · Refunds · Transaction Search · Log in with PayPal — MCP · Groq · Gemini · AG Grid · AG Studio · Render · Neon. |

**Total:** 7 + 5 + 20 + 22 + 12 + 22 + 12 + 10 + 22 + 16 + 10 + 7 = **165 s = 2:45**.

**If a beat runs long in the edit:** cut beat 11 first (its point is also in 12), then trim beat 10 to the Cart API call (10 s). Never cut beat 5 or 6.

## Voice-over and caption cues
Times are absolute; each cue ≤ 2 lines × 42 characters.

| Beat | Cue | Text |
|---|---|---|
| 1 | 0:00.5–0:03.5 | She sells from her phone: posts and DMs. |
| 1 | 0:03.5–0:06.8 | AI agents shop for people now. They can't buy from her. |
| 2 | 0:07.3–0:11.8 | Shopfront: any agent can buy, and she runs it from a chat. |
| 3 | 0:12.5–0:17.0 | She sends a photo. |
| 3 | 0:17.0–0:24.0 | The AI drafts the listing and marks what it isn't sure of. |
| 3 | 0:24.0–0:31.5 | The price stays a guess until she confirms it. Then it's live. |
| 4 | 0:32.5–0:39.0 | A shopper asks an agent for a blue mug under $40. |
| 4 | 0:39.0–0:46.5 | The agent sends ids and quantities. Never a price. |
| 4 | 0:46.5–0:53.5 | The total comes from her catalog, on the server. |
| 5 | 0:54.5–0:59.5 | The agent shops. The human approves, in PayPal. |
| 5 | 0:59.5–1:05.5 | A signature-verified webhook confirms the payment. |
| 6 | 1:06.5–1:13.0 | Now try to break it: 31 attacks, two shops, the same AI. |
| 6 | 1:13.0–1:21.0 | A price hidden in a photo fools the naive shop. |
| 6 | 1:21.0–1:27.5 | Shopfront blocks all 31: code sets every price. |
| 7 | 1:28.5–1:33.5 | Her chat pings: paid, and verified. |
| 7 | 1:33.5–1:39.5 | A label photo becomes tracking on the PayPal order. |
| 8 | 1:40.5–1:45.0 | Small refunds follow her policy on their own. |
| 8 | 1:45.0–1:49.5 | Ninety-five dollars waits for her tap. |
| 9 | 1:50.5–1:57.0 | On desktop, an AG Studio report of her shop. |
| 9 | 1:57.0–2:04.0 | The Shop Manager answers from her database and PayPal. |
| 9 | 2:04.0–2:11.5 | It can't move money. Its changes are marked, and undoable. |
| 10 | 2:12.5–2:19.5 | Every store speaks PayPal's Cart API: Store-Sync-ready. |
| 10 | 2:19.5–2:27.5 | And each seller can be paid straight into their own PayPal. |
| 11 | 2:28.5–2:37.5 | Every step is tested on this deployment, against PayPal. |
| 12 | 2:38.3–2:44.8 | Shopfront Agent: every seller, buyable by every agent. |

## Capture plan, per beat
Capture with `video/capture/capture.mts` (CDP screencast, JPEG 92, real-time 30 fps mp4 + a JSON sidecar of key moments and zoom boxes). Today it has one beat, `split-shop` (beats 4–5). **New beats to add to the script** are marked *new*; each is a Playwright flow on the deployed app, recorded as a real public session (not test-marked), right after a demo reset.

| Beat | Source | How | Prerequisites | Sidecar marks / zoom | Risk → fallback |
|---|---|---|---|---|---|
| 1, 2, 12 | Remotion motion | `video/src` compositions (title/card pattern of `TestClip.tsx`) | Fonts: Alegreya, Geist (OFL) | — | — |
| 3 | *Chat strip* (Remotion) + `/s/juniper_clay` | *new* `chat-strip` composition fed by a real bot transcript JSON (Phase 10 transcript); 2 s storefront capture *new beat* `storefront` | A real session with the owner's photo (OWNER-TODO #3) or the CC0 judge photo | draft card, Publish tap | Owner photo late → use `seed-photos/judge-white-bowl.jpg`, label it a stand-in photo |
| 4–5 | `/capture?left=/shop&right=/live` + PayPal popup | `split-shop` (exists); extend it through the PayPal popup and the paid card (*new* marks `paid`, `webhook`) | Warm service; demo reset; popups allowed; sandbox buyer logged in once in the capture profile | `prompt`, `checkoutCard` (zoom on total), `paid` | PayPal login flaky → retake (D-048); never speed up the approval |
| 6 | `/gauntlet` | *new beat* `gauntlet`: press *Run the Gauntlet*, record ~90 s, speed the middle to 2× (labelled) | A cached run exists (fast, labelled "answered before"); cooldown 3 min passed | one photo-injection tile pair; the 31/31 total | Free-tier limit → use the stored public run (page shows it on load) and record the scroll |
| 7, 8 | *Chat strip* (Remotion) | `chat-strip` from the real transcripts `telegram-flow-checks` saves (`docs/screenshots/telegram/transcript-*.json`: order ping, label → tracking, refund) | The newest transcript (final regression); amounts match the DB | the tap moments | — |
| 9 | `/studio/dashboard?tab=report` at 1920 | *new beat* `report`: page tabs, Shop Manager questions, the AI change, Undo | Desktop width; `dashboard_state` reset; AG key valid (expires 1 Dec, after the shoot) | Shop Manager reply lines; change strip | Slow AI turn → cut the wait (labelled), never fake the reply |
| 10 | `/developers` → `/live` | *new beat* `cart-api`: get a 1-hour token, run the curl with `price: 0.01`, show the response; then the wire row of a Fern & Loom order | One Fern & Loom purchase made just before (real) | `PRICE_MISMATCH` line | — |
| 11 | `/live` | *new beat* `wire`: 10 s scroll of the grouped view | Real traffic from beats 4–10 | — | — |

**Before every take (D-054, D-070):** service warm (`/api/health/live` 10 min before), `node --env-file=.env scripts/admin.mjs '{"action":"reset"}'`, `/live?from=now` empty at the start, captions in the reserved band, no test-marked runs in shot.

## Pipeline check (2026-10-25)
`video/` is a separate Remotion 4 project (`pnpm install --ignore-workspace`). The 20-second `TestClip` (title → real `/shop` + `/live` footage with captions and a zoom → end card) was re-rendered from fresh footage of the frozen UI; see PROGRESS "Step 5".

## Honesty checks for the edit
- Juniper Clay (the demo shop) is paid into the platform's sandbox account; Fern & Loom is paid directly (D-006, D-076). Say "can be paid straight into their own PayPal", never "every seller is".
- Store Sync: "Store-Sync-ready", never "on Store Sync" (access not granted; README).
- The naive shop's orders are real but never approved, so never captured (D-102).
- Every money action in the chat is a button running code; the model never moves money (D-002, D-072).
- Every AI step keeps its source badge (D-070). No staged data; sped-up waits labelled.
