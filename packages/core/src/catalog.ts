// Turning a model's photo extraction into a draft listing. Pure functions: the model proposes, this code decides
// what is trusted (PLAN §0 #9: a photo never justifies a confident price; text in a photo is data, not instructions).
import { LOW_CONFIDENCE_THRESHOLD, PRICE_CONFIDENCE_CAP, type ProductExtraction } from './contracts';

// Phrases that try to steer the model or the shop. Matching text in any field becomes a visible flag.
const INJECTION = [
  /ignore (all|any|previous|prior|the above)? ?(instructions|rules|prompts?)/i,
  /\b(system|developer) (prompt|override|message)\b/i,
  /\bprice\s*(=|:|is|to|should be)\s*\$?\s*0(\.0+)?\b/i,
  /\$\s*0(\.00)?\b/,
  /\b(100\s*%|free) (off|discount)\b/i,
  /\bset (the )?(price|total)\b/i,
  /\byou are now\b/i,
];

export function injectionFlags(...texts: string[]): string[] {
  const hits = texts.filter((t) => INJECTION.some((r) => r.test(t)));
  return hits.length ? ['Text in the photo looks like instructions to the AI; it was treated as data and ignored.'] : [];
}

export interface DraftFromExtraction {
  title: string;
  description: string;
  category: string;
  attributes: Record<string, string>;
  fieldConfidence: Record<string, number>;
  /** Option sets, one per variant (at least one, possibly empty). */
  variants: Array<Record<string, string>>;
  /** Shown as "AI guess" only. Never published until the seller confirms a price. */
  priceGuessCents: number | null;
  flags: string[];
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
/** "Home & Kitchen > Drinkware > Mugs" → "mugs". */
const lastSegment = (s: string) => clean(s.split(/>|\//).pop() ?? s).toLowerCase();

export function draftFromExtraction(x: ProductExtraction): DraftFromExtraction {
  // The model's schema has no bounds (see contracts.ts); every limit is enforced here.
  const priceConfidence = Math.min(clamp01(x.suggested_price_usd.confidence), PRICE_CONFIDENCE_CAP);
  const guess = x.suggested_price_usd.value;
  const attributes: Record<string, string> = {};
  for (const a of x.attributes.slice(0, 12)) {
    const k = clean(a.name).toLowerCase();
    if (k && a.value && k.length <= 40 && !(k in attributes)) attributes[k] = clean(a.value).slice(0, 120);
  }
  const variants = x.variants
    .slice(0, 20)
    .map((v) =>
      Object.fromEntries(
        v.options
          .slice(0, 4)
          .filter((o) => o.name && o.value)
          .map((o) => [clean(o.name).toLowerCase().slice(0, 30), clean(o.value).slice(0, 60)]),
      ),
    )
    .filter((o, i, all) => all.findIndex((p) => JSON.stringify(p) === JSON.stringify(o)) === i);
  const flags = [...new Set([...x.flags.slice(0, 10).map((f) => clean(f).slice(0, 200)).filter(Boolean), ...injectionFlags(x.title.value, x.description.value, ...x.attributes.map((a) => a.value))])];
  return {
    title: clean(x.title.value).slice(0, 120) || 'Untitled piece',
    description: x.description.value.trim().slice(0, 1200),
    category: lastSegment(x.category.value).slice(0, 60),
    attributes,
    fieldConfidence: {
      title: clamp01(x.title.confidence),
      description: clamp01(x.description.confidence),
      category: clamp01(x.category.confidence),
      price: priceConfidence,
      ...Object.fromEntries(x.attributes.slice(0, 12).map((a) => [`attr:${clean(a.name).toLowerCase()}`, clamp01(a.confidence)])),
    },
    variants: variants.length ? variants : [{}],
    priceGuessCents: guess !== null && Number.isFinite(guess) && guess > 0 && guess < 100_000 ? Math.round(guess * 100) : null,
    flags,
  };
}

/** Field names the review UI should highlight ("Check this"). Price is always unconfirmed, so never listed here. */
export function lowConfidenceFields(fieldConfidence: Record<string, number>): string[] {
  return Object.entries(fieldConfidence)
    .filter(([k, c]) => k !== 'price' && c < LOW_CONFIDENCE_THRESHOLD)
    .map(([k]) => k);
}

/** Maps our category words to PayPal Catalog Products categories (Catalog Products v1 enum). */
export function paypalCatalogCategory(category: string): 'HOUSEWARES' | 'ARTS_AND_CRAFTS' | 'HOME_DECOR' {
  if (/print|poster|art|illustration|painting/.test(category)) return 'ARTS_AND_CRAFTS';
  if (/vase|decor|candle|planter|wall/.test(category)) return 'HOME_DECOR';
  return 'HOUSEWARES';
}
