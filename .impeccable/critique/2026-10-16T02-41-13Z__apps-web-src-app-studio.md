---
target: Phase 7 seller+buyer surfaces
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-10-16T02-41-13Z
slug: apps-web-src-app-studio
---
⚠️ DEGRADED: single-context (harness spawns sub-agents only on explicit user request)

Targets: /studio, /studio/orders, /shop, /s/juniper_clay, /live (Render, 1440 and 390 wide)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 4 | Live wire, confirmation badges, AI source badges |
| 2 | Match system / real world | 3 | "MCP", "Live wire" are jargon for sellers, explained inline |
| 3 | User control and freedom | 3 | Discard drafts, preview toggle; no undo on refund (by design) |
| 4 | Consistency and standards | 2 | Seller nav differed on every page; studio tiles vs storefront placeholders |
| 5 | Error prevention | 4 | Price confirmation enforced, refund double-tap safe |
| 6 | Recognition rather than recall | 2 | Dashboard unreachable from studio |
| 7 | Flexibility and efficiency | 3 | Starters, keyboard ledger edit |
| 8 | Aesthetic and minimalist design | 3 | Orders: 18 identical cards, no summary |
| 9 | Error recovery | 3 | Manual draft fallback when AI fails |
| 10 | Help and documentation | 3 | Inline explanations, README |
| **Total** | | **30/40** | Good |

Detector: 0 findings across studio/shop/store/console/ui components.

Priority issues
- [P1] No path from /studio to /studio/dashboard; navigation differs per seller page (studio: Orders/Storefront/Live wire with Storefront in clay looking active; orders: back link + Live wire; dashboard: its own). Fix: shared SellerNav with aria-current.
- [P1] Seed listings have no photos: blank boxes in the studio, initials on the storefront. Real fix is AT-3 photos; interim: consistent placeholder.
- [P2] Seed listings show "Not mirrored to PayPal yet": mirror them at freeze.
- [P2] Storefront overflows 13px at 390px (MCP chip in auto grid column).
- [P2] Orders list has no summary of what needs action (to ship).
- [P3] Model-written note subjects in Title Case; wrapped starter chips centre-aligned.
