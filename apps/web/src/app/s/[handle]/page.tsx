import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { centsToValue } from "@shopfront/core";
import { AgentNote } from "@/components/store/agent-note";
import { ProductTile } from "@/components/store/product-tile";
import { appUrl } from "@/server/env";
import { jsonLdScript, productJsonLd, storeBySeller } from "@/server/storefront";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/s/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const store = /^[a-z0-9_]{3,30}$/.test(handle) ? await storeBySeller(handle) : null;
  if (!store) return { title: "Shop not found" };
  return { title: store.seller.displayName, description: store.seller.bio, alternates: { canonical: appUrl(`/s/${handle}`) } };
}

// Public storefront (craft retail register). Server-rendered with schema.org JSON-LD so crawler-based agents can read it.
export default async function Storefront({ params }: PageProps<"/s/[handle]">) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{3,30}$/.test(handle)) notFound();
  const store = await storeBySeller(handle);
  if (!store) notFound();
  const { seller, products } = store;
  const policy = seller.refundPolicy;
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: seller.displayName,
    url: appUrl(`/s/${handle}`),
    itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: p.url, item: productJsonLd(p, seller) })),
  };

  return (
    <main className="mx-auto grid min-h-dvh max-w-[76rem] content-start gap-12 px-5 py-8 sm:px-8 lg:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      <header className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
        <div className="grid gap-4">
          <h1 className="font-display text-hero font-medium tracking-[-0.025em]">{seller.displayName}</h1>
          <p className="prose-width text-md text-ink-2">{seller.bio}</p>
          <p className="text-sm text-muted">
            Ships to {seller.shipsTo.join(", ")} · ${centsToValue(seller.flatShippingCents)} flat shipping · Refunds within {policy.window_days} days
          </p>
        </div>
        <AgentNote mcpUrl={appUrl("/mcp")} />
      </header>

      <section aria-labelledby="pieces-h" className="grid gap-6">
        <h2 id="pieces-h" className="font-display text-2xl font-medium">
          {products.length} {products.length === 1 ? "piece" : "pieces"}
        </h2>
        {products.length ? (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductTile key={p.id} product={p} handle={handle} />
            ))}
          </ul>
        ) : (
          <p className="text-base text-ink-2">Nothing listed yet.</p>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-muted">
        <span>Payments by PayPal (sandbox demo: no real money moves).</span>
        <Link href="/" className="hover:text-ink">
          Made with Shopfront
        </Link>
      </footer>
    </main>
  );
}
