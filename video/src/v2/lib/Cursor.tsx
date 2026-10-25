import { interpolate, useCurrentFrame } from "remotion";
import { c, ease, FPS } from "../theme";

// The drawn cursor (D-110): it shows only around presses. It glides in on a soft arc, settles half a second before the
// press so the viewer sees what is about to happen, presses (a small scale-down and a faint ring, with the click sound
// placed by the parent on the same frame), rests, then fades. Consecutive presses close together are joined by one
// glide. `s` is seconds of the parent sequence; `pt` is canvas px.
export type Press = { s: number; pt: { x: number; y: number } };
const GLIDE = 0.75;
const REST = 0.5; // arrive this long before the press
const LINGER = 0.9;
const JOIN = 3.0; // presses closer than this are joined by one glide

type Pt = { x: number; y: number };
const lerpArc = (a: Pt, b: Pt, u: number) => {
  const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / dist;
  const ny = (b.x - a.x) / dist;
  const side = ny > 0 ? -1 : 1; // bow upward, like a wrist
  const cx = (a.x + b.x) / 2 + side * nx * 0.08 * dist;
  const cy = (a.y + b.y) / 2 + side * ny * 0.08 * dist;
  return { x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * cx + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * cy + u * u * b.y };
};

export function Cursor({ presses }: { presses: Press[] }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const ps = [...presses].sort((a, b) => a.s - b.s);
  for (let k = 0; k < ps.length; k++) {
    const p = ps[k]!;
    const prev = ps[k - 1];
    const next = ps[k + 1];
    const joinedPrev = !!prev && p.s - prev.s < JOIN;
    const joinedNext = !!next && next.s - p.s < JOIN;
    const arrive = p.s - REST;
    const start = joinedPrev ? Math.max(prev!.s + 0.3, arrive - GLIDE) : arrive - GLIDE;
    const from = joinedPrev ? prev!.pt : { x: p.pt.x + 150, y: p.pt.y + 110 };
    const leave = joinedNext ? Infinity : p.s + LINGER;
    const nextStart = joinedNext ? Math.max(p.s + 0.3, next!.s - REST - GLIDE) : Infinity;
    if (s < start - (joinedPrev ? 0 : 0.25) || s >= Math.min(nextStart, leave + 0.3)) continue;
    let pos = p.pt;
    if (s < arrive) {
      const u = ease.soft(interpolate(s, [start, arrive], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      pos = lerpArc(from, p.pt, u);
    }
    const fadeIn = joinedPrev ? 1 : interpolate(s, [start - 0.25, start + 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const fadeOut = joinedNext ? 1 : interpolate(s, [leave, leave + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const age = (s - p.s) * FPS;
    const press = age >= 0 && age < 6 ? interpolate(age, [0, 2, 6], [1, 0.92, 1]) : 1;
    return (
      <>
        {age >= 0 && age < 14 && (
          <div
            style={{
              position: "absolute",
              left: p.pt.x - interpolate(age, [0, 14], [6, 22], { easing: ease.out }),
              top: p.pt.y - interpolate(age, [0, 14], [6, 22], { easing: ease.out }),
              width: 2 * interpolate(age, [0, 14], [6, 22], { easing: ease.out }),
              height: 2 * interpolate(age, [0, 14], [6, 22], { easing: ease.out }),
              borderRadius: "50%",
              border: `2px solid ${c.clay}`,
              opacity: interpolate(age, [0, 14], [0.55, 0]),
            }}
          />
        )}
        <svg width={34} height={34} viewBox="0 0 24 24" style={{ position: "absolute", left: pos.x - 5, top: pos.y - 3, opacity: Math.min(fadeIn, fadeOut), transform: `scale(${press})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 2px 4px rgb(0 0 0 / 0.25))" }}>
          <path d="M5 3 L5 19.5 L9.4 15.6 L12.3 21.6 L15.1 20.3 L12.3 14.4 L18.2 14.2 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
        </svg>
      </>
    );
  }
  return null;
}
