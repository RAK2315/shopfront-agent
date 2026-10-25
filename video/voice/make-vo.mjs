// Generates the voiceover per beat with ElevenLabs, then speeds each take to 1.1x (pitch kept) with Remotion's ffmpeg.
// Raw takes are cached in out/voice-raw/ so a rerun costs no credits; pass beat numbers to retake only those.
// Usage (from video/): node --env-file=../.env voice/make-vo.mjs [--retake 3 7]
// Writes public/voice/beat-NN.mp3 and public/voice/voice.json (durations, captions). Prints no secrets.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { VOICE, lines } from "./lines.mjs";

const root = resolve(import.meta.dirname, "..");
const rawDir = join(root, "out", "voice-raw");
const outDir = join(root, "public", "voice");
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
const retake = new Set(process.argv.slice(process.argv.indexOf("--retake") + 1).map(Number).filter(Boolean));
if (!process.argv.includes("--retake")) retake.clear();

function bin(name) {
  const store = join(root, "node_modules", ".pnpm");
  const dir = readdirSync(store).find((d) => d.startsWith("@remotion+compositor-"));
  const pkg = join(store, dir, "node_modules", "@remotion", dir.slice("@remotion+".length).split("@")[0]);
  return join(pkg, process.platform === "win32" ? `${name}.exe` : name);
}
const duration = (f) =>
  Number(spawnSync(bin("ffprobe"), ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).stdout.toString().trim());

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY missing; run with node --env-file=../.env");

const out = [];
for (const l of lines) {
  const nn = String(l.beat).padStart(2, "0");
  const raw = join(rawDir, `beat-${nn}.mp3`);
  if (!existsSync(raw) || retake.has(l.beat)) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: l.say, model_id: VOICE.model, voice_settings: { stability: VOICE.stability } }),
    });
    if (!r.ok) {
      console.log(`beat ${nn}: tts ${r.status}`, (await r.text()).slice(0, 300));
      process.exit(1);
    }
    writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
    console.log(`beat ${nn}: generated (${l.say.length} chars)`);
  }
  const fin = join(outDir, `beat-${nn}.mp3`);
  const ff = spawnSync(bin("ffmpeg"), ["-y", "-v", "error", "-i", raw, "-filter:a", `atempo=${VOICE.tempo}`, "-c:a", "libmp3lame", "-b:a", "160k", fin]);
  if (ff.status !== 0) throw new Error(`ffmpeg failed on beat ${nn}: ${ff.stderr}`);
  out.push({ beat: l.beat, file: `voice/beat-${nn}.mp3`, seconds: Number(duration(fin).toFixed(3)), caption: l.caption });
}
writeFileSync(join(outDir, "voice.json"), JSON.stringify({ voice: VOICE, beats: out }, null, 2));
const total = out.reduce((s, b) => s + b.seconds, 0);
for (const b of out) console.log(`beat ${String(b.beat).padStart(2, "0")}: ${b.seconds.toFixed(2)} s`);
console.log(`total speech ${total.toFixed(1)} s`);
