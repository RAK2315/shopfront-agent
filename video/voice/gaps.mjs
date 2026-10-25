// Finds a safe cut point before every sentence of each voiceover file: the quietest 80 ms near the sentence's first
// word (Whisper's word times overlap at sentence ends, so they are not safe cut points on their own).
// Writes public/voice/cuts.json: { "<beat>": { "<word index>": seconds } }. Usage (from video/): node voice/gaps.mjs
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const store = join(root, "node_modules", ".pnpm");
const dir = readdirSync(store).find((d) => d.startsWith("@remotion+compositor-"));
const ffmpeg = join(store, dir, "node_modules", "@remotion", dir.slice("@remotion+".length).split("@")[0], process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
const words = JSON.parse(readFileSync(join(root, "public", "voice", "words.json"), "utf8"));
const RATE = 16000;
const out = {};
for (const [beat, ws] of Object.entries(words)) {
  const nn = String(beat).padStart(2, "0");
  const pcm = spawnSync(ffmpeg, ["-v", "error", "-i", join(root, "public", "voice", `beat-${nn}.mp3`), "-ac", "1", "-ar", String(RATE), "-f", "s16le", "-"], { maxBuffer: 1 << 28 }).stdout;
  const s = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2);
  const hop = RATE / 100; // 10 ms
  const env = [];
  for (let i = 0; i + hop <= s.length; i += hop) {
    let e = 0;
    for (let k = i; k < i + hop; k++) e += s[k] * s[k];
    env.push(Math.sqrt(e / hop));
  }
  const quietest = (a, b) => {
    let best = a;
    let bestE = Infinity;
    for (let t = a; t <= b; t += 0.01) {
      const i = Math.round(t * 100);
      const e = (env[i - 4] ?? 0) + (env[i - 2] ?? 0) + (env[i] ?? 0) + (env[i + 2] ?? 0) + (env[i + 4] ?? 0);
      if (e < bestE) {
        bestE = e;
        best = t;
      }
    }
    return Number(best.toFixed(2));
  };
  out[beat] = {};
  for (let i = 1; i < ws.length; i++) {
    if (!/[.?!:]$/.test(ws[i - 1].w)) continue;
    out[beat][i] = quietest(Math.max(ws[i - 1].start + 0.15, ws[i].start - 0.6), ws[i].start + 0.4);
  }
  console.log(`beat ${nn}:`, JSON.stringify(out[beat]));
}
writeFileSync(join(root, "public", "voice", "cuts.json"), JSON.stringify(out));
