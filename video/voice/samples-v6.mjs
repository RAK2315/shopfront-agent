// Sample takes of beats 1-3 for the owner to choose the v6 delivery (D-110). Three variants:
//   A: stability 0.3, one request per sentence    B: stability 0.4, one request per sentence
//   C: stability 0.3, one request per beat (the whole paragraph, for comparison of continuity)
// Every take is slowed/sped to 1.05x (pitch kept) and laid out with natural pauses into one reel per variant:
// out/voice-samples/v6/reel-A.mp3 etc. Raw takes are cached, so a rerun costs no credits. Prints no secrets.
// Usage (from video/): node --env-file=../.env voice/samples-v6.mjs
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { VOICE } from "./lines.mjs";
import { beats } from "./script-v6.mjs";

const root = resolve(import.meta.dirname, "..");
const dir = join(root, "out", "voice-samples", "v6");
mkdirSync(dir, { recursive: true });
const TEMPO = 1.05;
const RATE = 44100;
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY missing; run with node --env-file=../.env");

function bin(name) {
  const store = join(root, "node_modules", ".pnpm");
  const d = readdirSync(store).find((x) => x.startsWith("@remotion+compositor-"));
  const pkg = join(store, d, "node_modules", "@remotion", d.slice("@remotion+".length).split("@")[0]);
  return join(pkg, process.platform === "win32" ? `${name}.exe` : name);
}
function ff(args) {
  const r = spawnSync(bin("ffmpeg"), ["-y", "-v", "error", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
}

async function tts(text, stability, out) {
  if (existsSync(out)) return false;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: VOICE.model, voice_settings: { stability } }),
  });
  if (!r.ok) throw new Error(`tts ${r.status} ${(await r.text()).slice(0, 300)}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  return true;
}

/** mp3 → mono 16-bit PCM at 1.05x, with the leading/trailing silence trimmed by level (Node, no extra filters). */
function pcm(mp3) {
  const wav = mp3.replace(/\.mp3$/, ".wav");
  ff(["-i", mp3, "-filter:a", `atempo=${TEMPO}`, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
  const buf = readFileSync(wav);
  const dataAt = buf.indexOf("data") + 8;
  const s = new Int16Array(buf.buffer.slice(buf.byteOffset + dataAt, buf.byteOffset + buf.length - ((buf.length - dataAt) % 2)));
  const win = Math.round(RATE * 0.01);
  const loud = (i) => {
    let m = 0;
    for (let k = i; k < Math.min(s.length, i + win); k++) m = Math.max(m, Math.abs(s[k]));
    return m > 600; // about -35 dBFS
  };
  let a = 0;
  while (a < s.length && !loud(a)) a += win;
  let b = s.length - win;
  while (b > a && !loud(b)) b -= win;
  // Keep a little air so breaths and word tails are never clipped.
  return s.slice(Math.max(0, a - Math.round(RATE * 0.06)), Math.min(s.length, b + win + Math.round(RATE * 0.12)));
}

function writeMp3(chunks, out) {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Int16Array(total);
  let o = 0;
  for (const c of chunks) {
    all.set(c, o);
    o += c.length;
  }
  const data = Buffer.from(all.buffer);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  const wav = out.replace(/\.mp3$/, ".wav");
  writeFileSync(wav, Buffer.concat([h, data]));
  ff(["-i", wav, "-c:a", "libmp3lame", "-b:a", "160k", out]);
  return total / RATE;
}
const gap = (sec) => new Int16Array(Math.round(sec * RATE));

// Pauses inside a beat vary (0.3-0.8 s); between beats about 1.1 s.
const PAUSES = { 1: [0.65], 3: [0.55, 0.75] };
const sample = beats.filter((b) => b.beat <= 3);
let chars = 0;
for (const [name, stability, whole] of [["A", 0.3, false], ["B", 0.4, false], ["C", 0.3, true]]) {
  const chunks = [gap(0.4)];
  for (const b of sample) {
    if (whole) {
      const text = b.sentences.map((s) => s.say).join(" ");
      const f = join(dir, `${name}-b${b.beat}.mp3`);
      if (await tts(text, stability, f)) chars += text.length;
      chunks.push(pcm(f));
    } else {
      for (const [i, s] of b.sentences.entries()) {
        const f = join(dir, `${name}-b${b.beat}-s${i + 1}.mp3`);
        if (await tts(s.say, stability, f)) chars += s.say.length;
        chunks.push(pcm(f));
        if (i < b.sentences.length - 1) chunks.push(gap(PAUSES[b.beat][i]));
      }
    }
    chunks.push(gap(1.1));
  }
  const secs = writeMp3(chunks, join(dir, `reel-${name}.mp3`));
  console.log(`reel ${name}: stability ${stability}, ${whole ? "whole beat" : "per sentence"}, ${secs.toFixed(1)} s`);
}
console.log(`characters used this run: ${chars}`);
