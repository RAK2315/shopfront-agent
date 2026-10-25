// Transcribes each voiceover take with Groq Whisper (free tier; a dev check, not part of the app) and prints it next to the script line, so a
// mispronounced or invented word shows up without listening. Usage (from video/): node --env-file=../.env voice/check-vo.mjs [beats...]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { lines } from "./lines.mjs";

const root = resolve(import.meta.dirname, "..");
const only = new Set(process.argv.slice(2).map(Number));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().split(" ");
for (const l of lines) {
  if (only.size && !only.has(l.beat)) continue;
  const nn = String(l.beat).padStart(2, "0");
  const form = new FormData();
  form.append("model", "whisper-large-v3");
  form.append("file", new Blob([readFileSync(join(root, "public", "voice", `beat-${nn}.mp3`))], { type: "audio/mpeg" }), `beat-${nn}.mp3`);
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer " + process.env.GROQ_API_KEY }, body: form });
  if (!r.ok) {
    console.log(`beat ${nn}: stt ${r.status}`, (await r.text()).slice(0, 300));
    process.exit(1);
  }
  const heard = (await r.json()).text;
  const want = norm(l.caption);
  const got = new Set(norm(heard));
  const missing = want.filter((w) => !got.has(w));
  console.log(`beat ${nn}: ${missing.length ? "CHECK missing " + missing.join(",") : "ok"}\n  heard: ${heard}`);
}
