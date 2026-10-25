// Captures real footage of the deployed app for the video (DEMO-SCRIPT v5.1 capture list, D-058, D-108).
// CDP screencast frames (JPEG 92) at 2x device scale, so zooms stay sharp; each recorded window ("track") becomes its
// own constant-30-fps mp4, assembled with Remotion's bundled ffmpeg so it plays in real time. Headed Chromium: PayPal's
// sandbox fails headless. A take is a real public session (not test-marked), as intended for the video.
// Every click is logged with its box (CSS px of that track's viewport) and time, so the edit can draw the cursor.
// Writes public/clips/<beat>.<track>.mp4 and public/clips/<beat>.json. Never writes URLs, tokens or secrets.
// Usage (from video/): node --env-file=../.env capture/capture.mts --beat <name> [--base https://...] [--dry]
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from "playwright";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const base = opt("--base", "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const beat = opt("--beat", "");
const dry = args.includes("--dry"); // studio-publish: stop before Publish
const root = resolve(import.meta.dirname, "..");
const clips = join(root, "public", "clips");
const framesRoot = join(root, ".frames", beat);
const FPS = 30;
const DPR = Number(process.env.CAP_DPR ?? 1.5); // 1.5x: ~25-35 fps from the screencast; 2x drops to ~17 fps (D-109)
const JPEGQ = Number(process.env.CAP_Q ?? 92);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const env = process.env as Record<string, string>;

type Box = { x: number; y: number; width: number; height: number };
type Frame = { file: string; t: number };
type Track = { name: string; dir: string; frames: Frame[]; css: { w: number; h: number }; stop: () => Promise<void> };
const tracks = new Map<string, Track>();
const marks: Record<string, { at: number; track: string; box?: Box; kind?: string; [k: string]: unknown }> = {};

async function rec(page: Page, name: string) {
  const dir = join(framesRoot, name);
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize() ?? (await page.evaluate(() => ({ width: innerWidth, height: innerHeight })));
  const t: Track = { name, dir, frames: [], css: { w: vp.width, h: vp.height }, stop: async () => {} };
  cdp.on("Page.screencastFrame", async (f) => {
    const file = join(dir, `${String(t.frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    t.frames.push({ file, t: f.metadata.timestamp ?? Date.now() / 1000 });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: JPEGQ, maxWidth: vp.width * DPR, maxHeight: vp.height * DPR, everyNthFrame: 1 });
  t.stop = async () => void (await cdp.send("Page.stopScreencast").catch(() => {}));
  tracks.set(name, t);
  log("recording", name, `${vp.width}x${vp.height}@${DPR}x`);
}

function mark(key: string, extra: { track?: string; box?: Box | null; [k: string]: unknown } = {}) {
  const { track = "main", box, ...rest } = extra;
  marks[key] = { at: Date.now() / 1000, track, ...(box ? { box: round(box) } : {}), ...rest };
  log("mark", key);
}
const round = (b: Box) => ({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });
const boxOf = async (l: Locator) => (await l.first().boundingBox()) ?? undefined;

/** Scroll an element to the middle of its frame with the browser's own smooth scroll, then let it settle. */
async function center(l: Locator, settle = 1300) {
  await l.first().evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await sleep(settle);
}
/** A click as the video shows it: hold still while the drawn cursor travels (~1 s), then press. */
async function click(l: Locator, key: string, track = "main", pre = 1100) {
  await l.first().waitFor({ state: "visible", timeout: 120_000 });
  await sleep(pre);
  mark(key, { track, box: await boxOf(l), kind: "click" });
  await l.first().click();
}
async function typeInto(l: Locator, text: string, key: string, track = "main") {
  await click(l, key, track);
  await l.first().pressSequentially(text, { delay: 55 });
}

/** PayPal's sandbox popup or page: log in as the published sandbox buyer (or skip if already in), then approve. */
async function paypalApprove(p: Page, track: string, payName = /complete purchase|pay now|^pay$|continue to review|agree.*pay/i) {
  await p.waitForLoadState("domcontentloaded");
  const email = p.locator("#email, input[name='login_email']").first();
  const pay = p.getByRole("button", { name: payName }).first();
  for (let i = 0; ; i++) {
    const which = await Promise.race([
      email.waitFor({ timeout: 20_000 }).then(() => "login"),
      pay.waitFor({ timeout: 20_000 }).then(() => "pay"),
    ]).catch(() => "none");
    if (which === "pay") break;
    if (which === "login") {
      await typeInto(email, env.SANDBOX_BUYER_EMAIL!, `${track}.email`, track);
      const next = p.locator("#btnNext");
      if (await next.isVisible().catch(() => false)) await click(next, `${track}.next`, track, 500);
      const pw = p.locator("#password, input[name='login_password']").first();
      await pw.waitFor({ timeout: 30_000 });
      await sleep(600);
      await pw.fill(env.SANDBOX_BUYER_PASSWORD!); // typed off-camera speed; the field shows dots only
      await click(p.getByRole("button", { name: /^log ?in$/i }), `${track}.login`, track, 600);
      break;
    }
    const tryAgain = p.getByRole("button", { name: /try again/i }).first();
    if (i < 3 && (await tryAgain.isVisible().catch(() => false))) {
      await tryAgain.click().catch(() => {});
      continue;
    }
    throw new Error("PayPal's sandbox page didn't load (D-048); retake");
  }
  // After login PayPal sometimes shows "Things don't appear to be working" (D-048): press its Try again.
  for (let i = 0; ; i++) {
    const which = await Promise.race([
      pay.waitFor({ timeout: 45_000 }).then(() => "pay"),
      p.getByRole("button", { name: /try again/i }).first().waitFor({ timeout: 45_000 }).then(() => "again"),
    ]).catch(() => "none");
    if (which === "pay") break;
    if (which === "again" && i < 3) {
      log("PayPal: Try again");
      await sleep(1000);
      await p.getByRole("button", { name: /try again/i }).first().click().catch(() => {});
      continue;
    }
    throw new Error("PayPal's review page didn't load (D-048)");
  }
  await sleep(1500);
  await click(pay, `${track}.approve`, track);
}

/** A shopper's purchase on /shop: query → checkout card → /pay → PayPal popup → paid. Optionally records its windows. */
async function buy(ctx: BrowserContext, query: string, recordAs?: { shop?: Page; shopTrack?: string; payTrack?: string; ppTrack?: string }) {
  const page = recordAs?.shop ?? (await ctx.newPage());
  if (!recordAs?.shop) await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });
  const shop = recordAs?.shop ? page.frameLocator('iframe[src="/shop"]') : page;
  const st = recordAs?.shopTrack ?? "bg";
  const input = shop.getByTestId("shop-input");
  await typeInto(input, query, "query", st);
  await sleep(500);
  await click(shop.getByRole("button", { name: "Send", exact: true }), "send", st, 500);
  const card = shop.getByTestId("checkout-card");
  const got = await card.waitFor({ timeout: 100_000 }).then(() => true, () => false);
  if (!got) {
    log("no checkout card yet; confirming");
    await shop.getByTestId("shop-input").fill("Yes, please check that one out.");
    await shop.getByRole("button", { name: "Send", exact: true }).click();
    await card.waitFor({ timeout: 100_000 });
  }
  await center(card, 800);
  mark("checkoutCard", { track: st, box: await boxOf(card) });
  await sleep(4000);
  // Pay right in the card (its PayPal button opens PayPal's popup); the card turns green when PayPal confirms.
  const ready = shop.locator('[data-testid=checkout-card][data-phase="ready"]');
  for (let attempt = 1; ; attempt++) {
    await ready.waitFor({ timeout: 60_000 });
    await sleep(800);
    const popupP = page.waitForEvent("popup", { timeout: 20_000 });
    await click(card.locator("paypal-button"), attempt === 1 ? "paypalButton" : `paypalButton${attempt}`, st);
    const popup = await popupP.catch(() => null);
    const pt = recordAs?.ppTrack ? (attempt === 1 ? recordAs.ppTrack : `${recordAs.ppTrack}${attempt}`) : "bg";
    try {
      if (!popup) throw new Error("popup did not open");
      if (recordAs?.ppTrack) {
        await popup.waitForLoadState("domcontentloaded");
        await rec(popup, pt);
      }
      await paypalApprove(popup, pt);
      mark("ppFinal", { track: pt });
      break;
    } catch (err) {
      if (recordAs?.ppTrack) await tracks.get(pt)?.stop();
      await popup?.close().catch(() => {});
      if (attempt >= 4) throw err;
      log(`popup attempt ${attempt} failed; retrying`, String(err).slice(0, 120));
      await sleep(6000);
    }
  }
  const paidCard = shop.locator('[data-testid=checkout-card][data-phase="paid"]');
  await paidCard.waitFor({ timeout: 120_000 });
  mark("paid", { track: st, box: await boxOf(paidCard) });
  return { page };
}

async function sellerContext(browser: Browser, viewport: { width: number; height: number }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: DPR });
  const r = await ctx.request.post(`${base}/api/seller/session`, { data: { handle: "juniper_clay" } });
  if (!r.ok()) throw new Error(`seller session ${r.status()}`);
  return ctx;
}

const W = { width: 1440, height: 810 };
const WIDE = { width: 1600, height: 900 };

const beats: Record<string, (browser: Browser) => Promise<void>> = {
  // A 4-second probe of the output resolution.
  async probe(browser) {
    const ctx = await browser.newContext({ viewport: process.env.CAP_WIDE ? WIDE : W, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    await page.goto(base + "/gauntlet", { waitUntil: "load", timeout: 180_000 });
    await rec(page, "main");
    await sleep(500);
    await page.evaluate(() => new Promise<void>((done) => { const t0 = performance.now(); const step = (t: number) => { window.scrollTo(0, (t - t0) / 3); if (t - t0 < 3000) requestAnimationFrame(step); else done(); }; requestAnimationFrame(step); }));
    await sleep(300);
  },

  // Beat 3: the green mug photo → a live Gemini draft → confirm $36 → publish (once, D-106). --dry stops before Publish.
  async "studio-publish"(browser) {
    const ctx = await sellerContext(browser, W);
    const page = await ctx.newPage();
    await page.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
    const drop = page.getByTestId("drop-zone");
    await drop.waitFor({ timeout: 60_000 });
    await rec(page, "main");
    await sleep(1500);
    await center(drop, 1600);
    mark("dropZone", { box: await boxOf(drop) });
    await sleep(1200);
    // A re-encoded copy of mug.jpg: a new image hash, so Gemini reads it live (not the cache).
    const photo = join(framesRoot, "green-mug.jpg");
    const width = String(1180 + Math.floor(Math.random() * 40));
    if (spawnSync(ffmpeg(), ["-y", "-v", "error", "-i", join(root, "public/products/mug.jpg"), "-vf", "scale=" + width + ":-2", "-q:v", "3", photo]).status !== 0) throw new Error("could not prepare the photo");
    mark("drop", { box: await boxOf(drop) });
    await page.getByTestId("photo-input").setInputFiles(photo);
    const pending = page.getByTestId("pending-card").first();
    await pending.waitFor({ timeout: 30_000 }).then(async () => mark("reading", { box: await boxOf(pending) }), () => log("no pending card seen"));
    const card = page.getByTestId("draft-card").first();
    await card.waitFor({ timeout: 120_000 });
    mark("draft", { box: await boxOf(card) });
    await sleep(800);
    await center(card.locator("h3, input").first(), 1500);
    mark("draftTop", { box: await boxOf(card) });
    await sleep(3500);
    const title = (await card.locator("input").first().inputValue().catch(() => "")) || (await card.innerText()).slice(0, 80);
    log("draft title:", title);
    if (!/green/i.test(title)) throw new Error(`draft title has no "green" (${title}); beat 4 searches for a green mug. Not publishing.`);
    const block = card.getByTestId("price-block");
    await center(block, 1500);
    mark("aiGuess", { box: await boxOf(block) });
    await sleep(2500);
    const price = block.locator("input").first();
    await click(price, "priceInput");
    await price.press("Control+A");
    await price.pressSequentially("36", { delay: 120 });
    await sleep(500);
    const stock = block.locator("input").nth(1);
    if (await stock.count()) {
      await click(stock, "stockInput", "main", 700);
      await stock.press("Control+A");
      await stock.pressSequentially("6", { delay: 120 });
      await sleep(400);
    }
    await click(block.getByRole("button", { name: "Confirm price" }), "confirmPrice");
    await sleep(1500);
    mark("confirmed", { box: await boxOf(block) });
    const publish = card.getByTestId("publish");
    await center(publish, 1000);
    if (dry) {
      log("dry run: stopping before Publish");
      await sleep(2000);
      return;
    }
    await click(publish, "publish");
    const panel = page.getByTestId("published-panel").first();
    await panel.waitFor({ timeout: 60_000 });
    await sleep(600);
    await center(panel, 1200);
    mark("published", { box: await boxOf(panel), text: (await panel.innerText()).replace(/\s+/g, " ").slice(0, 200) });
    mark("catalogId", { box: await boxOf(panel.getByText(/Mirrored to PayPal/)) });
    await sleep(5000);
  },

  // Beat 4: the shopper's agent buys the green mug; the live wire shows every call; PayPal popup; paid; webhook.
  async "split-shop"(browser) {
    const ctx = await browser.newContext({ viewport: WIDE, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    await page.goto(`${base}/capture?left=/shop&right=/live`, { waitUntil: "load", timeout: 180_000 });
    const wire = page.frameLocator('iframe[src^="/live"]');
    await wire.getByText("Connected").first().waitFor({ timeout: 60_000 });
    await rec(page, "main");
    await sleep(2000);
    await buy(ctx, "Find me a handmade green mug under $40", { shop: page, shopTrack: "main", ppTrack: "paypal" });
    await page.bringToFront();
    await sleep(800);
    mark("back");
    // The shop card turns green and the wire shows the verified webhook; hold long enough for it to arrive.
    const ok = await wire.getByText(/signature.verified|webhook/i).last().waitFor({ timeout: 45_000 }).then(() => true, () => false);
    mark("webhook", { found: ok });
    // v6 (D-110): also hold until PayPal's capture webhook confirms the payment, so the card's "Waiting for PayPal's
    // webhook…" resolves on camera.
    const done = await wire.getByText(/PAYMENT\.CAPTURE\.COMPLETED/).first().waitFor({ timeout: 90_000 }).then(() => true, () => false);
    mark("captureWebhook", { found: done });
    await sleep(done ? 7000 : 9000);
  },

  // Beat 5 cut: the public storefront at phone width, a short scroll.
  async "storefront-phone"(browser) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(`${base}/s/juniper_clay`, { waitUntil: "load", timeout: 180_000 });
    await sleep(2500);
    await rec(page, "main");
    await sleep(1500);
    mark("scroll");
    await page.evaluate(() => window.scrollTo({ top: 760, behavior: "smooth" }));
    await sleep(2500);
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: "smooth" }));
    await sleep(3000);
  },

  // Beat 6a: Log in with PayPal from the Get paid card (the demo shop only shows the check).
  async "get-paid"(browser) {
    const ctx = await sellerContext(browser, W);
    const page = await ctx.newPage();
    await page.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
    const card = page.getByTestId("get-paid-card");
    await card.waitFor({ timeout: 60_000 });
    await rec(page, "main");
    await sleep(1500);
    mark("card", { box: await boxOf(card) });
    await click(card.getByTestId("connect-paypal"), "connect");
    await paypalApprove(page, "main", /agree|continue|consent|allow/i).catch((e) => log("consent step:", String(e).slice(0, 100)));
    await page.waitForURL((u) => u.toString().startsWith(base), { timeout: 90_000 });
    const banner = page.getByTestId("verified-banner");
    await banner.waitFor({ timeout: 60_000 });
    await sleep(800);
    mark("verified", { box: await boxOf(banner) });
    await sleep(5000);
  },

  // Beat 6b: a Fern & Loom order on the live wire ("paid to Fern & Loom"), bought in another window off camera.
  async "live-fern"(browser) {
    const ctx = await browser.newContext({ viewport: W, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    await page.goto(`${base}/live?from=now`, { waitUntil: "load", timeout: 180_000 });
    await page.getByText("Connected").first().waitFor({ timeout: 60_000 });
    await rec(page, "main");
    const buyer = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await buy(buyer, "Handmade linen napkins for a housewarming gift, under $60");
    await page.bringToFront();
    const fern = page.getByText(/Fern (&|and) Loom/).last();
    await fern.waitFor({ timeout: 60_000 }).catch(() => log("no Fern & Loom text yet"));
    await sleep(8000);
    mark("fern", { box: await boxOf(page.getByText(/paid to Fern/i)) });
    await sleep(4000);
  },

  // Beat 7: the Gauntlet, run live (~90 s; the edit speeds up the middle and labels it).
  async gauntlet(browser) {
    const ctx = await browser.newContext({ viewport: W, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    await page.goto(`${base}/gauntlet`, { waitUntil: "load", timeout: 180_000 });
    await page.getByTestId("gauntlet-board").waitFor({ timeout: 60_000 });
    await rec(page, "main");
    await sleep(1500);
    await click(page.getByTestId("g-run"), "run");
    await sleep(2500);
    await center(page.getByTestId("g-row").first(), 1500);
    mark("rows", { box: await boxOf(page.getByTestId("g-row").first()) });
    const board = page.getByTestId("gauntlet-board");
    const started = Date.now();
    for (let last = ""; Date.now() - started < 240_000; ) {
      const running = await page.getByTestId("g-run").isDisabled().catch(() => false);
      const done = (await board.getAttribute("data-done")) ?? "";
      if (done !== last) last = done;
      if (!running && Date.now() - started > 8000) break;
      // Follow the newest finished row down the page, slowly.
      const n = Number(done) || 0;
      if (n > 1) await page.getByTestId("g-row").nth(Math.max(0, n - 2)).evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" })).catch(() => {});
      await sleep(2500);
    }
    mark("done");
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(1800);
    mark("counters", { box: await boxOf(page.getByTestId("g-harmed")), blocked: await boxOf(page.getByTestId("g-blocked")) });
    await sleep(4000);
  },

  // Beat 7 detail: the stored run, read slowly (no new run): scroll to the photo-injection family and hold.
  async "gauntlet-tour"(browser) {
    const ctx = await browser.newContext({ viewport: W, deviceScaleFactor: DPR });
    const page = await ctx.newPage();
    await page.goto(`${base}/gauntlet`, { waitUntil: "load", timeout: 180_000 });
    await page.getByTestId("gauntlet-board").waitFor({ timeout: 60_000 });
    await rec(page, "main");
    await sleep(1500);
    const h = page.getByRole("heading", { name: /Injection in a product photo/i });
    await h.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: "smooth" }));
    await sleep(1800);
    mark("photo", { box: await boxOf(page.getByTestId("g-row").filter({ has: page.locator("img") }).first()) });
    await sleep(5000);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    await sleep(1800);
    mark("counters", { box: await boxOf(page.getByTestId("g-harmed")) });
    await sleep(3000);
  },

  // Beat 8a: the Overview on AG Grid at 1920: group by product, drill-down, a live row, Ask + Undo.
  async "dashboard-overview"(browser) {
    const ctx = await sellerContext(browser, WIDE);
    const page = await ctx.newPage();
    await page.goto(`${base}/studio/dashboard`, { waitUntil: "load", timeout: 180_000 });
    await page.locator("[data-testid=orders-grid] .ag-row").first().waitFor({ timeout: 120_000 });
    await rec(page, "main");
    await sleep(2000);
    mark("start", { box: await boxOf(page.getByTestId("orders-grid")) });
    // Group by product (a select: show the press, then choose).
    const group = page.getByTestId("group-select");
    await group.waitFor();
    await sleep(1100);
    mark("group", { box: await boxOf(group), kind: "click" }); // a native select: show the press, set the value
    await group.selectOption("product");
    await sleep(2500);
    mark("grouped", { box: await boxOf(page.getByTestId("orders-grid")) });
    await sleep(1500);
    await sleep(1100);
    mark("ungroup", { box: await boxOf(group), kind: "click" });
    await group.selectOption("");
    await sleep(2000);
    // Drill-down: the first order row → its PayPal history.
    const row = page.locator("[data-testid=orders-grid] .ag-row [col-id=product]").first();
    await click(row, "row");
    const detail = page.getByTestId("order-detail");
    await detail.waitFor({ timeout: 20_000 });
    await sleep(2500);
    mark("detail", { box: await boxOf(detail) });
    await sleep(3000);
    await click(row, "rowClose").catch(() => {});
    await sleep(1500);
    // A live sale from another window (a real PayPal approval); the row slides in without a reload.
    const rows0 = Number(await page.getByTestId("orders-grid").getAttribute("data-rows"));
    const buyer = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await buy(buyer, "Find me a speckled oatmeal bowl under $50");
    await page.bringToFront();
    for (let i = 0; i < 40; i++) {
      if (Number(await page.getByTestId("orders-grid").getAttribute("data-rows")) > rows0) break;
      await sleep(1000);
    }
    mark("liveRow", { box: await boxOf(page.locator("[data-testid=orders-grid] .ag-row").first()) });
    await sleep(4000);
    // Ask: "unshipped orders over $50" → the grid filters itself, a banner says what changed → Undo.
    const ask = page.getByTestId("dash-ask-input");
    await typeInto(ask, "unshipped orders over $50", "askInput");
    await click(page.getByTestId("dash-ask-submit"), "askSubmit", "main", 500);
    for (let i = 0; i < 120 && (await page.getByTestId("dash-ask-submit").getAttribute("aria-busy")); i++) await sleep(1000);
    await sleep(1500);
    mark("askResult", { box: await boxOf(page.getByTestId("dash-change")) });
    await sleep(4000);
    await click(page.getByTestId("dash-undo"), "undo");
    await sleep(3000);
    mark("reconciled", { box: await boxOf(page.getByText(/Reconciled with PayPal/).first()) });
    await sleep(2500);
  },

  // Beat 8b: Report · AG Studio: five page tabs; the Shop Manager answers with sources, refuses a refund, makes an AI
  // change tagged AI, and Undo.
  async "dashboard-report"(browser) {
    const ctx = await sellerContext(browser, WIDE);
    const page = await ctx.newPage();
    await page.goto(`${base}/studio/dashboard?tab=report`, { waitUntil: "load", timeout: 180_000 });
    await page.getByTestId("dashboard").waitFor({ timeout: 120_000 });
    await page.getByPlaceholder("Ask the AI Assistant...").waitFor({ timeout: 90_000 });
    await sleep(3000);
    await rec(page, "main");
    await sleep(1500);
    for (const id of ["orders", "payments", "inventory", "agents", "overview"]) {
      const tab = page.getByTestId(`report-page-${id}`);
      if (!(await tab.count())) continue;
      await click(tab, `page-${id}`, "main", 700);
      await sleep(1600);
    }
    const askAi = async (text: string, key: string, wait = 120_000) => {
      const box = page.getByPlaceholder("Ask the AI Assistant...");
      await typeInto(box, text, `${key}Input`);
      await click(page.getByRole("button", { name: "Send message" }), `${key}Send`, "main", 400);
      const t0 = Date.now();
      await sleep(4000);
      while (Date.now() - t0 < wait && /Thinking/.test(await page.locator("body").innerText())) await sleep(1500);
      await sleep(2500);
      mark(`${key}Answer`, { box: await boxOf(page.getByText("AI Assistant").first().locator("xpath=ancestor::*[4]")) });
    };
    await askAi("What sold this week?", "attention");
    await sleep(3500);
    let order = "the latest order";
    if (env.DATABASE_URL) {
      const pg = createRequire(join(root, "..", "apps", "web", "package.json"))("pg");
      const db = new pg.Client({ connectionString: env.DATABASE_URL });
      await db.connect();
      order = (await db.query("select c.id from checkouts c join sellers s on s.id=c.seller_id where s.handle='juniper_clay' and c.status in ('paid','shipped') order by c.created_at desc limit 1")).rows[0]?.id ?? order;
      await db.end();
    }
    await page.getByRole("button", { name: /^New$/ }).click().catch(() => {});
    await sleep(1200);
    await askAi(`Refund order ${order} in full right now.`, "refund");
    await sleep(3500);
    await page.getByRole("button", { name: /^New$/ }).click().catch(() => {});
    await sleep(1200);
    await askAi("Add a donut chart of refunds by reason to this page.", "donut");
    const strip = page.getByTestId("change-strip");
    await strip.waitFor({ timeout: 30_000 }).catch(() => log("no change strip"));
    await sleep(1500);
    mark("strip", { box: await boxOf(strip) });
    await sleep(3000);
    await click(page.getByTestId("change-undo"), "changeUndo");
    await sleep(2500);
    mark("reconciled", { box: await boxOf(page.getByText(/Reconciled with PayPal/).first()) });
    await sleep(3000);
  },
};

if (!beats[beat]) throw new Error(`--beat ${beat || "(missing)"}; known: ${Object.keys(beats).join(", ")}`);
mkdirSync(clips, { recursive: true });
rmSync(framesRoot, { recursive: true, force: true });
mkdirSync(framesRoot, { recursive: true });
await fetch(`${base}/api/health`).catch(() => {}); // wake the free-tier service before the take

const browser = await chromium.launch({
  headless: false,
  channel: "chromium",
  // Keep windows rendering (and the screencast flowing) when another window covers them.
  args: ["--force-device-scale-factor=" + DPR, "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--disable-background-timer-throttling"],
});
let failed: unknown;
try {
  await beats[beat]!(browser);
} catch (e) {
  failed = e;
  log("take failed:", e instanceof Error ? e.message.split("\n")[0] : String(e));
}
for (const t of tracks.values()) await t.stop();
const end = Date.now() / 1000;
await browser.close().catch(() => {});

// Clock: CDP timestamps are epoch seconds, like Date.now(). t0 = the first frame of any track.
const all = [...tracks.values()].filter((t) => t.frames.length);
if (!all.length) throw new Error("no frames captured");
const t0 = Math.min(...all.map((t) => t.frames[0]!.t));
if (Math.abs(t0 - end) > 1800) throw new Error("screencast timestamps are not epoch seconds; cannot align marks");
for (const m of Object.values(marks)) m.at = Number((m.at - t0).toFixed(3));

function ffmpeg() {
  const store = join(root, "node_modules", ".pnpm");
  const dir = readdirSync(store).find((d) => d.startsWith("@remotion+compositor-"))!;
  const pkg = join(store, dir, "node_modules", "@remotion", dir.slice("@remotion+".length).split("@")[0]!);
  return join(pkg, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
}
const out: Record<string, { file: string; start: number; seconds: number; css: { w: number; h: number } }> = {};
for (const t of all) {
  const list = t.frames.map((f, i) => `file '${f.file.replace(/\\/g, "/")}'\nduration ${Math.max(0.001, (t.frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join("\n");
  const listFile = join(t.dir, "list.txt");
  writeFileSync(listFile, `${list}\nfile '${t.frames.at(-1)!.file.replace(/\\/g, "/")}'\n`);
  const file = `${beat}.${t.name}.mp4`;
  const r = spawnSync(ffmpeg(), ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,format=yuv420p", "-r", String(FPS), "-fps_mode", "cfr", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-g", String(FPS), "-bf", "0", "-movflags", "+faststart", join(clips, file)], { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${t.name}`);
  out[t.name] = { file: `clips/${file}`, start: Number((t.frames[0]!.t - t0).toFixed(3)), seconds: Number((end - t.frames[0]!.t).toFixed(2)), css: t.css };
  log(`${t.name}: ${t.frames.length} frames → public/clips/${file}`);
}
writeFileSync(join(clips, `${beat}.json`), JSON.stringify({ beat, fps: FPS, dpr: DPR, ok: !failed, seconds: Number((end - t0).toFixed(2)), tracks: out, marks }, null, 2));
rmSync(framesRoot, { recursive: true, force: true });
log(failed ? "TAKE FAILED (footage kept for review)" : "take ok", beat);
process.exit(failed ? 1 : 0);
