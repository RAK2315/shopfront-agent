import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { ease, FPS } from "../theme";

// Small motion helpers (launch-motion §3). Every value is a pure function of the frame.

/** 0 → 1 entrance with a slight overshoot (spring, damping ~14), starting at `at` seconds. */
export function useEnter(at: number, damping = 14) {
  const f = useCurrentFrame();
  return spring({ frame: f - Math.round(at * FPS), fps: FPS, config: { damping, stiffness: 140, mass: 0.9 } });
}

/** 1 → 0 exit, ~60% of an entrance, ease-in, starting at `at` seconds. */
export function useExit(at: number, dur = 0.3) {
  const f = useCurrentFrame();
  return interpolate(f / FPS, [at, at + dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.exit });
}

/** Eased progress 0 → 1 between two times (seconds). */
export function useProgress(from: number, to: number, easing = ease.camera) {
  const f = useCurrentFrame();
  return interpolate(f / FPS, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** An element that rises in (y 24 px → 0, opacity, overshoot) at `at` and optionally leaves at `out`. */
export function Rise({ at, out, children, style, dy = 24 }: { at: number; out?: number; children: ReactNode; style?: CSSProperties; dy?: number }) {
  const e = useEnter(at);
  const x = useExit(out ?? 1e9);
  const o = Math.min(1, e * 1.4) * x;
  return <div style={{ ...style, opacity: o, transform: `translateY(${(1 - e) * dy + (1 - x) * -10}px) scale(${0.96 + 0.04 * e})` }}>{children}</div>;
}

/** Scene wrapper: a quick dip in (12 frames, scale 1.03 → 1) and a faster dip out (7 frames). */
export function BeatFrame({ sec, children, bg }: { sec: number; children: ReactNode; bg: string }) {
  const f = useCurrentFrame();
  const total = Math.round(sec * FPS);
  const i = interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp", easing: ease.out });
  const o = interpolate(f, [total - 7, total], [1, 0], { extrapolateLeft: "clamp", easing: ease.exit });
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill style={{ opacity: Math.min(i, o), transform: `scale(${1.03 - 0.03 * i - 0.012 * (1 - o)})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}
