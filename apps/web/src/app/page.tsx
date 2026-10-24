import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot, Camera, CircleCheck, Code2, ShieldCheck, Store, Truck } from "lucide-react";
import { and, asc, eq, inArray, schema } from "@shopfront/db";
import { LandingWire } from "@/components/landing/landing-wire";
import { SiteNav } from "@/components/site/site-nav";
import { RequestId } from "@/components/ui/request-id";
import { appUrl } from "@/server/env";
import { imageUrl } from "@/server/images";
import { recentEvents } from "@/server/console";
import { isTestRun } from "@/server/run-context";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Shopfront: your storefront, ready for AI agents" },
  description: "Sellers drop a product photo; Shopfront lists it on PayPal and lets any AI shopping agent find and buy it. Buyers approve every payment in PayPal.",
};

/** Real listings for the flow strip: the same photos and prices an agent sees. */
async function showcase() {
  const { db } = services();
  const rows = await db
    .select({ id: schema.products.id, title: schema.products.title, handle: schema.sellers.handle, seller: schema.sellers.displayName, sha: schema.productImages.imageSha256, price: schema.variants.priceCents })
    .from(schema.products)
    .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
    .innerJoin(schema.productImages, eq(schema.productImages.productId, schema.products.id))
    .innerJoin(schema.variants, eq(schema.variants.productId, schema.products.id))
    .where(and(eq(schema.products.status, "approved"), eq(schema.sellers.testOnly, false), inArray(schema.sellers.handle, ["juniper_clay", "fern_and_loom"])))
    .orderBy(asc(schema.productImages.position), asc(schema.variants.priceCents));
  const seen = new Set<string>();
  const out: Array<{ id: string; title: string; handle: string; seller: string; img: string; price: string }> = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ id: r.id, title: r.title, handle: r.handle, seller: r.seller, img: imageUrl(r.sha), price: (r.price / 100).toFixed(2) });
  }
  return out;
}

