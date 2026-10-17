# AT-5 re-run on Render, 2026-10-18

- **First attempt:** the first MCP call timed out on a Render cold start. Re-run.
- **Second run (`381c5f5`):**
  - #1, #2, #3, #5 and #6 pass. Lighthouse accessibility: dashboard 95, storefront 100.
  - **#4 fails on wording only.** The figures matched Transaction Search (32 transactions, $1,490.00), but the model wrote "DB:" / "PayPal:" instead of the `[db]`/`[paypal]` labels.
- **The fix:** each tool returns a code-written `summary_line` that the agent quotes (D-083).
- **#4 on `89a9f54`: ✅** "[db] $1701.00 revenue from 39 orders; 24 refunds ($879.00). [paypal] $1490.00 gross from 32 transactions; 17 refunds ($623.00)". The PayPal figures equal an independent Transaction Search.
- **The demo reset ran after each AT-5 run** (200; the dashboard layout was cleared, including the refund-spike alert).
