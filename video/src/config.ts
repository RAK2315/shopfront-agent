import voice from "../public/voice/voice.json";
import cuts from "../public/voice/cuts.json";
import words from "../public/voice/words.json";
import { FPS } from "./theme";
import type { Word } from "./lib/clip";

// The cut, one place (launch-motion §6: numbers and copy in one config file). Beat lengths from DEMO-SCRIPT v5.1 as
// re-timed in D-108: 10 + 6 + 18 + 24 + 18 + 17 + 21 + 36 + 12 + 8 = 170 s = 2:50.
// `vo`: when the beat's voice starts. `parts`: optional sentence placement, [first word of the sentence, beat
// seconds, nth occurrence]: each sentence of the voice file plays at its own time so it lands on its footage.
type Part = readonly [string, number, number?];
type Beat = { n: number; id: string; sec: number; vo: number; parts?: readonly Part[]; capTop?: ReadonlyArray<readonly [number, number]> };
export const BEATS: readonly Beat[] = [
  { n: 1, id: "hook", sec: 10, vo: 0.3 },
  { n: 2, id: "promise", sec: 6, vo: 0.35 },
  { n: 3, id: "listing", sec: 18, vo: 0.4, parts: [["She", 0.4], ["Gemini", 2.6], ["The", 6.6, 2], ["One", 13.1]] },
  { n: 4, id: "agent-buys", sec: 24, vo: 0.35, parts: [["A", 0.35], ["The", 4.5, 1], ["The", 8.9, 2], ["The", 11.3, 3], ["The", 15.0, 4]], capTop: [[0, 4.45]] },
  { n: 5, id: "phone", sec: 18, vo: 0.5, parts: [["She", 0.5], ["The", 2.5], ["She", 4.3, 2], ["A", 8.4, 2], ["Small", 12.6]] },
  { n: 6, id: "paid-direct", sec: 17, vo: 0.4, parts: [["Sellers", 0.4], ["Every", 7.2], ["here,", 10.1], ["So", 13.4]] },
  { n: 7, id: "gauntlet", sec: 21, vo: 0.5 },
  { n: 8, id: "dashboard", sec: 36, vo: 0.5 },
  { n: 9, id: "trust", sec: 12, vo: 0.5 },
  { n: 10, id: "close", sec: 8, vo: 0.6 },
];

export const TOTAL_SEC = BEATS.reduce((s, b) => s + b.sec, 0);
export const startOf = (n: number) => BEATS.filter((b) => b.n < n).reduce((s, b) => s + b.sec, 0);
export const beat = (n: number) => BEATS.find((b) => b.n === n)!;
export const voiceFile = (n: number) => voice.beats.find((b) => b.beat === n)!;
export const frames = (sec: number) => Math.round(sec * FPS);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9$-]/g, "");

/** The beat's voice as placed sentences: each part's audio trim (file seconds) and where it plays (beat seconds),
 * plus every word with its beat time. */
export function voTimeline(n: number) {
  const b = beat(n);
  const ws = (words as Record<string, Word[]>)[String(n)]!;
  const fileEnd = voiceFile(n).seconds;
  const starts = (b.parts ?? [[ws[0]!.w, b.vo] as Part]).map(([word, at, nth = 1]) => {
    let seen = 0;
    const i = ws.findIndex((w) => norm(w.w) === norm(word) && ++seen === nth);
    if (i < 0) throw new Error(`beat ${n}: no word "${word}" #${nth} for a part`);
    return { i, at };
  });
  // Cut where the audio is quiet before each sentence (voice/gaps.mjs), not at Whisper's overlapping word times.
  const cutAt = (i: number) => (cuts as Record<string, Record<string, number>>)[String(n)]?.[String(i)] ?? Math.max(0, ws[i]!.start - 0.06);
  const parts = starts.map((p, k) => {
    const from = k === 0 ? 0 : cutAt(p.i);
    const to = k + 1 < starts.length ? Math.max(from, cutAt(starts[k + 1]!.i)) : fileEnd;
    const shift = (k === 0 ? b.vo : p.at) - from;
    return { from, to, at: from + shift, shift, firstWord: p.i, lastWord: k + 1 < starts.length ? starts[k + 1]!.i - 1 : ws.length - 1 };
  });
  const placed = ws.map((w, i) => {
    const p = parts.find((q) => i >= q.firstWord && i <= q.lastWord)!;
    const start = Math.max(w.start, p.from + 0.04);
    return { w: w.w, start: start + p.shift, end: Math.max(start + 0.05, Math.min(w.end, p.to)) + p.shift };
  });
  return { parts, words: placed, end: parts.at(-1)!.at + (parts.at(-1)!.to - parts.at(-1)!.from) };
}

/** Beat-relative seconds at which the voiceover says `word` (the `nth` occurrence; script spelling, punctuation ignored). */
export function say(n: number, word: string, nth = 1): number {
  let seen = 0;
  for (const w of voTimeline(n).words) if (norm(w.w) === norm(word) && ++seen === nth) return w.start;
  throw new Error(`beat ${n}: the voiceover never says "${word}" (#${nth})`);
}
/** Beat-relative seconds at which the voiceover for beat n ends. */
export const voEnd = (n: number) => voTimeline(n).end;

export const COPY = {
  url: "shopfront-agent.onrender.com",
  sandboxLine: "PayPal sandbox · test buyer in the README",
  dms: ["is this still available?", "do you ship to Ohio?", "how much for the green one?", "still available??"],
  noWords: ["No store", "No feed", "No checkout"],
  tagline: "Your photos, a store any AI agent can buy from",
  checks: 148,
  mismatches: 0,
  rebuilt: "Rebuilt from a real session · practice shop",
};
