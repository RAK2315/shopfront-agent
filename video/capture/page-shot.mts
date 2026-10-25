// A full-page screenshot of the real /gauntlet page showing the stored finished run, for beat 7's smooth scroll
// (D-110: a scroll drawn over a screenshot of the real results, presented as such, instead of the choppy recorded
// scroll). Also writes where each family heading, attack row and counter sits (CSS px of the full page), so the edit
// can scroll to and highlight them. Read-only: it starts no new run.
// Usage (from video/): node capture/page-shot.mts [--base https://...]
// Writes public/clips/gauntlet-page.png and public/clips/gauntlet-page.json.
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1]! : "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const DPR = 1.5;
const VIEW = { width: 1440, height: 810 };
const clips = join(resolve(import.meta.dirname, ".."), "public", "clips");

await fetch(`${base}/api/health`).catch(() => {});
// Headed, like capture.mts: the board doesn't render in headless Chromium here.
const browser = await chromium.launch({ headless: false, channel: "chromium", args: ["--force-device-scale-factor=" + DPR] });
const page = await (await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR })).newPage();
await page.goto(`${base}/gauntlet`, { waitUntil: "load", timeout: 180_000 });
const board = page.getByTestId("gauntlet-board");
await board.waitFor({ timeout: 60_000 });
await page.waitForFunction(() => /^\s*\d+\/\d+/.test(document.querySelector("[data-testid=g-blocked]")?.textContent ?? ""), null, { timeout: 60_000 });
await page.waitForTimeout(2500); // images and fonts settle
const layout = await page.evaluate(() => {
  const box = (el: Element | null) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) };
  };
  return {
    pageWidth: document.documentElement.clientWidth,
    pageHeight: document.documentElement.scrollHeight,
    harmed: { text: document.querySelector("[data-testid=g-harmed]")?.textContent?.trim(), box: box(document.querySelector("[data-testid=g-harmed]")) },
    blocked: { text: document.querySelector("[data-testid=g-blocked]")?.textContent?.trim(), box: box(document.querySelector("[data-testid=g-blocked]")) },
    score: box(document.querySelector("section[aria-label=Score]")),
    status: document.querySelector("[role=status]")?.textContent?.trim(),
    families: [...document.querySelectorAll("h2[id^=fam-]")].map((h) => ({ id: h.id, label: h.textContent?.trim(), box: box(h.closest("section")) })),
    rows: [...document.querySelectorAll("[data-testid=g-row]")].map((r) => ({ attack: r.getAttribute("data-attack"), image: !!r.querySelector("img"), box: box(r) })),
  };
});
await page.screenshot({ path: join(clips, "gauntlet-page.png"), fullPage: true });
await browser.close();
writeFileSync(join(clips, "gauntlet-page.json"), JSON.stringify({ base: "deployed /gauntlet", dpr: DPR, css: { w: layout.pageWidth, h: layout.pageHeight }, takenAt: new Date().toISOString(), ...layout }, null, 1));
console.log(`gauntlet-page.png: ${layout.pageWidth}x${layout.pageHeight} css at ${DPR}x; ${layout.rows.length} rows; ${layout.harmed.text} / ${layout.blocked.text}; ${layout.status}`);
