// The v6 voiceover, one file per sentence (D-110): ElevenLabs Chris on eleven_v3 at stability 0.3 (the owner's pick,
// sample A), 1.05x with pitch kept, silence trimmed, every sentence levelled to the same loudness. Each take is then
// transcribed with Groq Whisper (free, dev only) to check every word and to get word times for captions.
// Raw takes and transcripts are cached in out/voice-raw-v6/, so a rerun costs nothing; beats 1-3 reuse the approved
// sample takes. Retake sentences with --retake b4s3 b7s2, or every sentence that ends abruptly with --retake-loud.
// eleven_v3 often stops mid-sound at the end of a take (heard as a click), so each request ends with the silent cue
// "[short pause]" and the take decays naturally; a 10 ms fade-in and 40 ms fade-out are a safety net, and a sentence
// whose last 30 ms is still louder than -40 dBFS, or that stops mid-sound, is flagged. Stray pops before or after the
// sentence are cut off by speechCut (audio.mjs).
// Usage (from video/): node --env-file=../.env voice/make-vo-v6.mjs [--retake bNsM ...] [--retake-loud]
// Writes public/voice/v6/bNN-sM.mp3 and public/voice/v6/voice.json. Prints no secrets.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ff, RATE, root, speechCut, speechPcm, writeWav } from "./audio.mjs";
import { beats } from "./script-v6.mjs";

export const V6 = { id: "iP95p4xoKVk53GoZ742B", name: "Chris", model: "eleven_v3", stability: 0.3, tempo: 1.05 };
const rawDir = join(root, "out", "voice-raw-v6");
const sampleDir = join(root, "out", "voice-samples", "v6");
const outDir = join(root, "public", "voice", "v6");
mkdirSync(rawDir, { recursive: true });
mkdirSync(outDir, { recursive: true });
const i = process.argv.indexOf("--retake");
const retake = new Set(i < 0 ? [] : process.argv.slice(i + 1).filter((a) => !a.startsWith("--")));
const retakeLoud = process.argv.includes("--retake-loud");
const END_LIMIT = -40; // dBFS, peak of the last 30 ms
/** Peak of the last 30 ms, dBFS. */
function endPeak(pcm) {
  let m = 0;
  for (let k = Math.max(0, pcm.length - Math.round(RATE * 0.03)); k < pcm.length; k++) m = Math.max(m, Math.abs(pcm[k]));
  return 20 * Math.log10(m / 32768 + 1e-9);
}
/** Raised-cosine fades: 10 ms in, 40 ms out (120 ms when the take runs into its end on a breath or tail). */
function fades(pcm, outSec = 0.04) {
  const a = Math.round(RATE * 0.01);
  const z = Math.round(RATE * outSec);
  const out = Int16Array.from(pcm);
  for (let k = 0; k < a && k < out.length; k++) out[k] = Math.round(out[k] * (0.5 - 0.5 * Math.cos((Math.PI * k) / a)));
  for (let k = 0; k < z && k < out.length; k++) {
    const j = out.length - 1 - k;
    out[j] = Math.round(out[j] * (0.5 - 0.5 * Math.cos((Math.PI * k) / z)));
  }
  return out;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tts(text, out) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${V6.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: V6.model, voice_settings: { stability: V6.stability } }),
  });
  if (!r.ok) throw new Error(`tts ${r.status} ${(await r.text()).slice(0, 300)}`);
  writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

