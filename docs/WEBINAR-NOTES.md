# Webinar notes — "Start building with PayPal" (kickoff, Oct 6, 2026)

> Source: `personal research/paypal intructions and stuff requrements and guidance transcipt.txt` (auto-transcript, so some names are garbled).
> Speakers: Joe (PayPal developer advocate, hackathon and AI Toolkit), Marco (PayPal developer advocate, products and Agent Toolkit), Eddie (PayPal developer advocate, sandbox and webhooks). Host from Devpost.
> The binding items are copied with IDs into `REQUIREMENTS.md` (G1–G17). This file keeps the full context and every useful detail.

---

## 1. Hackathon basics (Joe)

- Global, online, **six weeks**. "Submissions close on November the 12th at 2:00 p.m. Pacific time." *(Devpost says 3 PM EST; we use the earlier time, see D-004.)*
- **One hard requirement:** the project must **meaningfully** use both PayPal and AI.
  - AI: "use whatever tool, whatever model, whatever platform you like. We're not going to prescribe a stack."
  - **"Meaningfully" = adding a PayPal button to an unrelated app is not enough. PayPal should be central to what your project does, not bolted on at the end.**
- Steps: register on Devpost, create a free PayPal developer account, build and test in the free **sandbox** (no real money, nothing to pay).
- **Devpost submission form asks for:**
  - Project name.
  - **Elevator pitch**: "what you would say… to your friend at the pub or to an investor." A few sentences.
  - **Project story**: what inspired you, how you built it, what tools you used, why you built it.
  - **GitHub repo link with an open-source license listed** on the repo.
  - **Demo video under 3 minutes**: "goes over project, how it works, what you did, what decisions you made."
  - **Written description** of what the project does.
  - **List of the tools you used and how you used them.**
- **Existing projects are allowed**: make meaningful progress in the six weeks and **tell them what you changed**.
- **You can enter more than one project**, as long as they are substantially different.
- Eligibility is global, with **standard legal exclusions for some countries**. Check the rules page.
- Prizes: more than $67,500 in cash and credits. Top 3: $12k / $8k / $5k. Five special awards of $5k each: Most Creative, Most Impactful, **Best Demo Delivery** ("that three-minute video could get you $5,000 if you do it well"), Best Use of PayPal + AI, Best Use of Agentic Commerce. Partner prizes from AG Grid, APIMatic, Bryntum, Channel3 and Render.
- **Prize stacking:** one project can win a grand prize *and* a partner prize.
- **Judging is split evenly across five criteria:** technical implementation, design, potential impact, innovation, **presentation**. "Presentation is a full fifth of your score… make sure that people can understand what it is that you've built."
- 10 partners: AG Grid, APIMatic, Astropods, Bryntum, Channel3, Elastic, Kernel, Postman, Render, Zapier.
  - Each has a free-resources page on Devpost. Using them is optional.
  - "Have a look at the partners and their prizes before you settle on what you're going to build."
- Help: the **PayPal Discord**. The team is there for the full six weeks. Ask in public channels.
- "**Don't leave the demo video until the last minute.**"

## 2. PayPal products overview (Marco)

- PayPal is a **house of brands**: PayPal, Venmo, Braintree, Hyperwallet and more. Some need **regional availability or business whitelisting**, which may be out of scope for a hackathon. Check before depending on them.
- **Start from the problem, not the product.** "Think about a problem that you have… then we map this to the PayPal capabilities."
- Capabilities, usually via API:
  - **Payment acceptance**: buttons, links, donations, Venmo (mostly US), Pay Later (BNPL), Fastlane (accelerated checkout), vault.
  - In-person POS is possible but probably out of scope, because getting terminals takes time.
  - **Business features**:
    - Invoicing.
    - Subscriptions (tiers; the app is notified by **webhooks**).
    - **Payouts** (distribute money, not just accept it).
    - **Disputes** (PayPal as judge between buyer and merchant).
    - Identity (**Log in with PayPal**).
    - **Order tracking**.
- Discover everything at **developer.paypal.com → Getting started**. Each topic has examples and code.
- **Postman:** `postman.com/paypal` has official collections: the public API workspace, Braintree, and **agentic commerce examples**. The collections include end-to-end **workflows**. "Highly recommend."
- **Developer docs → Developer resources → AI tools** lists:
  - **Agent Toolkit**: tools to hand to agent frameworks (LangChain, CrewAI, TypeScript equivalents, Mastra, Vercel AI SDK; adaptable to others; PayPal will help). **Not the same thing as the AI Toolkit.**
  - **Agent tools**: the individual tools.
  - **MCP server**: the same one the AI Toolkit uses.

## 3. PayPal AI Toolkit (Joe)

