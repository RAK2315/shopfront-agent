// Captures real footage of the deployed app for the video (PLAN Phase 8, D-058). CDP screencast frames (JPEG 92),
// not Playwright's recordVideo, whose bitrate blurs 1080p text. Frames carry timestamps and are assembled into a
// constant-30-fps mp4 with Remotion's bundled ffmpeg, so the clip plays in real time.
// Writes public/clips/<beat>.mp4 and <beat>.json (offsets of key moments + boxes for zooms). Never writes URLs.
// Usage: node capture/capture.mts [--base https://shopfront-agent.onrender.com] [--beat split-shop]
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const base = opt("--base", "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const beat = opt("--beat", "split-shop");
const root = resolve(import.meta.dirname, "..");
const clips = join(root, "public", "clips");
const framesDir = join(root, ".frames", beat);
const FPS = 30;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Frame = { file: string; t: number };
async function screencast(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const frames: Frame[] = [];
  cdp.on("Page.screencastFrame", async (f) => {
    const file = join(framesDir, `${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: f.metadata.timestamp ?? Date.now() / 1000 });
    await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  return {
    async stop() {
      await cdp.send("Page.stopScreencast");
      return frames;
    },
  };
}

/** Remotion's bundled ffmpeg (no separate install), called directly: no shell, so spaces and commas in args are safe. */
function ffmpeg() {
  const store = join(root, "node_modules", ".pnpm");
  const dir = readdirSync(store).find((d) => d.startsWith("@remotion+compositor-"));
  if (!dir) throw new Error("Remotion compositor not installed; run pnpm install --ignore-workspace in video/");
  const pkg = join(store, dir, "node_modules", "@remotion", dir.slice("@remotion+".length).split("@")[0]!);
  return join(pkg, process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
}

/** Frames arrive only when pixels change; each one is held until the next, then resampled to a constant 30 fps. */
function toMp4(frames: Frame[], end: number, out: string) {
  const list = frames
    .map((f, i) => `file '${f.file.replace(/\\/g, "/")}'\nduration ${Math.max(0.001, (frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`)
    .join("\n");
  const listFile = join(framesDir, "list.txt");
  writeFileSync(listFile, `${list}\nfile '${frames.at(-1)!.file.replace(/\\/g, "/")}'\n`);
  const r = spawnSync(ffmpeg(), ["-y", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-r", String(FPS), "-fps_mode", "cfr", "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-g", String(FPS), "-bf", "0", "-movflags", "+faststart", out], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("ffmpeg failed");
}

const beats: Record<string, (page: Page, mark: (k: string, extra?: object) => void) => Promise<void>> = {
  // Beat 5: the split screen. The shopper's agent buys a blue mug; the live wire shows every call.
  async "split-shop"(page, mark) {
    await page.goto(`${base}/capture`, { waitUntil: "load", timeout: 180_000 });
    const shop = page.frameLocator('iframe[src="/shop"]');
    const wire = page.frameLocator('iframe[src^="/live"]');
    await wire.getByText("Connected").first().waitFor({ timeout: 60_000 });
    await shop.getByRole("button", { name: /blue mug under \$40/ }).waitFor({ timeout: 60_000 });
    await sleep(1500);
    mark("prompt");
    await shop.getByRole("button", { name: /blue mug under \$40/ }).click();
    const card = shop.getByTestId("checkout-card");
    await card.waitFor({ timeout: 120_000 });
    const frame = page.frameLocator('iframe[src="/shop"]').owner();
    const fb = (await frame.boundingBox())!;
    const cb = (await card.boundingBox())!; // relative to the iframe's viewport
    mark("checkoutCard", { box: { x: fb.x + cb.x, y: fb.y + cb.y, width: cb.width, height: cb.height } });
    await sleep(6000);
  },
};

mkdirSync(clips, { recursive: true });
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
const run = beats[beat];
if (!run) throw new Error(`unknown beat ${beat}; known: ${Object.keys(beats).join(", ")}`);
await fetch(`${base}/api/health`).catch(() => {}); // wake the free-tier service before the take

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const cast = await screencast(page);
// CDP frame timestamps are seconds since the epoch, the same clock as Date.now(), so marks and frames line up.
const marks: Record<string, { at: number }> = {};
await run(page, (k, extra = {}) => (marks[k] = { at: Date.now() / 1000, ...extra }));
const frames = await cast.stop();
const end = Date.now() / 1000;
await browser.close();
const first = frames[0]!.t;
if (Math.abs(first - end) > 600) throw new Error("screencast timestamps are not epoch seconds; cannot align marks");
for (const v of Object.values(marks)) v.at = Number((v.at - first).toFixed(3));
toMp4(frames, end, join(clips, `${beat}.mp4`));
writeFileSync(join(clips, `${beat}.json`), JSON.stringify({ beat, fps: FPS, seconds: Number((end - first).toFixed(2)), marks }, null, 2));
rmSync(framesDir, { recursive: true, force: true });
console.log(`${beat}: ${frames.length} frames → public/clips/${beat}.mp4`, marks);
