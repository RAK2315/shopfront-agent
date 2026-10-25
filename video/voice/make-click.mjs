// Builds the cursor's click (public/sfx/click.wav) from a real recorded mouse press and release: Kenney's "UI Audio"
// pack (CC0, kenney.nl/assets/ui-audio), files Audio/mouseclick1.ogg and Audio/mouserelease1.ogg. The release follows
// 85 ms later, 5 dB quieter, like a quick tap (D-110 replaced the synthesised tick of v1).
// Usage (from video/): node voice/make-click.mjs <path to the unzipped pack>, e.g. out/sfx-kenney/pack
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { ff, RATE, readWav, root, writeWav } from "./audio.mjs";

const pack = process.argv[2];
if (!pack) throw new Error("usage: make-click.mjs <unzipped Kenney UI Audio pack>");
const tmp = join(root, "out", "sfx-tmp");
mkdirSync(tmp, { recursive: true });
const load = (name) => {
  const wav = join(tmp, `${name}.wav`);
  ff(["-i", join(pack, "Audio", `${name}.ogg`), "-ac", "1", "-ar", String(RATE), "-c:a", "pcm_s16le", wav]);
  return readWav(wav);
};
const press = load("mouseclick1");
const release = load("mouserelease1");
const at = Math.round(RATE * 0.085);
const out = new Int16Array(at + release.length);
const g = 10 ** (-5 / 20);
for (let i = 0; i < press.length; i++) out[i] += press[i];
for (let i = 0; i < release.length; i++) out[at + i] = Math.max(-32768, Math.min(32767, out[at + i] + Math.round(release[i] * g)));
const dir = join(root, "public", "sfx");
mkdirSync(dir, { recursive: true });
writeWav(out, join(dir, "click.wav"));
console.log(`wrote public/sfx/click.wav (${((out.length / RATE) * 1000).toFixed(0)} ms)`);
