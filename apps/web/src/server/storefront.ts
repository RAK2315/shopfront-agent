import "server-only";
import { and, asc, desc, eq, inArray, schema } from "@shopfront/db";
import { appUrl } from "./env";
import { imageUrl } from "./images";
import { services } from "./services";

export interface StoreProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  attributes: Record<string, string>;
  images: string[];
  variants: Array<{ id: string; sku: string; options: Record<string, string>; priceCents: number; inStock: boolean }>;
  minPriceCents: number;
  url: string;
}

export async function storeBySeller(handle: string) {
  const { db } = services();
  const [seller] = await db.select().from(schema.sellers).where(eq(schema.sellers.handle, handle));
  if (!seller) return null;
  const products = await db
    .select()
    .from(schema.products)
    .where(and(eq(schema.products.sellerId, seller.id), eq(schema.products.status, "approved")))
    .orderBy(desc(schema.products.approvedAt));
  return { seller, products: await hydrate(seller.handle, products) };
}

export async function storeProduct(handle: string, productId: string) {
  const store = await storeBySeller(handle);
  const product = store?.products.find((p) => p.id === productId);
  return store && product ? { seller: store.seller, product, others: store.products.filter((p) => p.id !== productId).slice(0, 3) } : null;
}

async function hydrate(handle: string, products: Array<typeof schema.products.$inferSelect>): Promise<StoreProduct[]> {
  if (!products.length) return [];
  const { db } = services();
  const ids = products.map((p) => p.id);
  const [vs, imgs] = await Promise.all([
    db.select().from(schema.variants).where(and(inArray(schema.variants.productId, ids), eq(schema.variants.active, true))).orderBy(asc(schema.variants.priceCents)),
    db.select().from(schema.productImages).where(inArray(schema.productImages.productId, ids)).orderBy(asc(schema.productImages.position)),
  ]);
  return products.map((p) => {
    const variants = vs.filter((v) => v.productId === p.id).map((v) => ({ id: v.id, sku: v.sku, options: v.options, priceCents: v.priceCents, inStock: v.stock > 0 }));
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      attributes: p.attributes,
      images: imgs.filter((i) => i.productId === p.id).map((i) => imageUrl(i.imageSha256)),
      variants,
      minPriceCents: Math.min(...variants.map((v) => v.priceCents)),
      url: appUrl(`/s/${handle}/${p.id}`),
    };
  });
}

/** schema.org Product + Offer(s) for one listing (Google Rich Results, crawler-based agents; D-012). */
export function productJsonLd(p: StoreProduct, seller: { displayName: string }) {
  const offers = p.variants.map((v) => ({
    "@type": "Offer",
    sku: v.sku,
    price: (v.priceCents / 100).toFixed(2),
    priceCurrency: "USD",
    availability: v.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    url: p.url,
    seller: { "@type": "Organization", name: seller.displayName },
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": p.url,
    name: p.title,
    description: p.description,
    sku: p.variants[0]?.sku,
    category: p.category,
    image: p.images,
    brand: { "@type": "Brand", name: seller.displayName },
    ...Object.fromEntries(Object.entries(p.attributes).filter(([k]) => ["material", "color", "colour"].includes(k)).map(([k, v]) => [k === "colour" ? "color" : k, v])),
    offers: offers.length === 1 ? offers[0] : { "@type": "AggregateOffer", lowPrice: (p.minPriceCents / 100).toFixed(2), highPrice: (Math.max(...p.variants.map((v) => v.priceCents)) / 100).toFixed(2), priceCurrency: "USD", offerCount: offers.length, offers },
  };
}

/** Safe to inline in a <script type="application/ld+json">: no closing tags can escape. */
export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
