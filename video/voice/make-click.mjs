// Synthesises the quiet UI click used on every cursor press (public/sfx/click.wav): a 40 ms tick, a short sine
// "tock" plus a little smoothed noise, both decaying fast. Made in code, so no licence question. Usage: node voice/make-click.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rate = 44100;
const n = Math.round(rate * 0.04);
const pcm = new Int16Array(n * 2);
let noise = 0;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
for (let i = 0; i < n; i++) {
  const t = i / rate;
  noise = noise * 0.55 + rnd() * 0.45; // a gentle low-pass on white noise
  const env = Math.exp(-t / 0.006);
  const v = (0.55 * Math.sin(2 * Math.PI * 1900 * t) + 0.35 * Math.sin(2 * Math.PI * 3100 * t) + 0.5 * noise) * env;
  const s = Math.max(-1, Math.min(1, v * 0.8)) * 32767;
  pcm[i * 2] = s;
  pcm[i * 2 + 1] = s;
}
const data = Buffer.from(pcm.buffer);
const h = Buffer.alloc(44);
h.write("RIFF", 0);
h.writeUInt32LE(36 + data.length, 4);
h.write("WAVEfmt ", 8);
h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20);
h.writeUInt16LE(2, 22);
h.writeUInt32LE(rate, 24);
h.writeUInt32LE(rate * 4, 28);
h.writeUInt16LE(4, 32);
h.writeUInt16LE(16, 34);
h.write("data", 36);
h.writeUInt32LE(data.length, 40);
const out = join(resolve(import.meta.dirname, ".."), "public", "sfx");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "click.wav"), Buffer.concat([h, data]));
console.log("wrote public/sfx/click.wav");
