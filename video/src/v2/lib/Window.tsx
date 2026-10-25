import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { Box, Clip } from "../../lib/clip";
import { center } from "../../lib/clip";
import { frames } from "../config";
import { ease, FPS } from "../theme";
import { Cursor, type Press } from "./Cursor";

// A captured popup window (PayPal's own approval window) shown as it was: a floating window over the page it came from.
// Its scrollbars are cropped; `soften` blurs small boxes (a card brand's image, S6.4). Cuts work like Footage: real
// speed, waits skipped by cutting. Times are seconds of the parent sequence.
type Cut = { at: number; from: number };
const CROP = { right: 14, bottom: 12 }; // the window's own scrollbars, CSS px

export function Window({ clip, track, cuts, end, height = 880, soften = [] }: { clip: Clip; track: string; cuts: Cut[]; end: number; height?: number; soften?: Box[] }) {
  const s = useCurrentFrame() / FPS;
  const tr = clip.tracks[track]!;
  const vw = tr.css.w - CROP.right;
  const vh = tr.css.h - CROP.bottom;
  const k = height / vh;
  const w = vw * k;
  const x0 = 960 - w / 2;
  const y0 = 540 - height / 2;
  const enter = interpolate(s, [0, 0.35], [0, 1], { extrapolateRight: "clamp", easing: ease.out });
  const exit = interpolate(s, [end - 0.25, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.in });
  const o = Math.min(enter, exit);
  const presses: Press[] = [];
  cuts.forEach((c, i) => {
    const until = cuts[i + 1]?.at ?? end;
    for (const m of Object.values(clip.marks)) {
      if (m.kind !== "click" || m.track !== track || !m.box) continue;
      const t = c.at + (m.at - c.from);
      const p = center(m.box)!;
      if (m.at >= c.from && t < until) presses.push({ s: t, pt: { x: x0 + p.x * k, y: y0 + p.y * k } });
    }
  });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `oklch(0.15 0.01 45 / ${0.42 * o})` }} />
      <div style={{ position: "absolute", left: x0, top: y0, width: w, height, opacity: o, transform: `scale(${0.97 + 0.03 * enter})`, borderRadius: 14, overflow: "hidden", boxShadow: "0 30px 80px rgb(0 0 0 / 0.35), 0 0 0 1px rgb(0 0 0 / 0.1)", background: "#fff" }}>
        {cuts.map((c, i) => {
          const until = cuts[i + 1]?.at ?? end;
          const last = Math.floor((tr.seconds - 0.15 - (c.from - tr.start)) * FPS);
          return (
            <Sequence key={i} from={frames(c.at)} durationInFrames={Math.max(1, frames(until) - frames(c.at))} layout="none">
              <Hold last={last}>
                <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round((c.from - tr.start) * FPS)} muted style={{ position: "absolute", left: 0, top: 0, width: tr.css.w * k, height: tr.css.h * k }} />
              </Hold>
            </Sequence>
          );
        })}
        {soften.map((b, i) => (
          <div key={i} style={{ position: "absolute", left: b.x * k, top: b.y * k, width: b.width * k, height: b.height * k, backdropFilter: "blur(10px)", background: "rgb(240 240 240 / 0.6)", borderRadius: 6 }} />
        ))}
      </div>
      <div style={{ opacity: o }}>
        <Cursor presses={presses} />
      </div>
      {presses.map((p, i) => (
        <Sequence key={i} from={frames(p.s)} durationInFrames={10} layout="none">
          <Audio src={staticFile("sfx/click.wav")} volume={0.55} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

function Hold({ last, children }: { last: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  return (
    <Freeze frame={Math.max(0, last)} active={f >= last}>
      {children}
    </Freeze>
  );
}