- Open-source plugin at **github.com/paypal/AI-Toolkit**. It puts PayPal API knowledge into your coding agent, so you get **current recommendations instead of "a blog post from 2019"**.
- Works with **Claude Code** (CLI or Desktop) and OpenAI Codex (plugin marketplace). Also Cursor, per the README.
- Skill **`paypal-best-practices`** auto-loads on PayPal work. It covers:
  - Recommended and **deprecated** APIs.
  - OAuth and credential handling.
  - Orders, subscriptions and invoice flows.
  - **Webhook setup checks**, error handling, sandbox testing.
- Slash commands:
  - `/paypal:setup`: configure the plugin, verify credentials, connect MCP, **refresh tokens**.
  - `/paypal:sandbox [topic]`: sandbox setup and testing (e.g. webhooks, subscriptions).
  - `/paypal:test-accounts`: demo cards, demo Venmo, **webhook scenarios**.
  - `/paypal:explain-error <code>`: explains a PayPal error code.
  - `/paypal:doctor [symptom]`: scans the codebase for integration mistakes, e.g. `/paypal:doctor webhooks aren't firing`.
  - **"When something breaks at 2 am in week four, PayPal Doctor and Explain Error are going to be your best friends. Get the AI toolkit installed now."**
- Connects to PayPal's **sandbox MCP server**. Tools cover:
  - Orders and payments: create order, capture, refund.
  - Invoices: create, send, manage, QR codes.
  - Subscriptions: billing plans, management.
  - Disputes: list, respond.
  - Catalog: products, pricing.
  - Shipments: create and track.
  - Reporting: list transactions, **merchant insights**.
- Example: "create a subscription plan at $9 a month with a two-week trial and subscribe this test buyer". "If you're planning on building agents yourself, this is a working example of an agent that moves money in a sandbox."
- **MCP setup, 4 steps:**
  1. Install the toolkit and start the agent with the plugin loaded.
  2. Get the client ID and secret from the developer dashboard.
  3. Run a **client-credentials curl** to get an access token.
  4. Put the token in the agent's `settings.json` `env` block as the PayPal sandbox access token variable. **Fully quit and reopen** the app (`/clear` isn't enough). Then run `/paypal:setup` to verify.
- **Gotcha: tokens expire roughly every ~9 hours.** You'll hit a **401**. Run `/paypal:setup refresh`; it becomes a habit.
- "The MCP server is for anything money shaped in your project."
- Feedback welcome: open issues or PRs on the repo (e.g. add missing error codes). "Having shipped a commit to the PayPal org is a brilliant thing to have on that CV."

## 4. Sandbox (Eddie)

### What it is
- A safe copy of PayPal: fake accounts, fake cards, editable balances. Sandbox and live are **completely separate**.
- **Business account = merchant (receives money). Personal account = customer (pays).**
- Accounts behave like real ones: email, password, balance. You can test paying, **cancelling, refunding**, and viewing the transaction from both sides.
- Build, test, **break it and fix it** in the sandbox. Go live only at the very end by swapping env vars.

### Developer dashboard walkthrough
- Go to developer.paypal.com (or the code icon `</>` top right from paypal.com). **Make sure the top-left toggle is on Sandbox.**
- **Testing Tools → Sandbox Accounts**: two default accounts exist, marked "default". You can create more.
  - When creating, pick **Personal or Business** and the **region**; the currency follows the region.
  - **Put the personal and business accounts in the same country.** Different countries cause currency confusion.
  - Edit an account to change the email, password, name (shown to the payer), **balance** and credit cards. Generic test cards and sandbox cards are available.
  - **Name your sandbox accounts.** It matters when you link apps to them.

### Apps and credentials
- An **app** tells PayPal who your code is and which merchant gets the money.
- Create one under the sandbox account, or under **Apps & Credentials → Create App**.
  - Type: **Merchant** for most people.
  - **Select which sandbox business account it belongs to.**
- Credentials:
  - **Client ID** is public; it's fine in front-end code.
  - **Secret is private**: server side only, never committed, never shared, never in the client.
  - Client ID + secret → **access token**, which is what API calls use.
  - The SDK fetches and **refreshes** tokens for you.
- **Sandbox credentials don't work in live, and live credentials don't work in sandbox.**
- Put credentials in **environment variables**: client ID, secret and **base URL**. Then going live is a swap with no code changes.
- App **Features** section: **enable Transaction Search** ("really useful… I use a lot"), Log in with PayPal, and more.
  - **Changes can take up to 10 minutes** to take effect.
  - **Click Save changes** at the bottom ("a lot of people forget").

### Webhooks
- Why: a payment may be **pending, declined, refunded later or reversed**. The browser only knows the moment of the click. Don't poll the API constantly. Webhooks matter even more for **subscriptions**, to know whether next month's payment succeeded or failed.
- How:
  - Register a URL to your API, and PayPal POSTs a payload to it.
  - **Localhost isn't reachable**: use **ngrok**, **Cloudflare Tunnel**, or an npm tunnel (e.g. Next.js on port 3000).
