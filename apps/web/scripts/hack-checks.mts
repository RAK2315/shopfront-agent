// Hack card + attack suite (walkthrough #5, Phase 13 lite, D-091) on the DEPLOYED app:
//   H1  the API runs at least 12 real attacks (price, quantity, fake ids, stolen tokens, forged webhook, size);
//       every one is blocked; the price matches the database; zero checkouts exist in the DB for the attacker
//   H2  the UI: the hack button shows the three proof numbers and one chip per attack, all blocked; the agent
//       prompt-injection that follows creates nothing at $0
//   H3  screenshots at desktop, 1920 and mobile; no sideways scroll
// Usage: pnpm --filter web hack-checks -- --base https://shopfront-agent.onrender.com
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/hack")!);
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();

try {
  const started = new Date();
  const r = await fetch(`${base}/api/shop/hack`, { method: "POST" });
  const j = (await r.json()) as { product: string; serverPrice: string; attempts: Array<{ id: string; label: string; family: string; blocked: boolean; answer: string }>; checkoutsCreated: number };
  const dbPrice = (await db.query("select v.price_cents from variants v join products p on p.id=v.product_id join sellers s on s.id=p.seller_id where p.status='approved' and v.active and v.stock>0 and not s.test_only order by v.price_cents limit 1")).rows[0]?.price_cents as number;
  const created = Number((await db.query("select count(*)::int n from checkouts where mcp_client_name='price-hacker-demo' and created_at >= $1", [started])).rows[0].n);
  const families = [...new Set(j.attempts.map((a) => a.family))];
  record(
    "H1 every real attack blocked; price from the DB; 0 checkouts in the DB",
    r.ok && j.attempts.length >= 12 && j.attempts.every((a) => a.blocked) && Number(j.serverPrice) * 100 === dbPrice && created === 0 && j.checkoutsCreated === 0 && families.length >= 5,
    { attacks: j.attempts.length, blocked: j.attempts.filter((a) => a.blocked).length, families, serverPrice: j.serverPrice, dbPriceCents: dbPrice, checkoutsInDb: created, answers: j.attempts.map((a) => `${a.id}: ${a.answer.slice(0, 70)}`) },
  );

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${base}/shop`, { waitUntil: "load", timeout: 180_000 });
  const t0 = new Date();
  await page.getByTestId("hack").click();
  const card = page.getByTestId("hack-result");
  await card.waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  const blocked = Number(await card.getAttribute("data-blocked"));
  const total = Number(await card.getAttribute("data-total"));
  const chips = await page.getByTestId("hack-chip").count();
  const proof = await page.getByTestId("hack-proof").innerText();
  // The agent then gets the same trick as a prompt; wait for it to finish, then count $0 checkouts.
  await page.waitForFunction(() => !document.querySelector("[role=status]")?.textContent?.includes("working"), null, { timeout: 120_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const zero = Number((await db.query("select count(*)::int n from checkouts where created_at >= $1 and total_cents = 0", [t0])).rows[0].n);
  const overflow: Record<string, number> = {};
  for (const s of [{ tag: "desktop", w: 1440, h: 900 }, { tag: "1920", w: 1920, h: 1080 }, { tag: "mobile", w: 390, h: 844 }]) {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.waitForTimeout(700);
    overflow[s.tag] = await page.evaluate(() => {
      const chat = document.querySelector("[data-testid=chat-scroller]");
      return Math.max(document.documentElement.scrollWidth - window.innerWidth, chat ? chat.scrollWidth - chat.clientWidth : 0);
    });
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: join(out, `hack-card-${s.tag}.png`) });
  }
  record("H2 UI: proof numbers, one chip per attack, all blocked; the prompt version creates nothing at $0", blocked === total && total >= 12 && chips === total && /Attacks blocked/.test(proof) && zero === 0, { blocked, total, chips, proof: proof.replace(/\n/g, " "), zeroTotalCheckouts: zero });
  record("H3 no sideways scroll", Object.values(overflow).every((o) => o <= 0), { overflow });
  await browser.close();
} catch (err) {
  record("run", false, err instanceof Error ? err.message.split("\n")[0] : String(err));
} finally {
  writeFileSync(join(out, `results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify(results, null, 2));
  await db.end();
  const failed = results.filter((r) => !r.ok);
  log(`${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}
