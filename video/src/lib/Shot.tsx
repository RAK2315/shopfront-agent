import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { c, ease, FPS, H, W, ui } from "../theme";
import { center, type Box, type Clip } from "./clip";

// One shot of real footage: a window of one capture track, played at `rate`, under an eased camera, with the drawn
// cursor and a quiet click on every press logged by the capture. Times: `from` is capture seconds; shot time `s`
// starts at 0. Camera keys: { t (shot s), zoom, x/y (css px of the captured viewport) or mark (centre of its box) }.
export type Cam = { t: number; zoom: number; x?: number; y?: number; mark?: string; dx?: number; dy?: number };
export type ShotProps = {
  clip: Clip;
  track?: string;
  from: number;
  dur: number; // shot seconds
  rate?: number;
  cams?: Cam[];
  cursor?: boolean;
  cursorFrom?: { x: number; y: number };
  drift?: number; // micro push per second (launch-motion: nothing fully still)
  label?: string; // e.g. "2x speed": shown when a shot is sped up (honesty: sped-up waits are labelled)
  cursorFade?: boolean; // fade the cursor in at the start (false when continuing from the previous segment)
  rings?: Array<{ t0: number; t1: number; box: Box }>; // clay outlines around a box (shot seconds, css px)
};

type Pt = { x: number; y: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function camAt(p: ShotProps, s: number) {
  const tr = p.clip.tracks[p.track ?? "main"]!;
  const keys = (p.cams?.length ? p.cams : [{ t: 0, zoom: 1 }]).map((k) => {
    const m = k.mark ? center(p.clip.marks[k.mark]?.box) : undefined;
    return { t: k.t, zoom: k.zoom, x: (k.x ?? m?.x ?? tr.css.w / 2) + (k.dx ?? 0), y: (k.y ?? m?.y ?? tr.css.h / 2) + (k.dy ?? 0) };
  });
  let a = keys[0]!;
  let b = a;
  for (const k of keys) {
    if (k.t <= s) a = k;
    if (k.t >= s) {
      b = k;
      break;
    }
    b = k;
  }
  const u = a === b || b.t === a.t ? 1 : ease.camera(clamp((s - a.t) / (b.t - a.t), 0, 1));
  const s0 = W / tr.css.w;
  const zoom = (a.zoom + (b.zoom - a.zoom) * u) * (1 + (p.drift ?? 0.006) * s);
  let x = a.x + (b.x - a.x) * u;
  let y = a.y + (b.y - a.y) * u;
  // Keep the frame filled: the focus can't come closer to an edge than half the visible area.
  const hw = W / 2 / (s0 * zoom);
  const hh = H / 2 / (s0 * zoom);
  const fitH = tr.css.h * s0; // a 16:9 capture fills the canvas exactly
  x = clamp(x, hw, tr.css.w - hw);
  y = fitH >= H ? clamp(y, hh, tr.css.h - hh) : tr.css.h / 2;
  return { zoom, x, y, s0, toScreen: (pt: Pt) => ({ x: W / 2 + (pt.x - x) * s0 * zoom, y: H / 2 + (pt.y - y) * s0 * zoom }) };
}

export function clicksIn(p: ShotProps) {
  const rate = p.rate ?? 1;
  return Object.entries(p.clip.marks)
    .filter(([, m]) => m.kind === "click" && m.track === (p.track ?? "main") && m.box && m.at >= p.from && m.at <= p.from + p.dur * rate)
    .map(([key, m]) => ({ key, s: (m.at - p.from) / rate, pt: center(m.box as Box)! }))
    .sort((a, b) => a.s - b.s);
}

export function Shot(p: ShotProps) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const tr = p.clip.tracks[p.track ?? "main"];
  if (!tr) throw new Error(`clip ${p.clip.beat} has no track ${p.track}`);
  const rate = p.rate ?? 1;
  const cam = camAt(p, s);
  const trimBefore = Math.max(0, Math.round((p.from - tr.start) * FPS));
  // Past the end of the track, hold its last frame.
  const lastFrame = Math.floor(((tr.seconds - 0.15 - (p.from - tr.start)) / rate) * FPS);
  const clicks = p.cursor === false ? [] : clicksIn(p);
  return (
    <AbsoluteFill style={{ background: c.canvas, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: tr.css.w * cam.s0,
          height: tr.css.h * cam.s0,
          transformOrigin: "0 0",
          transform: `translate(${W / 2 - cam.x * cam.s0 * cam.zoom}px, ${H / 2 - cam.y * cam.s0 * cam.zoom}px) scale(${cam.zoom})`,
        }}
      >
        <Freeze frame={lastFrame} active={f >= lastFrame}>
          <OffthreadVideo src={staticFile(tr.file)} trimBefore={trimBefore} playbackRate={rate} muted style={{ width: "100%", height: "100%" }} />
        </Freeze>
      </div>
      {p.rings?.map((r, i) => <Ring key={i} {...r} s={s} toScreen={cam.toScreen} zoom={cam.zoom * cam.s0} />)}
      {(clicks.length > 0 || p.cursorFrom) && <Cursor clicks={clicks} start={p.cursorFrom} toScreen={cam.toScreen} fade={p.cursorFade !== false} />}
      {clicks.map((k) => (
        <Sequence key={k.key} from={Math.round(k.s * FPS)} durationInFrames={12} layout="none">
          <Audio src={staticFile("sfx/click.wav")} volume={0.22} />
        </Sequence>
      ))}
      {p.label && <SpeedChip text={p.label} />}
    </AbsoluteFill>
  );
}