- **Reply with a 2xx** and PayPal stops. Anything else means PayPal **retries up to 25 times over 3 days** with backoff (aggressive at first). A redeploy blip is fine.
- Add the URL with your endpoint path appended. Select events: a group or sub-events. "Honestly I just select all events" and let the app ignore what it doesn't need.
- It takes a few minutes to take effect after saving.
- **A webhook belongs to an app, which belongs to a sandbox.** Live needs a separate registration with a different URL.
- **Verify that the request came from PayPal.** The SDK has tools for this, so nobody can fake an "upgrade account" event.

### Debugging tools
- **Testing Tools → Sandbox Notifications**: pick a test account to see the emails that *would* have been sent.
- **Event Logs:**
  - **API Calls**: filter by type and app; see request and response payloads and why something failed.
  - **Error logs**: per app.
  - **Webhooks**: see deliveries, **resend** them, and see how many times each was resent.

### Demo shown
- Cloned **PayPal's official examples repo** (`github.com/paypal-examples/docs-examples`).
  - Copied `.env.sample` → `.env` and added the client ID and secret.
  - `cd server/node && npm install && npm start`.
- Picked "simple PayPal button". Paid as the personal sandbox account (copied email and password from the dashboard). The order succeeded.
- Logged into **sandbox.paypal.com** as the personal account (payment sent, items listed) and then as the business account (payment received, with a **Refund** action available).
- **Test unhappy paths, not just happy paths.** The sandbox supports **negative testing**.
- Going live means changing **only the URL, client ID and secret**.

## 4b. Slides captured from the video (screenshots from the owner, 2026-10-15)

**"// 01 intro — What is the PayPal Sandbox?"**
- Inside the SANDBOX box (tagged **"no real money"**): **Personal = Customer** (email, password, test balance) **pays →** **PayPal Checkout →** **paid →** **Business = Merchant** (email, password, test balance).
- **Your app** (sandbox credentials) drives the Checkout.
- **TEST IT:** `pay` · `cancel` · `refund`. **SEE IT:** `both sides` (log into both accounts).
- **LIVE** is **completely separate**: real accounts, real money, live credentials. It's the "last stop".
- Tagline: **"Build it. Test it. Break it. Fix it." Then switch to Live →**

**"// 05 webhooks — Webhooks: PayPal calls you"** (presented by Eddie Jaoude)
- Flow: **PayPal: event happens** (payment, refund, decline), then **POST event →** **Your server: webhook listener** (a public HTTPS URL), which **replies 2xx**, then **Your app: update the order** (mark paid, send a receipt).
- Events you can subscribe to, as listed on the slide:
  - `CHECKOUT.ORDER.APPROVED`
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.REFUNDED`
  - `PAYMENT.CAPTURE.DECLINED`
  - *(PayPal's event reference names the last one `PAYMENT.CAPTURE.DENIED`, so we handle both. D-024.)*
- **The rules:**
  - subscribe → *per app, in its settings*
  - verify → *check the signature*
  - no 2xx? → *retries up to 25× / 3 days*
- Tagline: **"Don't poll. Let PayPal tell you."** Test it with the **Webhooks simulator**.
  - Our fallback checks are bounded per-checkout timers, used only when no webhook arrived (D-025).
  - Simulator events are for handler logic; verify signatures on real sandbox events.

**"// 08 scenarios — Test the unhappy paths too"** (Eddie Jaoude)
- 01 **Successful payment**: the happy path.
- 02 **Cancelled checkout**: the buyer walks away.
- 03 **Different users**: new buyer, new country.
- 04 **Refund**: from the merchant side.
- 05 **Failures + edge cases**: what breaks?
- Tagline: **"Break it here, not in production."** Every scenario, zero risk.
- → Adopted as an acceptance-test matrix: PLAN §2b, D-035.

## 5. What this means for Shopfront Agent

| Webinar point | Our response | Ref |
|---|---|---|
| PayPal must be central | Orders v2, webhooks, refunds, tracking and catalog *are* the product flow | G1, D-002 |
| Same-country accounts | US Business + US Personal | G3, SETUP §1 |
| Secret server-side, env vars incl. base URL | `PAYPAL_BASE_URL` env var; secret only in the API service | G4, G5 |
| Enable Transaction Search; wait 10 min; Save | SETUP §2.6 | G6, D-007 |
| Webhooks: 2xx fast, retries, verify | Verify → store → 200 → async process; idempotent | G7, PLAN AT-2 |
| Tokens expire (~9 h) | Server-side cache and refresh; `/paypal:setup refresh` for dev tooling | G8 |
| Test unhappy paths | Cancel, deny, double refund, forged webhook in ATs | G9 |
| Event Logs / resend | Used in AT-1 and AT-2 (resend = idempotency test) | G10 |
| Install AI Toolkit; use doctor and explain-error | SETUP §7; `/paypal:doctor` before each phase sign-off | G11 |
| Presentation = 20%, demo prize $5k | Script written early; video phase protected | J5, P6, G15 |
| Tell them what tools you used | README "Tools" section and Devpost field | S4 |
