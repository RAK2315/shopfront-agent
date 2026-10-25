// The music bed's own loudness over time (public/music/<name>.env.json), so the mix can hold the bed at a steady level
// under the voice even where the track swells (it rises about 9 dB around 52 s). RMS per 0.25 s, smoothed over 3 s in
// the power domain so the gain moves slowly and never pumps.
// Usage (from video/): node voice/music-env.mjs public/music/budding-of-consciousness.mp3
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ff, RATE, readWav, root } from "./audio.mjs";

const src = process.argv[2];
if (!src) throw new Error("usage: music-env.mjs <music file>");
const wav = join(root, "out", "music-env.wav");
ff(["-i", src, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
const s = readWav(wav);
const STEP = 0.25;
const w = Math.round(RATE * STEP);
const power = [];
for (let i = 0; i < s.length; i += w) {
  let e = 0;
  let n = 0;
  for (let k = i; k < Math.min(s.length, i + w); k++) {
    e += (s[k] / 32768) ** 2;
    n++;
  }
  power.push(e / Math.max(1, n));
}
const half = Math.round(1.5 / STEP);
const db = power.map((_, i) => {
  let e = 0;
  let n = 0;
  for (let k = Math.max(0, i - half); k <= Math.min(power.length - 1, i + half); k++) {
    e += power[k];
    n++;
  }
  return Number((10 * Math.log10(e / n + 1e-12)).toFixed(1));
});
const out = src.replace(/\.[a-z0-9]+$/, ".env.json");
writeFileSync(out, JSON.stringify({ step: STEP, db }));
console.log(`wrote ${out}: ${db.length} points, ${Math.min(...db)} to ${Math.max(...db)} dBFS`);
