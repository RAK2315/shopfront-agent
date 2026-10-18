// Review-fix lane checks (REVIEW-1 #3, #7 and REVIEW-2's legend) against the DEPLOYED app. Real calls, no mocks.
//   L1 every /shop starter lands, run through the hosted agent (Groq through the budget guard):
//      search starters: the agent calls search_products and gets at least one in-stock result
//      order starters (no order in a fresh session): the agent answers in words, with no error and no failed tool call
//   L2 "Try to hack the price" on /shop shows the proof-first card (D-091): every attack blocked, checkouts 0, each chip
//      naming the server's reason
//   L3 the /shop timeline carries the "Answered before" legend at desktop width
// Each starter runs in its own fresh buyer session, spaced out for Groq's free per-minute token limit.
// Usage: pnpm --filter web lane-checks -- --base https://shopfront-agent.onrender.com [--only 1,2,3] [--out <dir>]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";
import { SHOP_STARTERS } from "../src/lib/shop-starters.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
const only = new Set((arg("--only", "1,2,3") ?? "").split(","));
const out = resolve(arg("--out", "../../docs/screenshots/fixes-2")!);
mkdirSync(out, { recursive: true });

const t = () => new Date().toISOString().slice(11, 19);
const log = (...a: unknown[]) => console.log(`[${t()}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failed = 0;
const record = (id: string, ok: boolean, detail: unknown) => {
  if (!ok) failed++;
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};
type AgentEvent = { type: string; name?: string; ok?: boolean; result?: unknown; args?: unknown; text?: string; message?: string; source?: string };

async function chat(message: string): Promise<AgentEvent[]> {
  const r = await fetch(`${base}/api/shop/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
  if (!r.ok) return [{ type: "http_error", message: `${r.status} ${await r.text()}` }];
  return (await r.text())
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as AgentEvent);
}

if (only.has("1")) {
  for (const [i, s] of SHOP_STARTERS.entries()) {
    if (i) await sleep(15_000);
    const evs = await chat(s.text);
    const searches = evs.filter((e) => e.type === "tool_result" && e.name === "search_products");
    const best = Math.max(0, ...searches.map((e) => Number((e.result as { total?: number } | undefined)?.total ?? 0)));
    const errors = evs.filter((e) => e.type === "error" || e.type === "http_error" || (e.type === "tool_result" && e.ok === false));
    const text = evs
      .filter((e) => e.type === "text")
      .map((e) => e.text)
      .join(" ")
      .trim();
    const detail = {
      kind: s.kind,
      searchQueries: evs.filter((e) => e.type === "tool_call" && e.name === "search_products").map((e) => e.args),
      bestTotal: best,
      errors: errors.map((e) => e.message ?? e.name),
      sources: [...new Set(evs.filter((e) => e.type === "step").map((e) => e.source))],
      reply: text.slice(0, 160),
    };
    record(`L1 starter "${s.text}"`, s.kind === "search" ? best > 0 && !errors.length : text.length > 0 && !errors.length, detail);
  }
}

if (only.has("2") || only.has("3")) {
  const browser = await chromium.launch();
  try {
    for (const [name, viewport] of [
      ["desktop", { width: 1440, height: 900 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${base}/shop`, { waitUntil: "networkidle" });
      if (only.has("3") && name === "desktop") {
        const legend = page.getByTestId("answered-before-legend");
        const txt = (await legend.isVisible()) ? await legend.innerText() : "";
        record("L3 the /shop timeline shows the 'Answered before' legend (desktop)", /Answered before/.test(txt) && /always live/.test(txt), { text: txt });
      }
      if (only.has("2")) {
        await page.getByTestId("hack").click();
        const card = page.getByTestId("hack-result");
        await card.waitFor({ timeout: 30_000 });
        const txt = await card.innerText();
        await card.scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(out, `hack-protected-${name}.png`) });
        await page.waitForTimeout(2500); // the chips settle red → green
        const chips = await card.getByTestId("hack-chip").evaluateAll((els) => els.map((el) => ({ blocked: el.getAttribute("data-blocked"), title: el.getAttribute("title") ?? "" })));
        const detail = {
          viewport: name,
          heading: txt.split(/\r?\n/)[0],
          blocked: await card.getAttribute("data-blocked"),
          total: await card.getAttribute("data-total"),
          chipsWithReason: chips.filter((c) => c.blocked === "true" && /^Blocked · .{3,}/.test(c.title)).length,
          checkoutsCreated: await page.getByTestId("hack-checkouts").innerText(),
        };
        record(
          `L2 hack demo: every attack blocked with a reason per attack, 0 checkouts (${name})`,
          detail.heading === "Every attack was blocked by the server" && detail.blocked === detail.total && Number(detail.total) >= 12 && detail.chipsWithReason === Number(detail.total) && detail.checkoutsCreated === "0",
          detail,
        );
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

log(failed ? `LANE: ${failed} FAILED` : "LANE: all checks passed");
process.exit(failed ? 1 : 0);
