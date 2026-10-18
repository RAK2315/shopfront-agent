// Demo catalog (idempotent upserts with fixed ids). Run: pnpm --filter web seed
// Prices here are the seller-confirmed prices; agents can never change them (D-002).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RefundPolicy } from "@shopfront/core";
import { closeDb, getDb, schema, sql } from "@shopfront/db";
import { photoSha256, processPhoto } from "../src/lib/image-process";

// Listing photos: public-domain museum photos (CC0), credited in seed-photos/CREDITS.md and the README (D-087).
// The owner's own photos replace them for the live photo-to-store demo; this keeps every seeded listing real-looking.
const PHOTOS = join(import.meta.dirname, "..", "seed-photos");

const id = (prefix: string, body: string) => `${prefix}_${body.toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(12, "0").slice(0, 12)}`;

const sellers = [
  {
    id: id("sel", "juniperclay"),
    handle: "juniper_clay",
    displayName: "Juniper Clay Studio",
    bio: "Wheel-thrown stoneware from a one-person studio. Every glaze is mixed by hand.",
    flatShippingCents: 500,
    shipsTo: ["US"],
    payoutStatus: "platform", // the platform sandbox merchant itself (D-083)
  },
  {
    id: id("sel", "fernandloom"),
    handle: "fern_and_loom",
    displayName: "Fern & Loom",
    bio: "Hand-dyed linens woven in small batches.",
    flatShippingCents: 400,
    shipsTo: ["US"],
  },
  {
    // Telegram judge mode (D-073): an isolated demo seller. test_only = every order is a test row, it never shows in
    // global search or llms.txt, and a judge's chat can only ever act on it.
    id: id("sel", "judgedemo"),
    handle: "judge_demo",
    displayName: "Judge's Demo Studio",
    bio: "A practice shop for judges trying the Telegram seller copilot. Sandbox only; no real money moves.",
    flatShippingCents: 500,
    shipsTo: ["US"],
    testOnly: true,
    payoutStatus: "platform",
  },
];

const products: Array<{
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: string;
  attributes: Record<string, string>;
  variants: Array<{ key: string; sku: string; options: Record<string, string>; priceCents: number; stock: number }>;
  photos: string[];
}> = [
  {
    id: id("prd", "speckledmug"),
    sellerId: sellers[0]!.id,
    title: "Speckled stoneware mug",
    description: "Wheel-thrown mug with a raw clay foot and a food-safe satin glaze. Holds about 10 oz. Each one is a little different.",
    category: "mugs",
    attributes: { material: "stoneware", capacity: "10 oz", care: "dishwasher safe" },
    variants: [
      { key: "speckoat", sku: "JCS-MUG-OAT", options: { glaze: "Oat speckle" }, priceCents: 3400, stock: 6 },
      { key: "specksea", sku: "JCS-MUG-SEA", options: { glaze: "Sea glass blue" }, priceCents: 3600, stock: 4 },
    ],
    photos: ["juniper-speckled-cup.jpg", "juniper-sea-glass-bowl-cup.jpg"],
  },
  {
    id: id("prd", "cobaltdrip"),
    sellerId: sellers[0]!.id,
    title: "Cobalt drip mug",
    description: "Deep cobalt blue glaze that pools into a darker drip at the rim. Hand-thrown, 12 oz, with a thumb rest on the handle.",
    category: "mugs",
    attributes: { material: "stoneware", color: "blue", capacity: "12 oz" },
    variants: [{ key: "cobalt12", sku: "JCS-MUG-COBALT", options: { size: "12 oz" }, priceCents: 3200, stock: 5 }],
    photos: ["juniper-cobalt-drip.jpg"],
  },
  {
    id: id("prd", "ashbowl"),
    sellerId: sellers[0]!.id,
    title: "Ash-glaze serving bowl",
    description: "Wide, shallow serving bowl in a pale wood-ash glaze with a soft satin finish. About 11 inches across.",
    category: "bowls",
    attributes: { material: "stoneware", diameter: "11 in" },
    variants: [{ key: "ashbowl11", sku: "JCS-BOWL-ASH", options: { size: "11 in" }, priceCents: 9500, stock: 2 }],
    photos: ["juniper-ash-bowl.jpg"],
  },
  {
    id: id("prd", "budvases"),
    sellerId: sellers[0]!.id,
    title: "Bud vase trio",
    description: "Three small bud vases for single stems, sold as a set: one pale celadon, two in copper-red glazes. Glazed inside so they hold water.",
    category: "vases",
    attributes: { material: "stoneware", pieces: "3" },
    variants: [
      { key: "budwhite", sku: "JCS-VASE-WHITE", options: { set: "Celadon + copper red" }, priceCents: 2800, stock: 8 },
      { key: "budclay", sku: "JCS-VASE-CLAY", options: { set: "All copper red" }, priceCents: 2800, stock: 8 },
    ],
    photos: ["juniper-bud-vase-trio.jpg"],
  },
  {
    id: id("prd", "indigonapkins"),
    sellerId: sellers[1]!.id,
    title: "Indigo linen napkins",
    description: "Set of four linen napkins, hand-dyed in natural indigo with a woven white stripe. Softens with every wash.",
    category: "linens",
    attributes: { material: "linen", pieces: "4", color: "indigo blue" },
    variants: [{ key: "indigo4", sku: "FNL-NAPKIN-INDIGO", options: { set: "4 napkins" }, priceCents: 4200, stock: 10 }],
    photos: ["fern-indigo-stripe.jpg"],
  },
  {
    id: id("prd", "shiboritowel"),
    sellerId: sellers[1]!.id,
    title: "Shibori tea towel",
    description: "Cotton-linen tea towel, folded and bound by hand before the indigo bath, so every grid is a little different.",
    category: "linens",
    attributes: { material: "cotton-linen", size: "18 × 28 in", color: "indigo blue" },
    variants: [{ key: "shibori1", sku: "FNL-TOWEL-SHIBORI", options: { size: "18 × 28 in" }, priceCents: 2400, stock: 12 }],
    photos: ["fern-shibori.jpg"],
  },
  {
    id: id("prd", "blockrunner"),
    sellerId: sellers[1]!.id,
    title: "Block-print table runner",
    description: "Linen table runner printed by hand with a carved wheat-sheaf block and dyed in indigo. 14 by 72 inches.",
    category: "linens",
    attributes: { material: "linen", size: "14 × 72 in", color: "indigo blue" },
    variants: [{ key: "runner72", sku: "FNL-RUNNER-BLOCK", options: { size: "14 × 72 in" }, priceCents: 6400, stock: 5 }],
    photos: ["fern-block-print.jpg"],
  },
  {
    id: id("prd", "judgemug"),
    sellerId: sellers[2]!.id,
    title: "Practice copper-red cup",
    description: "A demo listing in the judges' practice shop. Buy it from judge mode to see the order ping, tracking and refund flow.",
    category: "mugs",
    attributes: { material: "stoneware", capacity: "10 oz" },
    variants: [{ key: "judgemug1", sku: "JDG-MUG-01", options: { glaze: "Copper red" }, priceCents: 3200, stock: 50 }],
    photos: ["judge-copper-cup.jpg"],
  },
  {
    id: id("prd", "judgebowl"),
    sellerId: sellers[2]!.id,
    title: "Practice serving bowl",
    description: "A demo listing in the judges' practice shop, priced for the refund-approval flow.",
    category: "bowls",
    attributes: { material: "stoneware", diameter: "11 in" },
    variants: [{ key: "judgebowl1", sku: "JDG-BOWL-01", options: { size: "11 in" }, priceCents: 9000, stock: 50 }],
    photos: ["judge-white-bowl.jpg"],
  },
];

