# Progress log (D-085 autonomous run)

One 5-line report per item: done, tests, screenshots, risks, next. Newest last.

## #13 + #12: approval bug, refund re-walk, "link incomplete or expired" page (2026-10-18)
- **Done:**
  - Found and fixed the bug that left the owner's walkthrough order unpaid: v6 `presentationMode: "auto"` opened no PayPal window on about 1 in 5 fresh pay pages, and the button then stayed dead.
  - Now an explicit popup, a redirect fallback when it's blocked, and a "Continue in this tab" link (D-086).
  - Branded "This payment link is incomplete or expired" page, a branded site 404, and a "nothing was charged" message after a redirect cancel.
  - Render no longer redeploys on docs-only pushes (D-085).
- **Tests:**
  - `approval-checks` on Render. AP1 popup via `/shop` paid; AP1b refund re-walk (PayPal refund `1AN57176SK298430G` COMPLETED); AP2 redirect approval paid through `/pay/return`; AP4 dead ends 404 and branded, no order shown, no mobile overflow.
  - **On the fix deploy `06449ab`: 6/6.** AP1 popup on the first click; AP1b refund `12X63911H3080041X` COMPLETED; AP2 redirect; AP3 redirect cancel says nothing was charged and the checkout stays `created`; AP4 dead ends; **AP5 8 of 8 first clicks open PayPal**, and the escape link equals the order's `payer-action` link.
  - Unit tests: `paypal-presentation`.
- **Screenshots:** `docs/screenshots/approval/`.
- **Risks:** "auto" was PayPal's recommended mode. If the explicit popup is ever blocked, the redirect path carries the payment (proven by AP2).
- **Next:** #1 photos.
