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

/** A take → mono PCM at `tempo` (pitch kept), with leading and trailing silence trimmed by level. A little air is kept
 * (60 ms before, 120 ms after) so breaths and word tails are never clipped. */
export function speechPcm(mp3, tempo) {
  const wav = mp3.replace(/\.mp3$/, ".wav");
  ff(["-i", mp3, "-filter:a", `atempo=${tempo}`, "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
  const s = readWav(wav);
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
  return s.slice(Math.max(0, a - Math.round(RATE * 0.06)), Math.min(s.length, b + win + Math.round(RATE * 0.12)));
}
