import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { Box, Clip, Track } from "../../lib/clip";
import { center } from "../../lib/clip";
import { frames } from "../config";
import { c as col, ease, FPS, H, W } from "../theme";
import { Cursor, type Press } from "./Cursor";
import { Spotlights, type Spot } from "./Spotlight";

// Real footage, shown still and full-frame (D-110): one capture track scaled to fill the canvas, with the page's own
// scrollbar cropped off. A list of cuts plays the track at real speed; each cut runs until the next one starts, and a
// cut that runs past the end of the track holds its last frame. Waits are skipped by cutting, never sped up.
// Spotlights and the cursor are placed in beat seconds and CSS px of the captured page.
export type Cut = { at: number; from: number }; // at: seconds in this footage; from: capture seconds
/** A magnified callout of a small area of the same footage (dense text, e.g. an AI answer), in sync with the cuts:
 * `box` in CSS px of the capture, placed with its top-left at canvas (x, y), `scale` times the full-frame size. */
export type Loupe = { t0: number; t1: number; box: Box; x: number; y: number; scale: number };
export const SCROLLBAR = 15; // CSS px of the page's scrollbar at the right edge, cropped off

/** CSS px of the track → canvas px. */
export function framing(tr: Track) {
  const k = W / (tr.css.w - SCROLLBAR);
  const oy = (tr.css.h * k - H) / 2; // the few px the crop costs at the top and bottom
  return { k, toCanvas: (b: Box): Box => ({ x: b.x * k, y: b.y * k - oy, width: b.width * k, height: b.height * k }), pt: (p: { x: number; y: number }) => ({ x: p.x * k, y: p.y * k - oy }) };
}

export function Footage({ clip, track = "main", cuts, end, spots = [], loupes = [], hideCursor = false }: { clip: Clip; track?: string; cuts: Cut[]; end: number; spots?: Spot[]; loupes?: Loupe[]; hideCursor?: boolean }) {
  const tr = clip.tracks[track]!;
  const fr = framing(tr);
  // Every press that happens inside a cut, in footage seconds.
  const presses: Press[] = [];
  cuts.forEach((c, i) => {
    const until = cuts[i + 1]?.at ?? end;
    for (const m of Object.values(clip.marks)) {
      if (m.kind !== "click" || m.track !== track || !m.box) continue;
      const s = c.at + (m.at - c.from);
      if (m.at >= c.from && s < until) presses.push({ s, pt: fr.pt(center(m.box)!) });
    }
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#fff" }}>
      <Cuts tr={tr} cuts={cuts} end={end} k={fr.k} />
      <Spotlights spots={spots.map((s) => ({ ...s, box: fr.toCanvas(s.box) }))} />
      {loupes.map((l, i) => (
        <LoupeView key={i} l={l} src={fr.toCanvas(l.box)}>
          <Cuts tr={tr} cuts={cuts} end={end} k={fr.k} />
        </LoupeView>
      ))}
      {!hideCursor && <Cursor presses={presses} />}
      {presses.map((p, i) => (
        <Sequence key={i} from={frames(p.s)} durationInFrames={10} layout="none">
          <Audio src={staticFile("sfx/click.wav")} volume={0.55} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function Cuts({ tr, cuts, end, k }: { tr: Track; cuts: Cut[]; end: number; k: number }) {
  return (
    <>
      {cuts.map((c, i) => {
        const until = cuts[i + 1]?.at ?? end;
        return (
          <Sequence key={i} from={frames(c.at)} durationInFrames={Math.max(1, frames(until) - frames(c.at))} layout="none">
            <Play tr={tr} from={c.from} k={k} />
          </Sequence>
        );
      })}
    </>
  );
}

/** The callout card: the full-frame footage scaled up and windowed onto `src` (canvas px). Fades and rises in. */
function LoupeView({ l, src, children }: { l: Loupe; src: Box; children: React.ReactNode }) {
  const s = useCurrentFrame() / FPS;
  const e = interpolate(s, [l.t0, l.t0 + 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });
  const x = interpolate(s, [l.t1, l.t1 + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.in });
  const o = Math.min(e, x);
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: l.x,
        top: l.y,
        width: src.width * l.scale,
        height: src.height * l.scale,
        overflow: "hidden",
        borderRadius: 16,
        opacity: o,
        transform: `translateY(${(1 - e) * 14}px)`,
        background: "#fff",
        boxShadow: `0 24px 60px -12px rgb(30 20 10 / 0.45), 0 0 0 2px ${col.clay}`,
      }}
    >
      <div style={{ position: "absolute", left: -src.x * l.scale, top: -src.y * l.scale, width: W, height: H, transform: `scale(${l.scale})`, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}

/** One cut of a track at real speed; past the end of the track, its last frame holds. */
function Play({ tr, from, k }: { tr: Track; from: number; k: number }) {
  const f = useCurrentFrame();
  const trimBefore = Math.max(0, Math.round((from - tr.start) * FPS));
  const last = Math.floor((tr.seconds - 0.15 - (from - tr.start)) * FPS);
  const h = tr.css.h * k;
  return (
    <div style={{ position: "absolute", left: 0, top: (H - h) / 2, width: tr.css.w * k, height: h }}>
      <Freeze frame={Math.max(0, last)} active={f >= last}>
        <OffthreadVideo src={staticFile(tr.file)} trimBefore={trimBefore} muted style={{ width: "100%", height: "100%" }} />
      </Freeze>
    </div>
  );
}

/** A single frame of a track, held (e.g. the page behind PayPal's window). */
export function Still({ clip, track = "main", at }: { clip: Clip; track?: string; at: number }) {
  const tr = clip.tracks[track]!;
  const { k } = framing(tr);
  const h = tr.css.h * k;
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#fff" }}>
      <div style={{ position: "absolute", left: 0, top: (H - h) / 2, width: tr.css.w * k, height: h }}>
        <Freeze frame={0}>
          <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round((at - tr.start) * FPS)} muted style={{ width: "100%", height: "100%" }} />
        </Freeze>
      </div>
    </AbsoluteFill>
  );
}
