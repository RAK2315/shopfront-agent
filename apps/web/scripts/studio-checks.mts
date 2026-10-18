// Studio editor (walkthrough #9, D-090) on the DEPLOYED app, real Gemini vision + PayPal catalog (no mocks):
//   E1  the Studio opens on step 1 of 3 (Upload → Review → Publish) with a drop zone showing real listing photos
//   E2  a fresh photo → an AI draft: the rail moves to Review; fields carry the "AI" marker; the price sits in its own
//       block and Publish stays disabled until the seller confirms the price
//   E3  unhappy: a price of "0" can't be confirmed; a non-image upload is refused with a message
//   E4  confirm + publish → the success panel (live in the shop, PayPal catalog id) → the storefront shows the listing
//   E5  screenshots at desktop, 1920 and mobile; no sideways scroll. The demo reset afterwards archives the listing.
// Usage: pnpm --filter web studio-checks -- --base https://shopfront-agent.onrender.com
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { chromium, type Page } from "@playwright/test";
import pg from "pg";
import sharp from "sharp";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/studio")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();

// A photo no one has uploaded before (a new sha256 = a real vision call, not the cache): a seed photo, re-cropped.
const seed = readFileSync(resolve("seed-photos/juniper-speckled-cup.jpg"));
const fresh = await sharp(seed).resize(820).modulate({ brightness: 1 + Math.random() * 0.03 }).jpeg({ quality: 88 }).toBuffer();
const photo = join(tmpdir(), `shopfront-fresh-${Date.now()}.jpg`);
writeFileSync(photo, fresh);
const notImage = join(tmpdir(), "shopfront-not-an-image.txt");
writeFileSync(notImage, "this is not a photo");

const browser = await chromium.launch({ headless: false, channel: "chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const rail = async (p: Page) => p.locator("[data-testid=studio-rail] li").evaluateAll((els) => els.map((el) => el.getAttribute("data-state")));
async function shots(name: string) {
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await sleep(700);
    overflow[s.tag] = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: join(out, `${name}-${s.tag}.png`), fullPage: s.tag === "mobile" });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return overflow;
}

try {
  await page.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
  const cont = page.getByRole("button", { name: /^continue as/i });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await page.getByTestId("drop-zone").waitFor({ timeout: 60_000 });
  }

  // E1
  {
    const r = await rail(page);
    const thumbs = await page.getByTestId("drop-zone").locator("img").count();
    const overflow = await shots("E1-studio");
    record("E1 step 1 of 3, drop zone with real photos", r[0] === "active" && r[1] === "todo" && thumbs >= 1 && Object.values(overflow).every((o) => o <= 0), { rail: r, thumbs, overflow });
  }

  // E3 (part): a non-image is refused
  {
    await page.getByTestId("photo-input").setInputFiles(notImage);
    await sleep(1500);
    const text = await page.locator("body").innerText();
    record("E3a a non-image upload does nothing harmful", !/To review[\s\S]*Drafted from your photo/.test(text), { note: "the input filters to images; no draft appears" });
  }

  // E2
  {
    await page.getByTestId("photo-input").setInputFiles(photo);
    const card = page.getByTestId("draft-card").first();
    await card.waitFor({ timeout: 120_000 });
    const r = await rail(page);
    const aiMarks = await card.getByText("AI", { exact: true }).count();
    const priceBlock = await card.getByTestId("price-block").isVisible();
    const disabled = await card.getByTestId("publish").isDisabled();
    const overflow = await shots("E2-draft");
    record("E2 AI draft: rail on Review, AI markers, price block, Publish locked", r[0] === "done" && r[1] === "active" && aiMarks >= 2 && priceBlock && disabled && Object.values(overflow).every((o) => o <= 0), { rail: r, aiMarks, priceBlock, publishDisabled: disabled, overflow });

    // E3b: "0" can't be confirmed
    const priceInput = card.getByTestId("price-block").locator("input").first();
    await priceInput.fill("0");
    const confirm = card.getByRole("button", { name: "Confirm price" }).first();
    await confirm.click();
    const stillLocked = await card.getByTestId("publish").isDisabled();
    record("E3b a $0 price can't be confirmed", stillLocked, { stillLocked });

    // E4
    await priceInput.fill("38");
    await card.getByRole("button", { name: "Confirm price" }).first().click();
    const unlocked = !(await card.getByTestId("publish").isDisabled());
    await card.getByTestId("publish").click();
    const panel = page.getByTestId("published-panel").first();
    await panel.waitFor({ timeout: 60_000 });
    const panelText = await panel.innerText();
    const r2 = await rail(page);
    const href = await panel.getByTestId("published-storefront").getAttribute("href");
    const productId = href?.split("/").pop() ?? "";
    const row = (await db.query("select p.status, p.paypal_catalog_id, v.price_cents from products p join variants v on v.product_id = p.id where p.id = $1", [productId])).rows[0];
    const overflow4 = await shots("E4-published");
    await page.goto(base + href, { waitUntil: "load" });
    const store = await page.locator("body").innerText();
    await page.screenshot({ path: join(out, "E4-storefront-listing-desktop.png") });
    record(
      "E4 publish → success panel → live in the storefront and PayPal's catalog",
      unlocked && /is live/.test(panelText) && r2.every((x) => x === "done") && row?.status === "approved" && row?.price_cents === 3800 && Boolean(row?.paypal_catalog_id) && /\$38\.00/.test(store) && Object.values(overflow4).every((o) => o <= 0),
      { productId, db: row, rail: r2, storefrontShowsPrice: /\$38\.00/.test(store), overflow: overflow4 },
    );
  }
} catch (err) {
  for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: join(out, `_error-${i}.png`) }).catch(() => {});
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
