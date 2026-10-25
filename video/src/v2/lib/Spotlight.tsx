import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Box } from "../../lib/clip";
import { c, ease, FPS } from "../theme";

// Points at one area without moving the camera (D-110): the rest of the frame dims gently and a thin clay outline sits
// around the area. A spot that starts where the previous one ends glides from the old box to the new one (a morph,
// not a swap); otherwise it fades in and out. Times are seconds of the parent sequence; boxes are canvas px.
export type Spot = { t0: number; t1: number; box: Box; pad?: number };
const DIM = 0.3;
const IN = 0.35;
const OUT = 0.3;
const MORPH = 0.5;

export function Spotlights({ spots }: { spots: Spot[] }) {
  const s = useCurrentFrame() / FPS;
  const list = [...spots].sort((a, b) => a.t0 - b.t0);
  // The current spot is the last one that has started.
  let i = -1;
  list.forEach((sp, k) => {
    if (sp.t0 <= s) i = k;
  });
  if (i < 0) return null;
  const sp = list[i]!;
  const prev = chainedFrom(list, i) ? list[i - 1]! : null;
  const next = chainedFrom(list, i + 1) ? list[i + 1]! : null;
  if (!next && s >= sp.t1 + OUT) return null;
  const fadeIn = prev ? 1 : interpolate(s, [sp.t0, sp.t0 + IN], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });
  const fadeOut = next ? 1 : interpolate(s, [sp.t1, sp.t1 + OUT], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.in });
  const o = Math.min(fadeIn, fadeOut);
  if (o <= 0) return null;
  const pad = sp.pad ?? 10;
  let b = { x: sp.box.x - pad, y: sp.box.y - pad, width: sp.box.width + pad * 2, height: sp.box.height + pad * 2 };
  if (prev) {
    const u = interpolate(s, [sp.t0, sp.t0 + MORPH], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });
    const pp = prev.pad ?? 10;
    const a = { x: prev.box.x - pp, y: prev.box.y - pp, width: prev.box.width + pp * 2, height: prev.box.height + pp * 2 };
    b = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, width: a.width + (b.width - a.width) * u, height: a.height + (b.height - a.height) * u };
  }
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: b.x,
          top: b.y,
          width: b.width,
          height: b.height,
          borderRadius: 14,
          boxShadow: `0 0 0 4000px oklch(0.18 0.01 45 / ${DIM * o})`,
          outline: `2px solid color-mix(in oklch, ${c.clay} ${Math.round(85 * o)}%, transparent)`,
          outlineOffset: 0,
        }}
      />
    </AbsoluteFill>
  );
}

/** A spot is chained to the previous one when it starts no later than 0.1 s after the previous one ends. */
function chainedFrom(list: Spot[], k: number) {
  const p = list[k - 1];
  const sp = list[k];
  return !!p && !!sp && sp.t0 <= p.t1 + 0.1;
}
