import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { desc, schema } from "@shopfront/db";
import { LandingWire } from "@/components/landing/landing-wire";
import { RequestId } from "@/components/ui/request-id";
import { appUrl } from "@/server/env";
import { toShopEvent } from "@/server/events";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Shopfront Agent: your shop, buyable by AI agents" },
  description: "Turn product photos into a PayPal-backed store that AI shopping agents can buy from. The agent shops; the human approves in PayPal.",
};

// The loop is a real sequence, so it is numbered. Each step names the technology doing the work.
const LOOP = [
  { title: "Photos become listings", body: "A maker drops product photos. Gemini drafts each listing and marks what it is unsure of. Nothing goes live until she confirms the price.", tech: "Vision · PayPal Catalog" },
  { title: "The store is agent-buyable", body: "One MCP endpoint covers every seller. Agents search, compare and ask for a checkout with ids and quantities, never prices.", tech: "MCP tools" },
  { title: "An agent shops", body: "The server prices the order from the catalog and creates a PayPal order. The agent hands the human a link.", tech: "PayPal Orders v2", paypal: true },
  { title: "The human approves in PayPal", body: "Payment happens only when a person approves in the PayPal popup. A signature-verified webhook confirms it; a fallback check covers a lost one.", tech: "JS SDK v6 · Webhooks", paypal: true },
  { title: "The seller's agent runs the rest", body: "It reads the shipping label, puts tracking on the PayPal order, writes the buyer a note and settles refunds inside her policy.", tech: "Tracking · Refunds", paypal: true },
];

const ROUTES = [
  { href: "/shop", label: "Shop with an agent", note: "Ask for a gift, approve in PayPal, try to hack the price." },
  { href: "/studio", label: "Be the seller", note: "Photos to listings, orders, refunds, and the AG Studio dashboard." },
  { href: "/live", label: "Watch the live wire", note: "Every agent call, PayPal request and webhook as it happens." },
  { href: "/s/juniper_clay", label: "Browse a storefront", note: "What a crawler or agent reads, with schema.org data." },
];

export default async function Home() {
  const rows = await services().db.select().from(schema.events).orderBy(desc(schema.events.id)).limit(7);
  const initial = rows.map(toShopEvent);

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-[84rem] flex-wrap items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <span className="font-display text-xl font-semibold">Shopfront</span>
        <p className="text-sm text-ink-2">PayPal sandbox demo · no real money moves</p>
      </header>

      {/* Hero: the claim on the left, the machine working on the right. */}
      <section className="mx-auto grid max-w-[84rem] gap-12 px-5 pt-12 pb-20 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:pt-20 lg:pb-28">
        <div className="grid content-start gap-7">
          <h1 className="max-w-[14ch] font-display text-hero font-medium tracking-[-0.025em] motion-safe:animate-[rise_520ms_var(--ease-out-expo)_both]">
            Your shop, buyable by AI agents.
          </h1>
          <p className="prose-width text-md text-ink-2 motion-safe:animate-[rise_520ms_80ms_var(--ease-out-expo)_both]">
            Shopfront turns a maker&apos;s product photos into a store that any shopping agent can order from. The agent shops; the human approves the payment in
            PayPal; the seller&apos;s own agent ships and refunds within her rules.
          </p>
          <div className="flex flex-wrap items-center gap-3 motion-safe:animate-[rise_520ms_160ms_var(--ease-out-expo)_both]">
            <Link
              href="/shop"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-md font-medium text-white transition-colors hover:bg-clay-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Shop with an agent <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex h-11 items-center rounded-md border border-line-strong bg-surface px-5 text-md font-medium text-ink transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              Be the seller
            </Link>
          </div>
          <div className="grid gap-2 motion-safe:animate-[rise_520ms_240ms_var(--ease-out-expo)_both]">
            <p className="text-sm text-ink-2">Bring your own agent: add this MCP endpoint as a connector.</p>
            <RequestId label="MCP" value={appUrl("/mcp")} max={48} className="w-fit" />
          </div>
        </div>
        <div className="min-h-[24rem] motion-safe:animate-[rise_620ms_200ms_var(--ease-out-expo)_both]">
          <LandingWire initial={initial} />
        </div>
      </section>

      {/* The loop: a real five-step sequence. */}
      <section aria-labelledby="loop-h" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[84rem] gap-10 px-5 py-16 sm:px-8 lg:py-24">
          <h2 id="loop-h" className="max-w-[22ch] font-display text-display font-medium tracking-[-0.02em]">
            From a photo on her phone to a paid, shipped order.
          </h2>
          <ol className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-5">
            {LOOP.map((s, i) => (
              <li key={s.title} className="relative grid content-start gap-3">
                <span aria-hidden className="font-display text-2xl font-medium text-clay tabular">
                  {i + 1}
                </span>
                <h3 className="text-md font-semibold text-ink">{s.title}</h3>
                <p className="text-base text-ink-2">{s.body}</p>
                <span className={s.paypal ? "w-fit rounded-sm bg-paypal-soft px-1.5 py-0.5 text-xs font-medium text-paypal" : "w-fit rounded-sm bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink-2"}>
                  {s.tech}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The guardrail promise, shown with a real rejected call rather than adjectives. */}
      <section aria-labelledby="guard-h" className="mx-auto grid max-w-[84rem] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:py-24">
        <div className="grid content-start gap-5">
          <h2 id="guard-h" className="max-w-[18ch] font-display text-display font-medium tracking-[-0.02em]">
            The model proposes. Code decides the money.
          </h2>
          <p className="prose-width text-md text-ink-2">
            No model can create an order, capture, refund or add tracking. Agents send ids and quantities; prices and totals come from the seller&apos;s catalog;
            refunds follow a tested policy and are capped at what was paid. Text in a photo or a chat that tries to change a price is treated as data.
          </p>
          <Link href="/shop" className="inline-flex w-fit items-center gap-1.5 text-md font-medium text-clay-strong underline-offset-4 hover:underline">
            Try to hack the price yourself <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
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
      </section>

      {/* Where to go next. */}
      <section aria-labelledby="go-h" className="border-t border-line">
        <div className="mx-auto grid max-w-[84rem] gap-8 px-5 py-16 sm:px-8 lg:py-20">
          <h2 id="go-h" className="font-display text-2xl font-medium">
            See it working
          </h2>
          <ul className="grid divide-y divide-line border-y border-line">
            {ROUTES.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href}
                  className="group grid gap-1 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-6"
                >
                  <span className="font-display text-xl font-medium group-hover:text-clay-strong">{r.label}</span>
                  <span className="text-base text-ink-2">{r.note}</span>
                  <ArrowRight aria-hidden className="hidden size-5 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-clay motion-reduce:transition-none sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mx-auto grid max-w-[84rem] gap-2 px-5 pb-12 text-sm text-ink-2 sm:px-8">
        <p>
          Honest scope: PayPal sandbox only. In this build every sale settles to one platform account; paying each seller directly is the production path.
          AI runs on free tiers (Gemini, Groq), so the first answer after a quiet spell can take a moment.
        </p>
        <p>
          Built for <span className="text-ink">Build What&apos;s Next with PayPal and AI</span> · <Link href="/design" className="underline-offset-4 hover:underline">Design system</Link>
        </p>
      </footer>
    </main>
  );
}
