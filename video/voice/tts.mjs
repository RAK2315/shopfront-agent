// ElevenLabs text-to-speech for the demo voiceover. Reads ELEVENLABS_API_KEY from the repo's .env; prints no secrets.
// Usage: node --env-file=.env video/voice/tts.mjs <voiceId> <out.mp3> "<text>" [stability] [style]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const [voiceId, out, text, stability = "0.42", style = "0.35"] = process.argv.slice(2);
const key = process.env.ELEVENLABS_API_KEY;
if (!key || !voiceId || !out || !text) throw new Error("usage: tts.mjs <voiceId> <out.mp3> <text> [stability] [style]");
const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
  body: JSON.stringify({
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: { stability: Number(stability), similarity_boost: 0.8, style: Number(style), use_speaker_boost: true },
  }),
});
if (!r.ok) {
  console.log("tts", r.status, (await r.text()).slice(0, 300));
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log("wrote", out, r.headers.get("character-cost") ?? r.headers.get("x-character-count") ?? "");