// `--only judge_demo` seeds just the named sellers and their products (leaves other sellers' live stock alone).
const onlyArg = process.argv.indexOf("--only");
const onlyHandles = onlyArg > -1 ? new Set((process.argv[onlyArg + 1] ?? "").split(",")) : null;

async function main() {
  const db = getDb(process.env.DATABASE_URL);
  const policy = RefundPolicy.parse({});
  const chosen = sellers.filter((s) => !onlyHandles || onlyHandles.has(s.handle));
  const chosenIds = new Set(chosen.map((s) => s.id));
  for (const s of chosen) {
    await db
      .insert(schema.sellers)
      .values({ ...s, refundPolicy: policy })
      .onConflictDoUpdate({ target: schema.sellers.id, set: { displayName: s.displayName, bio: s.bio, flatShippingCents: s.flatShippingCents, testOnly: s.testOnly ?? false } });
  }
  for (const p of products.filter((p) => chosenIds.has(p.sellerId))) {
    const { variants, photos, ...prod } = p;
    await db
      .insert(schema.products)
      .values({ ...prod, status: "approved", priceConfirmed: true, approvedAt: new Date(), fieldConfidence: {} })
      .onConflictDoUpdate({ target: schema.products.id, set: { title: prod.title, description: prod.description, status: "approved", attributes: prod.attributes } });
    for (const v of variants) {
      await db
        .insert(schema.variants)
        .values({ id: id("var", v.key), productId: p.id, sku: v.sku, options: v.options, priceCents: v.priceCents, stock: v.stock, active: true })
        .onConflictDoUpdate({ target: schema.variants.id, set: { priceCents: v.priceCents, stock: v.stock, active: true, options: v.options } });
    }
    // Photos go through the same pipeline as a seller's upload (sha256 identity, WebP, ≤ 1600 px).
    for (const [position, file] of photos.entries()) {
      const input = readFileSync(join(PHOTOS, file));
      const sha256 = photoSha256(input);
      const { data, info } = await processPhoto(input);
      await db.insert(schema.images).values({ sha256, mime: "image/webp", width: info.width, height: info.height, bytes: data }).onConflictDoNothing();
      await db.insert(schema.productImages).values({ productId: p.id, imageSha256: sha256, position }).onConflictDoUpdate({ target: [schema.productImages.productId, schema.productImages.imageSha256], set: { position } });
    }
  }
  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int n from variants where active`)).rows as [{ n: number }];
  console.log(`Seeded ${chosen.length} sellers, ${products.filter((p) => chosenIds.has(p.sellerId)).length} products; ${n} active variants in total.`);
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  await closeDb();
  process.exit(1);
});
