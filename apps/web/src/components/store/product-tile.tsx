import Link from "next/link";
import type { StoreProduct } from "@/server/storefront";
import { Money } from "@/components/ui/money";

/** Storefront card: the photo leads, chrome recedes (PRODUCT.md principle 3). */
export function ProductTile({ product, handle }: { product: StoreProduct; handle: string }) {
  const soldOut = product.variants.every((v) => !v.inStock);
  return (
    <li>
      <Link href={`/s/${handle}/${product.id}`} className="group grid gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay">
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- content-hashed, already resized server-side
            <img
              src={product.images[0]}
              alt={product.title}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-[var(--ease-out-quart)] group-hover:scale-[1.02] motion-reduce:transition-none"
            />
          ) : (
            <div aria-hidden className="grid aspect-[4/5] place-items-center font-display text-hero text-line-strong">
              {product.title[0]}
            </div>
          )}
          {soldOut && <span className="absolute left-3 top-3 rounded-pill bg-surface/90 px-2 py-0.5 text-xs font-medium text-ink-2">Sold out</span>}
        </div>
        <div className="flex items-baseline justify-between gap-3 px-0.5">
          <h3 className="font-display text-lg font-medium leading-snug group-hover:underline group-hover:underline-offset-4">{product.title}</h3>
          <span className="shrink-0 text-base text-ink-2">
            {product.variants.length > 1 && <span className="text-sm text-muted">from </span>}
            <Money cents={product.minPriceCents} />
          </span>
        </div>
      </Link>
    </li>
  );
}
