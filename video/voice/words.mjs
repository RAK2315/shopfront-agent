// Word timings for each voiceover beat (Groq's free Whisper, a dev step, not part of the app), mapped back onto the
// script's own words so captions show the script's spelling ("forty" stays "forty", not "$40").
// Writes public/voice/words.json: { "1": [{ w, start, end }], ... } in seconds from the start of each beat's file.
// Usage (from video/): node --env-file=../.env voice/words.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { lines } from "./lines.mjs";

const root = resolve(import.meta.dirname, "..");
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const out = {};
for (const l of lines) {
  const nn = String(l.beat).padStart(2, "0");
  const form = new FormData();
  form.append("model", "whisper-large-v3");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("file", new Blob([readFileSync(join(root, "public", "voice", `beat-${nn}.mp3`))], { type: "audio/mpeg" }), `beat-${nn}.mp3`);
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer " + process.env.GROQ_API_KEY }, body: form });
  if (!r.ok) throw new Error(`beat ${nn}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const heard = (await r.json()).words ?? [];
  // Align: walk the script's words; each takes the next heard word's time when they match, else interpolates.
  const script = l.caption.split(/\s+/).filter(Boolean);
  const res = [];
  let j = 0;
  for (let i = 0; i < script.length; i++) {
    const want = norm(script[i]);
    let hit = -1;
    for (let k = j; k < Math.min(heard.length, j + 4); k++) {
      const h = norm(heard[k].word);
      if (h === want || (want.length > 3 && (h.startsWith(want.slice(0, 4)) || want.startsWith(h) && h.length > 2))) {
        hit = k;
        break;
      }
    }
    if (hit >= 0) {
      res.push({ w: script[i], start: heard[hit].start, end: heard[hit].end });
      j = hit + 1;
    } else res.push({ w: script[i], start: null, end: null });
  }
  // Fill gaps (numbers spoken as words, hyphenated words) by interpolating between known neighbours.
  const total = Number(heard.at(-1)?.end ?? 0);
  for (let i = 0; i < res.length; i++) {
    if (res[i].start !== null) continue;
    let a = i - 1;
    while (a >= 0 && res[a].start === null) a--;
    let b = i;
    while (b < res.length && res[b].start === null) b++;
    const t0 = a >= 0 ? res[a].end : 0;
    const t1 = b < res.length ? res[b].start : total;
    const n = b - a - 1;
    for (let k = a + 1; k < b; k++) {
      res[k].start = t0 + ((t1 - t0) * (k - a - 1)) / n;
      res[k].end = t0 + ((t1 - t0) * (k - a)) / n;
    }
  }
  out[l.beat] = res.map((x) => ({ w: x.w, start: Number(x.start.toFixed(2)), end: Number(x.end.toFixed(2)) }));
  const misses = res.length - res.filter((x, i) => x.start !== null).length;
  console.log(`beat ${nn}: ${res.length} words, speech ${out[l.beat][0].start}–${out[l.beat].at(-1).end} s`);
}
writeFileSync(join(root, "public", "voice", "words.json"), JSON.stringify(out));
