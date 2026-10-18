import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Cable, Lock, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { asc, eq, schema } from "@shopfront/db";
import { DemoToken } from "@/components/site/demo-token";
import { REPO_URL, SiteNav } from "@/components/site/site-nav";
import { appUrl } from "@/server/env";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Developers",
  description: "Every Shopfront seller is Store-Sync-ready: PayPal's Cart API v1 merchant contract and an MCP server, for any shopping agent.",
};

const ENDPOINTS = [
  { m: "POST", p: "/merchant-cart", d: "Create a cart. 201 with PayPal's payment token and approval_url when it's valid; 200 with validation_issues when it isn't." },
  { m: "GET", p: "/merchant-cart/{id}", d: "The cart's current state: READY once the buyer approved in PayPal." },
  { m: "PUT", p: "/merchant-cart/{id}", d: "Replace the whole cart (the spec's rule). A changed cart gets a fresh PayPal order." },
  { m: "POST", p: "/merchant-cart/{id}/checkout", d: "Finish after approval, with the token and payer_id PayPal returned. The payment is authorized and charged when the shop ships." },
];

const ISSUES = [
  ["ITEM_NOT_FOUND", "REMOVE_ITEM", "A variant this store doesn't sell (other stores' listings included)"],
  ["ITEM_OUT_OF_STOCK · INSUFFICIENT_INVENTORY", "SUGGEST_ALTERNATIVE · MODIFY_CART", "Live stock; alternatives come from the same shop"],
  ["PRICE_MISMATCH", "ACCEPT_NEW_PRICE", "The agent sent a price. The shop's price stands; the agent's is never used"],
  ["MISSING_SHIPPING_ADDRESS", "UPDATE_ADDRESS", "REQUIRES_ADDITIONAL_INFORMATION until the agent sends one"],
  ["INTERNATIONAL_SHIPPING_RESTRICTED", "UPDATE_ADDRESS", "The store's ship-to countries"],
  ["MAXIMUM_QUANTITY_EXCEEDED", "MODIFY_CART", "1 to 10 per item"],
  ["DISCOUNT_CUSTOMER_INELIGIBLE", "REMOVE_COUPON", "No coupon codes: discounts can't be talked into existence"],
  ["MERCHANT_ACCOUNT_ISSUE", "CONTACT_SUPPORT", "A shop whose PayPal isn't verified can't take payments"],
] as const;