export default async function Home() {
  const [initial, items] = await Promise.all([isTestRun().then((t) => recentEvents(7, t)), showcase()]);
  const cobalt = items.find((i) => /crackle|cobalt/i.test(i.title)) ?? items[0];
  const photo = items.find((i) => /speckled/i.test(i.title)) ?? items[1] ?? cobalt;
  const textile = items.find((i) => i.handle === "fern_and_loom");

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-[96rem] px-5 pt-5 sm:px-8">
        <SiteNav />
      </div>

      {/* Hero: what it is in one line, the two doors, and the machine working on the right. */}
      <section className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-12 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:pt-20 lg:pb-24 xl:gap-16">
        <div className="grid content-start gap-7">
          <p className="w-fit rounded-pill border border-line bg-surface px-3 py-1 text-sm text-ink-2 motion-safe:animate-[rise_520ms_var(--ease-out-expo)_both]">
            PayPal + AI · live on the PayPal sandbox
          </p>
          <h1 className="max-w-[13ch] font-display text-hero font-medium tracking-[-0.03em] motion-safe:animate-[rise_520ms_60ms_var(--ease-out-expo)_both]">
            Your storefront, ready for AI agents.
          </h1>
          <p className="max-w-[46ch] text-lg text-ink-2 lg:text-xl motion-safe:animate-[rise_520ms_120ms_var(--ease-out-expo)_both]">
            Drop a product photo and Shopfront writes the listing. Any AI shopping agent can then find it and set up the order, and the buyer approves the payment in PayPal.
          </p>
          <div className="flex flex-wrap items-center gap-3 motion-safe:animate-[rise_520ms_180ms_var(--ease-out-expo)_both]">
            <Link href="/shop" className="group inline-flex h-12 items-center gap-2 rounded-md bg-ink px-6 text-md font-medium text-canvas transition-colors hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay" data-testid="cta-buyer">
              Try buyer demo <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/studio" className="inline-flex h-12 items-center gap-2 rounded-md border border-line-strong bg-surface px-6 text-md font-medium text-ink transition-colors hover:border-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay" data-testid="cta-seller">
              <Store aria-hidden className="size-4 text-clay" /> Sell with Shopfront
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-md text-ink-2 motion-safe:animate-[rise_520ms_240ms_var(--ease-out-expo)_both]">
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="size-4 text-clay" /> The shop sets the price, never the agent
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CircleCheck aria-hidden className="size-4 text-paypal" /> A person approves every payment
            </li>
          </ul>
        </div>
        <div className="min-h-[24rem] lg:min-h-[28rem] lg:[zoom:1.12] motion-safe:animate-[rise_620ms_200ms_var(--ease-out-expo)_both]" data-testid="hero-wire">
          <LandingWire initial={initial} />
        </div>
      </section>

      {/* One sale, start to finish, with the real listings an agent buys. */}
      <section aria-labelledby="flow-h" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[96rem] gap-8 px-5 py-14 sm:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="flow-h" className="max-w-[24ch] font-display text-display font-medium tracking-[-0.02em]">
              From her photo to a paid, shipped order.
            </h2>
            <p className="max-w-[40ch] text-lg text-ink-2">Who does what: the seller and the buyer decide; agents do the legwork; PayPal moves the money.</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="flow-strip">
            <li className="grid content-start gap-3 rounded-lg border border-line bg-canvas p-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-clay-strong">
                <Camera aria-hidden className="size-4" /> 1 · The seller
              </span>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- content-hashed, resized server-side
                <img src={photo.img} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
              )}
              <p className="text-lg font-medium text-ink">Drops a photo. AI writes the listing.</p>
              <p className="text-md text-ink-2">She checks it and confirms the price. Nothing goes live on an AI guess.</p>
            </li>
            <li className="grid content-start gap-3 rounded-lg border border-line bg-canvas p-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-clay-strong">
                <Bot aria-hidden className="size-4" /> 2 · The buyer&apos;s agent
              </span>
              <div className="grid gap-2 rounded-md bg-surface p-3">
                <p className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3 py-1.5 text-sm text-canvas">A blue mug under $40, as a gift</p>
                {cobalt && (
                  <div className="flex items-center gap-2 rounded-md border border-line p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- content-hashed, resized server-side */}
                    <img src={cobalt.img} alt="" className="size-10 rounded-sm object-cover" />
                    <span className="grid min-w-0 text-sm">
                      <span className="truncate font-medium text-ink">{cobalt.title}</span>
                      <span className="text-xs text-ink-2">{cobalt.seller} · ${cobalt.price}</span>
                    </span>
                  </div>
                )}
              </div>
              <p className="text-lg font-medium text-ink">Finds it over MCP and sets up the order.</p>
              <p className="text-md text-ink-2">It sends ids and quantities. The shop computes the total.</p>
            </li>
            <li className="grid content-start gap-3 rounded-lg border border-line bg-canvas p-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-paypal">
                <CircleCheck aria-hidden className="size-4" /> 3 · The buyer
              </span>
              <div className="grid gap-2 rounded-md bg-surface p-3 text-sm">
                <div className="flex justify-between text-ink-2">
                  <span>Items</span>
                  <span className="tabular">${cobalt?.price ?? "32.00"}</span>
                </div>
                <div className="flex justify-between text-ink-2">
                  <span>Shipping</span>
                  <span className="tabular">$5.00</span>
                </div>
                <div className="flex justify-between border-t border-line pt-1.5 font-semibold text-ink">
                  <span>Total, set by the shop</span>
                  <span className="tabular">${(Number(cobalt?.price ?? 32) + 5).toFixed(2)}</span>
                </div>
                <span className="mt-1 rounded-md bg-paypal-soft px-2 py-1.5 text-center text-sm font-medium text-paypal">Approve in PayPal</span>
              </div>
              <p className="text-lg font-medium text-ink">Approves the payment in PayPal.</p>
              <p className="text-md text-ink-2">The agent can&apos;t pay on its own. A verified webhook confirms the sale.</p>
            </li>
            <li className="grid content-start gap-3 rounded-lg border border-line bg-canvas p-5">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-clay-strong">
                <Truck aria-hidden className="size-4" /> 4 · The seller&apos;s agent
              </span>
              {textile && (
                // eslint-disable-next-line @next/next/no-img-element -- content-hashed, resized server-side
                <img src={textile.img} alt="" className="aspect-[4/3] w-full rounded-md object-cover" />
              )}
              <p className="text-lg font-medium text-ink">Ships, tracks and refunds inside her rules.</p>
              <p className="text-md text-ink-2">It reads the label photo, adds tracking to PayPal and asks her before any refund outside policy.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* The guardrail promise, shown with a real rejected call, and the door for developers. */}
      <section aria-labelledby="guard-h" className="mx-auto grid max-w-[96rem] grid-cols-[minmax(0,1fr)] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start lg:py-20">
        <div className="grid min-w-0 content-start gap-5">
          <h2 id="guard-h" className="max-w-[18ch] font-display text-display font-medium tracking-[-0.02em]">
            The model proposes. Code decides the money.
          </h2>
          <p className="max-w-[52ch] text-md text-ink-2">
            No model can create an order, capture, refund or add tracking. Prices and totals come from the seller&apos;s catalog; refunds follow a tested policy. Text in a photo or a chat that tries to change a price is treated as data.
          </p>
          <figure className="grid gap-3 rounded-lg bg-ink-panel p-5 text-ink-panel-text">
            <figcaption className="text-sm text-ink-panel-muted">What an agent sent, and what the server answered</figcaption>
            <pre className="overflow-x-auto rounded-md bg-ink-panel-2 p-4 font-mono text-sm leading-relaxed">
              <code>{`create_checkout({
  items: [{ variant_id: "var_cobalt120000",
            quantity: 1, price: 0 }]
})`}</code>
            </pre>
            <p className="inline-flex items-center gap-2 text-sm">
              <ShieldCheck aria-hidden className="size-4 text-[oklch(0.78_0.12_150)]" />
              Blocked by the server: unknown field “price”. Totals are set by the shop.
            </p>
          </figure>
          <Link href="/shop" className="inline-flex w-fit items-center gap-1.5 text-md font-medium text-clay-strong underline-offset-4 hover:underline">
            Try to hack the price yourself <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 rounded-lg border border-line bg-surface p-5" aria-labelledby="dev-h" data-testid="developer-card">
          <h2 id="dev-h" className="inline-flex items-center gap-2 text-lg font-semibold">
            <Code2 aria-hidden className="size-5 text-clay" /> Bring your own agent
          </h2>
          <p className="text-base text-ink-2">Add one MCP endpoint as a connector in Claude or any MCP client. It covers every Shopfront seller: search, product details, checkout, order status and refunds.</p>
          <RequestId label="MCP" value={appUrl("/mcp")} max={52} className="h-9 w-fit max-w-full text-sm" />
          <ul className="grid gap-1.5 text-sm">
            <li>
              <Link href="/llms.txt" className="font-medium text-clay-strong underline-offset-4 hover:underline">
                /llms.txt
              </Link>{" "}
              <span className="text-ink-2">· the catalog in plain text for crawlers and agents</span>
            </li>
            <li>
              <Link href="/live" className="font-medium text-clay-strong underline-offset-4 hover:underline">
                Live wire
              </Link>{" "}
              <span className="text-ink-2">· every agent call, PayPal request and webhook, as it happens</span>
            </li>
            <li>
              <Link href="/s/juniper_clay" className="font-medium text-clay-strong underline-offset-4 hover:underline">
                A storefront
              </Link>{" "}
              <span className="text-ink-2">· what a person (or a crawler) sees, with schema.org data</span>
            </li>
          </ul>
        </aside>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-[96rem] gap-2 px-5 py-10 text-sm text-ink-2 sm:px-8">
          <p>
            Honest scope: PayPal sandbox only, no real money. Juniper Clay is paid into the platform&apos;s sandbox account; Fern &amp; Loom is paid directly into its own PayPal account. Free-tier AI (Gemini, Groq), so a first answer after a quiet spell can take a moment. Listing photos are public-domain museum pieces standing in for the sellers&apos; work.
          </p>
          <p>
            Built for <span className="text-ink">Build What&apos;s Next with PayPal and AI</span> · <Link href="/design" className="underline-offset-4 hover:underline">Design system</Link> ·{" "}
            <Link href="/privacy" className="underline-offset-4 hover:underline">Privacy</Link> · <Link href="/terms" className="underline-offset-4 hover:underline">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