async function transcribe(mp3) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const form = new FormData();
    form.append("model", "whisper-large-v3");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("file", new Blob([readFileSync(mp3)], { type: "audio/mpeg" }), "s.mp3");
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer " + process.env.GROQ_API_KEY }, body: form });
    if (r.status === 429) {
      await sleep(15000);
      continue;
    }
    if (!r.ok) throw new Error(`stt ${r.status} ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return { text: j.text.trim(), words: (j.words ?? []).map((w) => ({ w: w.word.trim(), start: w.start, end: w.end })) };
  }
  throw new Error("stt: rate limited");
}

/** Same loudness for every sentence: speech RMS to -19 dBFS, peaks kept under -1.5 dBFS. */
function level(s) {
  const win = Math.round(RATE * 0.02);
  let sum = 0;
  let n = 0;
  let peak = 1;
  for (let k = 0; k + win <= s.length; k += win) {
    let e = 0;
    for (let j = k; j < k + win; j++) e += (s[j] / 32768) ** 2;
    if (10 * Math.log10(e / win + 1e-12) > -40) {
      sum += e;
      n += win;
    }
  }
  for (const x of s) peak = Math.max(peak, Math.abs(x));
  const rms = 10 * Math.log10(sum / Math.max(1, n) + 1e-12);
  const gain = Math.min(10 ** ((-19 - rms) / 20), (32768 * 10 ** (-1.5 / 20)) / peak);
  return Int16Array.from(s, (x) => Math.max(-32768, Math.min(32767, Math.round(x * gain))));
}

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
const out = [];
let chars = 0;
let problems = 0;
for (const b of beats) {
  const sentences = [];
  for (const [k, s] of b.sentences.entries()) {
    const id = `b${b.beat}s${k + 1}`;
    const nn = `b${String(b.beat).padStart(2, "0")}-s${k + 1}`;
    const raw = join(rawDir, `${nn}.mp3`);
    const sample = join(sampleDir, `A-b${b.beat}-s${k + 1}.mp3`);
    const finalWav = join(rawDir, `${nn}.final.wav`);
    if (retakeLoud && existsSync(finalWav)) {
      const c = speechCut(raw, V6.tempo);
      if (c.truncated || endPeak(level(c.pcm)) > END_LIMIT) retake.add(id);
    }
    if (retake.has(id) || !existsSync(raw)) {
      if (!retake.has(id) && existsSync(sample)) copyFileSync(sample, raw);
      else {
        const text = `${s.say} [short pause]`;
        await tts(text, raw);
        chars += text.length;
        console.log(`${id}: generated`);
      }
    }
    const cut = speechCut(raw, V6.tempo);
    const trimmed = level(cut.pcm);
    const loudEnd = !cut.truncated && endPeak(trimmed) > END_LIMIT;
    const pcm = fades(trimmed, cut.truncated ? 0.12 : 0.04);
    const wav = join(rawDir, `${nn}.final.wav`);
    writeWav(pcm, wav);
    const file = join(outDir, `${nn}.mp3`);
    ff(["-i", wav, "-c:a", "libmp3lame", "-b:a", "192k", file]);
    const stt = join(rawDir, `${nn}.stt.json`);
    if (retake.has(id) || !existsSync(stt)) {
      writeFileSync(stt, JSON.stringify(await transcribe(file)));
      await sleep(3200); // Groq's free tier: 20 requests a minute
    }
    const heard = JSON.parse(readFileSync(stt, "utf8"));
    const got = new Set(norm(heard.text));
    const missing = norm(s.caption).filter((w) => !got.has(w));
    if (missing.length || loudEnd) problems++;
    console.log(`${id}: ${(pcm.length / RATE).toFixed(2)} s  ${missing.length ? "CHECK missing " + missing.join(",") + " | heard: " + heard.text : "ok"}${cut.truncated ? "  (ends on a breath: 120 ms fade)" : loudEnd ? `  LOUD END ${endPeak(trimmed).toFixed(0)} dBFS` : ""}`);
    sentences.push({ file: `voice/v6/${nn}.mp3`, seconds: Number((pcm.length / RATE).toFixed(3)), caption: s.caption, words: heard.words });
  }
  out.push({ beat: b.beat, sentences });
}
writeFileSync(join(outDir, "voice.json"), JSON.stringify({ voice: V6, beats: out }, null, 1));
const total = out.flatMap((b) => b.sentences).reduce((t, s) => t + s.seconds, 0);
console.log(`speech ${total.toFixed(1)} s in ${out.flatMap((b) => b.sentences).length} sentences; characters used this run: ${chars}; ${problems} to check`);
