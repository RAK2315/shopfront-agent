import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { centsToValue, optionsLabel } from "@shopfront/core";
import { AgentNote } from "@/components/store/agent-note";
import { ProductTile } from "@/components/store/product-tile";
import { Money } from "@/components/ui/money";
import { appUrl } from "@/server/env";
import { jsonLdScript, productJsonLd, storeProduct } from "@/server/storefront";

export const dynamic = "force-dynamic";

const valid = (handle: string, id: string) => /^[a-z0-9_]{3,30}$/.test(handle) && /^prd_[a-z0-9]{12}$/.test(id);

export async function generateMetadata({ params }: PageProps<"/s/[handle]/[productId]">): Promise<Metadata> {
  const { handle, productId } = await params;
  const r = valid(handle, productId) ? await storeProduct(handle, productId) : null;
  if (!r) return { title: "Not found" };
  return {
    title: `${r.product.title} · ${r.seller.displayName}`,
    description: r.product.description.slice(0, 160),
    alternates: { canonical: r.product.url },
    openGraph: { images: r.product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: PageProps<"/s/[handle]/[productId]">) {
  const { handle, productId } = await params;
  if (!valid(handle, productId)) notFound();
  const r = await storeProduct(handle, productId);
  if (!r) notFound();
  const { seller, product: p, others } = r;

  return (
    <main className="mx-auto grid min-h-dvh max-w-[76rem] content-start gap-12 px-5 py-8 sm:px-8 lg:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(p, seller)) }} />
      <Link href={`/s/${handle}`} className="inline-flex w-fit items-center gap-1.5 font-display text-lg font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" /> {seller.displayName}
      </Link>

      <article className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="overflow-hidden rounded-lg bg-surface-2">
          {p.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- content-hashed, already resized server-side
            <img src={p.images[0]} alt={p.title} className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div aria-hidden className="grid aspect-[4/5] place-items-center font-display text-hero text-line-strong">
              {p.title[0]}
            </div>
          )}
        </div>

        <div className="grid content-start gap-6">
          <div className="grid gap-2">
            <h1 className="font-display text-display font-medium tracking-[-0.02em]">{p.title}</h1>
            <p className="text-xl text-ink">
              {p.variants.length > 1 && <span className="text-base text-muted">from </span>}
              <Money cents={p.minPriceCents} showCode />
            </p>
          </div>
          <p className="prose-width text-md text-ink-2">{p.description}</p>

          {p.variants.length > 1 && (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {p.variants.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <span className="text-base">{optionsLabel(v.options)}</span>
                  <span className="text-base">{v.inStock ? <Money cents={v.priceCents} /> : <span className="text-muted">Sold out</span>}</span>
                </li>
              ))}
            </ul>
          )}

          {Object.keys(p.attributes).length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-base">
              {Object.entries(p.attributes).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k[0]!.toUpperCase() + k.slice(1)}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="text-sm text-muted">
            ${centsToValue(seller.flatShippingCents)} flat shipping to {seller.shipsTo.join(", ")} · Refunds within {seller.refundPolicy.window_days} days
          </p>
          <AgentNote mcpUrl={appUrl("/mcp")} productId={p.id} />
        </div>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="more-h" className="grid gap-6 border-t border-line pt-10">
          <h2 id="more-h" className="font-display text-2xl font-medium">
            More from {seller.displayName}
          </h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
            {others.map((o) => (
              <ProductTile key={o.id} product={o} handle={handle} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
