// Small audio helpers for the voice tools, built on Remotion's bundled ffmpeg (which lacks several filters, so level
// work happens here in Node on 16-bit PCM).
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");
export const RATE = 44100;

export function bin(name) {
  const store = join(root, "node_modules", ".pnpm");
  const d = readdirSync(store).find((x) => x.startsWith("@remotion+compositor-"));
  const pkg = join(store, d, "node_modules", "@remotion", d.slice("@remotion+".length).split("@")[0]);
  return join(pkg, process.platform === "win32" ? `${name}.exe` : name);
}
export function ff(args) {
  const r = spawnSync(bin("ffmpeg"), ["-y", "-v", "error", ...args]);
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
}

/** Reads a mono 16-bit WAV's samples. */
export function readWav(wav) {
  const buf = readFileSync(wav);
  const at = buf.indexOf("data") + 8;
  const n = Math.floor((buf.length - at) / 2);
  return new Int16Array(buf.buffer.slice(buf.byteOffset + at, buf.byteOffset + at + n * 2));
}

/** Writes mono 16-bit samples as a WAV. */
export function writeWav(samples, wav) {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
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
  writeFileSync(wav, Buffer.concat([h, data]));
}

/** A take → mono PCM at `tempo` (pitch kept), cut to the speech. The take is split into sounding segments (20 ms
 * windows above -40 dBFS; gaps under 60 ms are bridged). eleven_v3 often adds a stray pop after the sentence, sometimes
 * a second or more later, or a blip before it: an isolated segment of 100 ms or less at either end is dropped. Air is
 * kept (60 ms before, 150 ms after) so breaths and word tails are never clipped. `truncated` is true when the speech
 * runs right into the end of the take (it stopped mid-sound): such a take should be retaken. */
export function speechCut(mp3, tempo) {
  const wav = mp3.replace(/\.mp3$/, ".wav");
  ff(["-i", mp3, "-filter:a", `atempo=${tempo}`, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
  const s = readWav(wav);
  const W = Math.round(RATE * 0.02);
  const n = Math.ceil(s.length / W);
  const on = Array.from({ length: n }, (_, i) => {
    let m = 0;
    for (let k = i * W; k < Math.min(s.length, (i + 1) * W); k++) m = Math.max(m, Math.abs(s[k]));
    return m > 328; // -40 dBFS
  });
  const segs = [];
  for (let i = 0; i < n; i++) {
    if (!on[i]) continue;
    const last = segs.at(-1);
    if (last && i - last.b <= 3) last.b = i; // bridge gaps under 60 ms
    else segs.push({ a: i, b: i });
  }
  const short = (g) => (g.b - g.a + 1) * 20 <= 100;
  while (segs.length > 1 && short(segs.at(-1))) segs.pop();
  while (segs.length > 1 && short(segs[0])) segs.shift();
  if (!segs.length) throw new Error(`${mp3}: no speech found`);
  const a = segs[0].a * W;
  const b = Math.min(s.length, (segs.at(-1).b + 1) * W);
  const truncated = s.length - b < RATE * 0.04;
  return { pcm: s.slice(Math.max(0, a - Math.round(RATE * 0.06)), Math.min(s.length, b + Math.round(RATE * 0.15))), truncated };
}
export const speechPcm = (mp3, tempo) => speechCut(mp3, tempo).pcm;
