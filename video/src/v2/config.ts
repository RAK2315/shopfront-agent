import voice from "../../public/voice/v6/voice.json";
import { FPS } from "./theme";

// The v2 cut (DEMO-SCRIPT v6, D-110). The voice leads: each sentence is its own file and plays whole at `at` (beat
// seconds). The footage is cut to these times. The checks below fail the build on overlapping or crowded sentences, or
// a sentence that runs past its beat.
export type Word = { w: string; start: number; end: number };
export type Sentence = { file: string; seconds: number; caption: string; words: Word[] };
type BeatDef = { n: number; id: string; sec: number; at?: number[]; capTop?: Array<[number, number]>; captions?: boolean; noCap?: number[] };

const MIN_PAUSE = 0.3; // between sentences
const TAIL = 0.5; // the last sentence ends at least this long before the beat does

// `at` is set per beat as its scene is built; until then the sentences run on with natural pauses.
const DEFS: BeatDef[] = [
  { n: 1, id: "hook", sec: 12, at: [0.5, 4.9] },
  { n: 2, id: "promise", sec: 7, at: [0.8] },
  { n: 3, id: "listing", sec: 19.6, at: [0.5, 6.8, 13.7] },
  { n: 4, id: "agent-buys", sec: 29.2, at: [0.6, 7.3, 10.8, 16.9, 21.2, 25.4], capTop: [[0, 5]] },
  { n: 5, id: "phone", sec: 14, at: [0.5, 3.0, 4.5, 8.7] },
  { n: 6, id: "paid-direct", sec: 15.6, at: [0.3, 7.7, 10.9] },
  { n: 7, id: "gauntlet", sec: 24.6, at: [0.4, 3.3, 14.4, 19.6], noCap: [1] }, // sentence 1 is the headline on screen
  { n: 8, id: "dashboard", sec: 33, at: [0.4, 3.75, 11.2, 19.6, 25.8] },
  { n: 9, id: "trust", sec: 11, at: [0.5, 4.6] },
  { n: 10, id: "close", sec: 10.2, at: [0.6, 2.2, 6.0], captions: false }, // the words are on screen; nothing moves after the URL
];

const vbeats = (voice as { beats: Array<{ beat: number; sentences: Sentence[] }> }).beats;
export const sentencesOf = (n: number) => vbeats.find((b) => b.beat === n)!.sentences;

export type Placed = Sentence & { i: number; start: number; end: number };
function place(d: BeatDef): Placed[] {
  const ss = sentencesOf(d.n);
  let t = 0.5;
  return ss.map((s, i) => {
    const start = d.at?.[i] ?? (i === 0 ? t : t + 0.55);
    t = start + s.seconds;
    return { ...s, i, start, end: start + s.seconds };
  });
}

export const BEATS = DEFS.map((d) => ({ ...d, sentences: place(d) }));
for (const b of BEATS) {
  b.sentences.forEach((s, i) => {
    const prev = b.sentences[i - 1];
    if (prev && s.start < prev.end + MIN_PAUSE) throw new Error(`beat ${b.n}: sentence ${i + 1} starts ${(prev.end + MIN_PAUSE - s.start).toFixed(2)} s too early (overlap or crowding)`);
  });
  const last = b.sentences.at(-1)!;
  if (last.end > b.sec - TAIL) throw new Error(`beat ${b.n}: the voice runs to ${last.end.toFixed(2)} s, past the beat (${b.sec} s) minus its tail`);
}

export const XFADE = 0.3; // crossfade between beats (seconds)
export const TOTAL_SEC = BEATS.reduce((s, b) => s + b.sec, 0);
if (TOTAL_SEC >= 178) throw new Error(`the cut runs ${TOTAL_SEC.toFixed(1)} s; it must stay under 3:00 with margin`);
export const startOf = (n: number) => BEATS.filter((b) => b.n < n).reduce((s, b) => s + b.sec, 0);
export const beat = (n: number) => BEATS.find((b) => b.n === n)!;
export const frames = (sec: number) => Math.round(sec * FPS);
/** Beat seconds at which sentence `k` (1-based) of beat `n` starts / ends. */
export const sStart = (n: number, k: number) => beat(n).sentences[k - 1]!.start;
export const sEnd = (n: number, k: number) => beat(n).sentences[k - 1]!.end;
