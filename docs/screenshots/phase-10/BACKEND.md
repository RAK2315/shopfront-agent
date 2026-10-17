# Phase 10 backend ATs on Render (D-082), 2026-10-18, `df3a807`

`pnpm --filter web telegram-checks -- --base https://shopfront-agent.onrender.com`. The updates are posted to our own `/telegram/webhook` with the real secret, from made-up chat ids. Telegram refuses replies to those chats, so the checks read our database. The made-up links are revoked at the end. Results: `telegram-backend-results.json`.

| AT | Result |
|---|---|
| T1 wrong or missing secret | ✅ 401 and 401 |
| T2 the same `update_id` twice | ✅ both get 200; one `telegram_updates` row, processed once |
| T3 link codes | ✅ no session → 401. The demo seller without the owner token → 403. With it → a `t.me/juniper_clay_copilot_bot?start=<code>` link, which links one chat. The same code from a second chat → refused. An expired code → refused |
| T4 `/start judge` | ✅ linked to `judge_demo` (`test_only`), with `is_demo` |
| T5 the action executor | ✅ a judge tapping the owner's action, the owner tapping a judge action, an expired action and an unknown id are all refused (`used_at` stays null). A valid tap is claimed, the handler runs (here, "Refund request not found" for a made-up id), and a double tap changes nothing |
| T6 `judge_demo` isolation | ✅ 0 in global search, 2 by `seller_handle`. A checkout with no test header is `is_test`. Not in `llms.txt` |

**Hygiene:** the first run's T6 searches went out as a public visitor and wrote 2 public `tool_call` rows. They were archived as test, and T6 now searches as a test run. The re-run wrote 0 public rows.
