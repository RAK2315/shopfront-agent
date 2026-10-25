import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { voTimeline } from "../config";
import { c, ease, FPS, ui } from "../theme";
import type { Word } from "./clip";

// One-line captions: the voiceover's own words (the script's spelling). Each sentence is its own caption; a long
// one is cut into balanced lines of at most ~54 characters, preferring a break after a comma or colon. Each line
// shows while it is spoken (Whisper word timings, voice/words.mjs, placed by config voTimeline).
const MAX = 54;
const textOf = (ws: Word[]) => ws.map((w) => w.w).join(" ");
function splitSentence(ws: Word[]): Word[][] {
  const len = textOf(ws).length;
  if (len <= MAX) return [ws];
  const n = Math.ceil(len / MAX);
  const target = len / n;
  // Choose the break after word k that best balances the first chunk, with a bonus for punctuation.
  let best = -1;
  let score = Infinity;
  for (let k = 0; k < ws.length - 1; k++) {
    const a = textOf(ws.slice(0, k + 1)).length;
    if (a > MAX) break;
    const sc = Math.abs(a - target) - (/[,:;]$/.test(ws[k]!.w) ? 12 : 0);
    if (sc < score) {
      score = sc;
      best = k;
    }
  }
  if (best < 0) best = Math.floor(ws.length / 2);
  return [ws.slice(0, best + 1), ...splitSentence(ws.slice(best + 1))];
}
export function captionLines(beat: number) {
  const ws: Word[] = voTimeline(beat).words;
  const sentences: Word[][] = [];
  let cur: Word[] = [];
  for (const w of ws) {
    cur.push(w);
    if (/[.?!]$/.test(w.w)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);
  return sentences.flatMap(splitSentence).map((l) => ({ text: textOf(l), start: l[0]!.start, end: l.at(-1)!.end }));
}

/** Captions for one beat, timed to where each sentence of its voice is placed (config voTimeline). */
export function Captions({ beat, dark = false }: { beat: number; dark?: boolean }) {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = captionLines(beat);
  const i = lines.findIndex((l, k) => t >= l.start - 0.08 && t < (lines[k + 1]?.start ?? l.end + 0.6) - 0.08);
  if (i < 0) return null;
  const l = lines[i]!;
  const age = (t - (l.start - 0.08)) * FPS;
  const o = interpolate(age, [0, 5], [0, 1], { extrapolateRight: "clamp", easing: ease.out });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54, pointerEvents: "none" }}>
      <div
        style={{
          opacity: o,
          transform: `translateY(${(1 - o) * 6}px)`,
          whiteSpace: "nowrap",
          background: dark ? "oklch(0.985 0 0 / 0.92)" : "oklch(0.19 0.01 45 / 0.86)",
          color: dark ? c.ink : c.panelText,
          fontFamily: ui,
          fontWeight: 500,
          fontSize: 36,
          lineHeight: 1.25,
          padding: "12px 26px",
          borderRadius: 12,
          letterSpacing: "-0.005em",
          boxShadow: "0 6px 24px rgb(0 0 0 / 0.18)",
        }}
      >
        {l.text}
      </div>
    </AbsoluteFill>
  );
}