function SpeedChip({ text }: { text: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", right: 48, top: 40, opacity: o, background: "oklch(0.19 0.01 45 / 0.82)", color: c.panelText, fontSize: 24, padding: "8px 16px", borderRadius: 999, fontFamily: ui, fontWeight: 500, letterSpacing: "0.01em" }}>
      {text}
    </div>
  );
}

/** The drawn cursor: arcs to each target (quadratic bezier, control 15% of the distance off the line), lands with a
 * tiny overshoot, presses (scale 1 → 0.86 → 1 over 8 frames) and leaves a fading ring. Positions live in page
 * space, so the cursor rides the camera like a hand on the page. */
export function Cursor({ clicks, start, toScreen, fade = true }: { clicks: Array<{ s: number; pt: Pt }>; start?: Pt; toScreen: (p: Pt) => Pt; fade?: boolean }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const first = clicks[0]?.pt ?? start!;
  let prev: Pt = start ?? { x: first.x + 170, y: first.y + 130 };
  let pos = prev;
  let press = 1;
  let ring: { pt: Pt; age: number } | null = null;
  let lastEnd = -Infinity;
  for (const k of clicks) {
    const dist = Math.hypot(k.pt.x - prev.x, k.pt.y - prev.y);
    const travel = clamp(0.45 + dist / 1400, 0.5, 0.95);
    const t0 = Math.max(k.s - travel - 0.06, lastEnd + 0.2);
    const t1 = k.s - 0.06;
    if (s < t0) break;
    if (s <= t1 && t1 > t0) {
      const u = ease.hand(clamp((s - t0) / (t1 - t0), 0, 1));
      const mx = (prev.x + k.pt.x) / 2;
      const my = (prev.y + k.pt.y) / 2;
      const nx = -(k.pt.y - prev.y);
      const ny = k.pt.x - prev.x;
      const nl = Math.hypot(nx, ny) || 1;
      const side = ny > 0 ? -1 : 1; // bow upward, like a wrist
      const cx = mx + (side * nx * 0.15 * dist) / nl;
      const cy = my + (side * ny * 0.15 * dist) / nl;
      pos = { x: (1 - u) ** 2 * prev.x + 2 * (1 - u) * u * cx + u * u * k.pt.x, y: (1 - u) ** 2 * prev.y + 2 * (1 - u) * u * cy + u * u * k.pt.y };
      break;
    }
    pos = k.pt;
    const age = (s - k.s) * FPS;
    if (age >= 0 && age < 8) press = interpolate(age, [0, 4, 8], [1, 0.86, 1]);
    if (age >= 0 && age < 16) ring = { pt: k.pt, age };
    prev = k.pt;
    lastEnd = k.s;
  }
  const p = toScreen(pos);
  const o = fade ? interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const r = ring ? toScreen(ring.pt) : null;
  return (
    <>
      {r && ring && (
        <div
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: 0,
            height: 0,
            borderRadius: 999,
            boxShadow: `0 0 0 ${interpolate(ring.age, [0, 16], [6, 34], { easing: ease.out })}px ${c.clay}`,
            opacity: interpolate(ring.age, [0, 16], [0.35, 0]),
          }}
        />
      )}
      <svg width={38} height={38} viewBox="0 0 24 24" style={{ position: "absolute", left: p.x - 5, top: p.y - 3, opacity: o, transform: `scale(${press})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 3px 5px rgb(0 0 0 / 0.28))" }}>
        <path d="M5 3 L5 19.5 L9.4 15.6 L12.3 21.6 L15.1 20.3 L12.3 14.4 L18.2 14.2 Z" fill="#fff" stroke="#111" strokeWidth={1.3} strokeLinejoin="round" />
      </svg>
    </>
  );
}

/** A clay outline that eases around a box on the page while it matters (callout for a push-in). */
function Ring({ t0, t1, box, s, toScreen, zoom }: { t0: number; t1: number; box: Box; s: number; toScreen: (p: Pt) => Pt; zoom: number }) {
  const o = Math.min(interpolate(s, [t0, t0 + 0.35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out }), interpolate(s, [t1 - 0.25, t1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  if (o <= 0) return null;
  const a = toScreen({ x: box.x, y: box.y });
  const pad = 8 + (1 - o) * 14;
  return <div style={{ position: "absolute", left: a.x - pad, top: a.y - pad, width: box.width * zoom + pad * 2, height: box.height * zoom + pad * 2, border: "3px solid " + c.clay, borderRadius: 14, opacity: o, boxShadow: "0 0 0 6px oklch(0.56 0.14 40 / 0.15)" }} />;
}
