import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { c, display, ease, FPS } from "../theme";

// Small motion pieces for the drawn scenes (D-110): ease-out only, no overshoot, nothing drifts once it has arrived.
// Times are seconds of the parent sequence.

export const useSec = () => useCurrentFrame() / FPS;

/** 0 → 1 between t0 and t0 + dur, eased out. */
export function useIn(t0: number, dur = 0.5, easing = ease.out) {
  const s = useSec();
  return interpolate(s, [t0, t0 + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** A UI entrance: fade plus a 14 px rise. */
export function Rise({ at, dy = 14, dur = 0.5, children, style }: { at: number; dy?: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const e = useIn(at, dur);
  return <div style={{ ...style, opacity: e, transform: `translateY(${(1 - e) * dy}px)` }}>{children}</div>;
}

/** A headline line revealed upward from behind a mask; still once it is in. */
export function Reveal({ at, dur = 0.65, children, style }: { at: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const e = useIn(at, dur);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em", marginBottom: "-0.12em", ...style }}>
      <div style={{ transform: `translateY(${(1 - e) * 105}%)`, opacity: Math.min(1, e * 2.5) }}>{children}</div>
    </div>
  );
}

/** The off-white paper, still. */
export function Paper() {
  return (
    <AbsoluteFill style={{ background: c.paper }}>
      <Img src={staticFile("images/paper-texture.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
}

/** Fades its children in over `dur` from `at` (a cut inside a beat that should not be hard). */
export function FadeFrom({ at, dur = 0.35, children }: { at: number; dur?: number; children: ReactNode }) {
  const s = useSec();
  const o = interpolate(s, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

/** The awning-S mark (public/brand/logo-mark.svg), built in order: the S settles in, then the three panels drop in. */
export function LogoMark({ size, at = 0 }: { size: number; at?: number }) {
  const sIn = useIn(at, 0.5);
  const p = [useIn(at + 0.2, 0.4), useIn(at + 0.3, 0.4), useIn(at + 0.4, 0.4)];
  const panels = [
    "M33.2 22.6 H43.2 L40.9 37.6 A8.75 8.75 0 0 1 23.4 37.6 L30.4 24.1 Q31.1 22.6 33.2 22.6 Z",
    "M45.6 22.6 H54.4 L57.8 37.6 A7.8 7.8 0 0 1 42.2 37.6 Z",
    "M56.8 22.6 H66.8 Q68.9 22.6 69.6 24.1 L76.6 37.6 A8.75 8.75 0 0 1 59.1 37.6 Z",
  ];
  return (
    <svg width={size} height={size} viewBox="12 12 76 76" style={{ overflow: "visible" }}>
      <path
        fill="#1C1917"
        opacity={sIn}
        transform={`translate(0 ${(1 - sIn) * 4})`}
        d="M25 42 H40 V45 Q40 47.5 43.6 47.5 H62.6 A12.35 12.35 0 0 1 62.6 72.2 H35.6 A10.2 10.2 0 0 1 25.4 62 H60.4 A2.25 2.25 0 0 0 60.4 57.5 H35 A10 10 0 0 1 25 47.5 Z"
      />
      <g fill="#B4532A" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" paintOrder="stroke">
        {panels.map((d, i) => (
          <path key={i} d={d} opacity={p[i]!} transform={`translate(0 ${(1 - p[i]!) * -8})`} />
        ))}
      </g>
    </svg>
  );
}

export function Wordmark({ size }: { size: number }) {
  return <span style={{ fontFamily: display, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", color: c.ink, whiteSpace: "nowrap" }}>Shopfront Agent</span>;
}

/** One soft pulse when a card starts working: a thin clay ring that grows a little and fades. Never loops. */
export function Pulse({ at, radius = 22, color = c.clay }: { at: number; radius?: number; color?: string }) {
  const s = useSec();
  const u = interpolate(s, [at, at + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });
  if (s < at || u >= 1) return null;
  const grow = 4 + 14 * u;
  return <div style={{ position: "absolute", inset: -grow, borderRadius: radius + grow, border: `2px solid ${color}`, opacity: 0.55 * (1 - u), pointerEvents: "none" }} />;
}

/** A soft coloured glow around a box (canvas px) that builds from `at`; for counters, drawn outside the real UI. */
export function Glow({ at, box, color, dur = 0.9, strength = 1, radius = 16 }: { at: number; box?: { x: number; y: number; width: number; height: number }; color: string; dur?: number; strength?: number; radius?: number }) {
  const e = useIn(at, dur) * strength;
  if (e <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        ...(box ? { left: box.x, top: box.y, width: box.width, height: box.height } : { inset: 0 }),
        borderRadius: radius,
        boxShadow: `0 0 0 2px color-mix(in oklch, ${color} ${Math.round(70 * e)}%, transparent), 0 0 ${30 + 30 * e}px ${6 + 8 * e}px color-mix(in oklch, ${color} ${Math.round(45 * e)}%, transparent)`,
        pointerEvents: "none",
      }}
    />
  );
}
