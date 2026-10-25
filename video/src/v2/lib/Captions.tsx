import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { beat as beatOf, type Placed } from "../config";
import { c, ease, FPS, sans } from "../theme";

// One-line captions (D-110): the voiceover's words, one sentence at a time; a long sentence is split into balanced lines
// of at most 54 characters, preferring a break after a comma or colon, timed by the split's share of the sentence's
// words. Each line fades in and out (never a hard swap), stays at least 1.2 s and leaves shortly after it is spoken.
const MAX = 54;
const FADE = 6; // frames
const MIN = 1.2;

type Line = { text: string; start: number; end: number };
function split(words: string[]): string[][] {
  const text = words.join(" ");
  if (text.length <= MAX) return [words];
  const n = Math.ceil(text.length / MAX);
  const target = text.length / n;
  let best = -1;
  let score = Infinity;
  for (let k = 0; k < words.length - 1; k++) {
    const a = words.slice(0, k + 1).join(" ").length;
    if (a > MAX) break;
    const sc = Math.abs(a - target) - (/[,:;]$/.test(words[k]!) ? 14 : 0);
    if (sc < score) {
      score = sc;
      best = k;
    }
  }
  if (best < 0) best = Math.floor(words.length / 2);
  return [words.slice(0, best + 1), ...split(words.slice(best + 1))];
}

export function captionLines(sentences: Placed[]): Line[] {
  const out: Line[] = [];
  for (const s of sentences) {
    const words = s.caption.split(" ");
    const parts = split(words);
    const total = s.caption.length;
    let used = 0;
    for (const p of parts) {
      const t = p.join(" ");
      const a = s.start + (used / total) * s.seconds;
      used += t.length + 1;
      const b = s.start + Math.min(1, used / total) * s.seconds;
      out.push({ text: t, start: a, end: b });
    }
  }
  // Show each line from just before it is spoken until shortly after, at least MIN, never over the next line.
  return out.map((l, i) => {
    const next = out[i + 1];
    const until = next ? next.start - 0.05 : Infinity;
    const end = Math.min(until, Math.max(l.end + 0.35, l.start + MIN));
    return { ...l, start: l.start - 0.12, end };
  });
}

export function Captions({ n }: { n: number }) {
  const t = useCurrentFrame() / FPS;
  const b = beatOf(n);
  const lines = captionLines(b.sentences);
  const l = lines.find((x) => t >= x.start && t < x.end);
  if (!l) return null;
  const o = Math.min(
    interpolate((t - l.start) * FPS, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out }),
    interpolate((l.end - t) * FPS, [0, FADE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const top = (b.capTop ?? []).some(([a, z]) => l.start >= a - 0.2 && l.start < z);
  return (
    <AbsoluteFill style={{ justifyContent: top ? "flex-start" : "flex-end", alignItems: "center", padding: "52px 0 58px", pointerEvents: "none" }}>
      <div
        style={{
          opacity: o,
          transform: `translateY(${(1 - o) * 4}px)`,
          whiteSpace: "nowrap",
          background: "oklch(0.2 0.01 45 / 0.8)",
          color: c.panelText,
          fontFamily: sans,
          fontWeight: 500,
          fontSize: 40,
          lineHeight: 1.2,
          padding: "10px 24px 12px",
          borderRadius: 12,
        }}
      >
        {l.text}
      </div>
    </AbsoluteFill>
  );
}
