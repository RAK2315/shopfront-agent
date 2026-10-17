# Webhook and capture recovery (REVIEW-1 #8) and the agent's name on `/mcp`: ATs on Render (D-081), 2026-10-18

Run with `pnpm --filter web recovery-checks -- --base https://shopfront-agent.onrender.com --only <ids>` on `b0463b9`, and on `01e026d` after the `isPayPalApiError` fix. Every PayPal call is a real sandbox call.

| AT | Result | Evidence |
|---|---|---|
| **R1** PayPal's verify endpoint is unavailable (signed fault hook) | ✅ **503, nothing stored.** The same delivery without the fault gets PayPal's real `FAILURE` verdict, then 200 and stored unverified (`deliveries: 1`) | `results-R1-R4.json` |
| **R2** a verified event left unprocessed, then a Render restart | ✅ **The boot sweep processed it** 33 s after the restart call (`reason: "boot"`, attempts 2 → 3) | `results-R2-boot-path.json` |
| R2, first run | The sweep piggybacked on a fallback check (still armed for R3's order in the old process) and processed it 23 s after the reset, before the restart finished. The recovery worked, but the AT asked for the boot path, so it was re-run once those timers had ended | `results-R2-fallback-path.json` |
| **R3** `INSTRUMENT_DECLINED` (PayPal's sandbox negative testing, via the signed hook) | ✅ **The pay page shows "declined, choose another method".** `capture_attempt` 0 → 1. The capture calls are `capture-chk_cr7lagj37ia1` → **422** (debug `ca4c1b4999e7e`), then `capture-chk_cr7lagj37ia1-1` → **201** (debug `ca4c1b4a0de4f`). The order is paid | `results-R3.json`, `R3-declined-desktop.png`, `R3-paid-desktop.png` |
| R3, first runs | **Found a bug older than this work:** on Render the 422 went unhandled (`instanceof PayPalApiError` fails across Next bundles). Fixed in `01e026d` (D-081). Two other runs failed because the sandbox popup didn't open (D-048); the script now pauses 2.5 s after the button is ready | Render log, D-081 |
| **R4** the agent's name on stateless `/mcp` | ✅ `x-shopfront-client: recovery-checks` → `mcp_client_name = recovery-checks`. A raw tool call with `User-Agent: Claude-User/1.0` and no `initialize` → `Claude-User`. `/pay` reads "Prepared by **Claude** through Shopfront" | `results-R1-R4.json` |

Screenshots: only R3 touches a screen (the existing `/pay` page), and it was shot at desktop only. No new screens were built today (owner hold).