// The developer front door (D-097): PayPal's Cart API v1 per store, the MCP server, and a way to try both now.
export default async function Developers() {
  const { db } = services();
  // One in-stock variant per demo shop, for the copy-paste curl commands.
  const rows = await db
    .select({ handle: schema.sellers.handle, variant: schema.variants.id, stock: schema.variants.stock })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
    .where(eq(schema.products.status, "approved"))
    .orderBy(asc(schema.variants.priceCents));
  const variantId: Record<string, string> = {};
  for (const r of rows) if (r.stock > 0 && !variantId[r.handle]) variantId[r.handle] = r.variant;
  const base = appUrl("/api/paypal/v1/stores/{store}");

  return (
    <div className="min-h-dvh bg-canvas">
      <SiteNav tone="bar" />
      <main className="mx-auto grid max-w-[68rem] gap-12 px-4 py-10 sm:px-8 sm:py-14">
        <header className="grid max-w-[46rem] gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.1em] text-clay-strong">For shopping agents and developers</p>
          <h1 className="font-display text-display font-medium tracking-[-0.02em]">Every Shopfront seller is Store-Sync-ready</h1>
          <p className="text-md text-ink-2">
            Each shop answers PayPal&apos;s <span className="font-medium text-ink">Cart API v1</span>, the merchant contract behind PayPal Store Sync, and our MCP server. An agent builds a cart, gets validation issues it can resolve, and the buyer approves in PayPal.
            Prices, totals and every PayPal call come from deterministic code, never from the agent.
          </p>
        </header>

        <section aria-label="Two ways in" className="grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-2 rounded-lg border border-line bg-surface p-5">
            <ShoppingCart aria-hidden className="size-5 text-clay" />
            <h2 className="font-display text-xl font-medium">PayPal Cart API v1</h2>
            <p className="text-base text-ink-2">Built to PayPal&apos;s published schema (<code className="font-mono text-sm">@paypal/agentic-commerce-spec</code>). One base URL per store:</p>
            <code className="break-all rounded-md bg-surface-2 px-2 py-1.5 font-mono text-sm text-ink" data-testid="cart-base">{base}</code>
          </div>
          <div className="grid content-start gap-2 rounded-lg border border-line bg-surface p-5">
            <Cable aria-hidden className="size-5 text-clay" />
            <h2 className="font-display text-xl font-medium">MCP server</h2>
            <p className="text-base text-ink-2">Every seller behind one endpoint: search_products, get_product, create_checkout, get_checkout_status, request_refund. Tools take ids and quantities only.</p>
            <code className="break-all rounded-md bg-surface-2 px-2 py-1.5 font-mono text-sm text-ink">{appUrl("/mcp")}</code>
            <Link href="/llms.txt" className="text-sm font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
              llms.txt for crawler agents
            </Link>
          </div>
        </section>

        <section aria-labelledby="endpoints" className="grid gap-4">
          <h2 id="endpoints" className="font-display text-2xl font-medium">Endpoints</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {ENDPOINTS.map((e) => (
              <li key={e.m + e.p} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] sm:gap-4">
                <code className="font-mono text-sm text-ink">
                  <span className="mr-2 inline-block min-w-11 rounded-sm bg-surface-2 px-1.5 text-center text-xs font-semibold text-clay-strong">{e.m}</span>
                  {e.p}
                </code>
                <p className="text-base text-ink-2">{e.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="trust" className="grid gap-4 md:grid-cols-3">
          <h2 id="trust" className="sr-only">
            Auth and payment
          </h2>
          <div className="grid content-start gap-2 rounded-lg border border-line bg-surface p-5">
            <Lock aria-hidden className="size-5 text-paypal" />
            <h3 className="text-md font-semibold">One token, one store</h3>
            <p className="text-base text-ink-2">
              Bearer JWT, EdDSA. The audience is the store in the URL: a token for one shop gets 403 at another, and a cart is visible only to the agent that built it. Public key:{" "}
              <a href="/.well-known/jwks.json" className="font-mono text-sm underline decoration-line-strong underline-offset-4">
                /.well-known/jwks.json
              </a>
            </p>
          </div>
          <div className="grid content-start gap-2 rounded-lg border border-line bg-surface p-5">
            <Truck aria-hidden className="size-5 text-paypal" />
            <h3 className="text-md font-semibold">Charged when it ships</h3>
            <p className="text-base text-ink-2">Checkout authorizes the PayPal order; adding tracking captures it. Cancel before shipping and the hold is released. Works for shops paid to the platform and shops paid straight to their own PayPal.</p>
          </div>
          <div className="grid content-start gap-2 rounded-lg border border-line bg-surface p-5">
            <ShieldCheck aria-hidden className="size-5 text-paypal" />
            <h3 className="text-md font-semibold">Reconciled with PayPal</h3>
            <p className="text-base text-ink-2">Every capture and every open hold is checked against PayPal on start-up and daily, and shown on the seller&apos;s dashboard.</p>
          </div>
        </section>

        <section aria-labelledby="issues" className="grid gap-4">
          <h2 id="issues" className="font-display text-2xl font-medium">Validation issues the shop returns</h2>
          <p className="max-w-[46rem] text-base text-ink-2">Computed from the database for every POST and PUT, with PayPal&apos;s issue codes and resolution actions, so an agent can fix the cart without a human.</p>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-[0.06em] text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">specific_issue</th>
                  <th className="px-4 py-2.5 font-medium">resolution_options</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ISSUES.map(([i, a, w]) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink">{i}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-clay-strong">{a}</td>
                    <td className="px-4 py-2.5 text-ink-2">{w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="try" className="grid gap-4">
          <h2 id="try" className="font-display text-2xl font-medium">Try it now</h2>
          <DemoToken variantId={variantId} />
          <p className="text-base text-ink-2">
            Or run PayPal&apos;s own Cart API client as a shopping agent:{" "}
            <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-sm text-ink">pnpm --filter web cart-agent -- --store juniper_clay --query mug</code>{" "}
            <a href={REPO_URL} className="inline-flex items-center gap-0.5 font-medium text-ink underline decoration-line-strong underline-offset-4">
              from the repo <ArrowUpRight aria-hidden className="size-3.5" />
            </a>
          </p>
        </section>

        <p className="max-w-[46rem] border-t border-line pt-6 text-sm text-muted">
          Honest scope: PayPal routes Store Sync traffic to merchants it has onboarded, and issues their tokens, through a request-access program. Shopfront implements the merchant side of the contract and issues its own store-bound tokens until then;
          the verifier is the one PayPal&apos;s tokens would pass through. Sandbox only: no real money moves.
        </p>
      </main>
    </div>
  );
}
