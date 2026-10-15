# Product

## Register

product

> Owner answered "both". Default register is **product** (seller dashboard, event timeline, buyer-agent split screen, AG Grid ledger). **Brand register applies per task** to seller onboarding and public storefront pages (`/s/*`, the photo→catalog moment). One shared token system serves both.

## Users

- **Sellers**: independent makers who sell through social posts and DMs (ceramics, textiles, prints). They have no website or product feed. They use Shopfront on a laptop or phone between making and shipping. Jobs: turn photos into a store that agents can buy from, then watch orders, ship, and handle refunds without busywork.
- **Buyers and their AI agents**: a person asks an agent (our hosted `/shop` chat, or Claude Desktop through MCP) to find and buy something. The agent shops and the human approves the payment in PayPal.
- **Hackathon judges**: PayPal engineers and designers who watch a 3-minute split-screen video and click through the hosted demo. They must understand in seconds what's happening and trust that it's real.

## Product Purpose

Shopfront Agent turns a social-only seller's product photos into a PayPal-backed store that AI shopping agents can buy from, then runs post-sale operations with a policy-bound seller agent. Success looks like this:
- A seller goes from photos to an agent-buyable catalog in about 90 seconds.
- A buyer agent completes a real PayPal sandbox order.
- Every step (agent → MCP → PayPal → webhook → seller agent) is visible and verifiable.

## Brand Personality

**Tactile, trustworthy, alive.**
- **Seller onboarding and storefront (craft retail):** warm, product-photo-led, considered presentation; serif headings.
- **Dashboard, timeline and split screen (live ops console):** a system visibly working. Real request IDs, status changes that animate, dense and precise.
- **AG Grid ledger:** precision density within the console look, not a separate style.

The shift between surfaces is intentional, never "two apps": same palette, type scale and radius.

## Anti-references

- Generic dev-tool or admin-template look (default shadcn grey, purple gradients). "Must look like a finished product, not a dev tool."
- SaaS hero-metric templates; identical card grids; eyebrow labels on every section.
- Cream/sand "AI craft" backgrounds.
- PayPal blue used as decoration. Blue belongs only to real PayPal elements (PayPal button, PayPal-sourced events, PayPal IDs).
- Glassmorphism, gradient text, bouncy motion.

## Design Principles

1. **Show the machine working.** Every money step is visible: actor, request ID, source (gemini/groq/cache/replay), and how it was confirmed (webhook or poll). Trust comes from evidence, not adjectives.
2. **The agent shops; the human approves.** Human decisions (price confirmation, payment approval, refund approval) are the most prominent actions on any screen.
3. **The product is the photo.** On seller-facing surfaces, product imagery leads and UI chrome recedes.
4. **Never trade visual quality for convenience.** If a simpler stack would look worse, the stack changes.
5. **Honest about AI uncertainty.** Low-confidence fields are visibly marked, prices are always labelled "AI guess" until the seller confirms them, and no figure is shown without its source.

## Accessibility & Inclusion

- WCAG 2.2 AA: text contrast ≥ 4.5:1 (large text ≥ 3:1), visible focus, full keyboard operation.
- Every animation has a `prefers-reduced-motion` fallback (instant or crossfade).
- Status and confidence are never shown by colour alone; each has an icon and a text label.
