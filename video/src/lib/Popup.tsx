import { AbsoluteFill, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FPS } from "../theme";
import { center, type Box, type Clip } from "./clip";
import { Cursor } from "./Shot";
import { Audio } from "remotion";

// A captured popup window (PayPal's own approval window) shown as a floating window over the page it came from,
// with the drawn cursor and click on its presses. `soften`: css boxes blurred (e.g. a card brand's image, S6.4).
export function Popup({ clip, track, from, dur, height = 860, cx = 960, cy = 520, soften = [] }: { clip: Clip; track: string; from: number; dur: number; height?: number; cx?: number; cy?: number; soften?: Box[] }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const tr = clip.tracks[track]!;
  const scale = height / tr.css.h;
  const w = tr.css.w * scale;
  const x0 = cx - w / 2;
  const y0 = cy - height / 2;
  const enter = interpolate(s, [0, 0.4], [0, 1], { extrapolateRight: "clamp", easing: (t) => 1 - (1 - t) ** 3 });
  const exit = interpolate(s, [dur - 0.25, dur], [1, 0], { extrapolateLeft: "clamp" });
  const o = Math.min(enter, exit);
  const clicks = Object.values(clip.marks)
    .filter((m) => m.kind === "click" && m.track === track && m.box && m.at >= from && m.at <= from + dur)
    .map((m) => ({ s: m.at - from, pt: center(m.box)! }));
  const toScreen = (p: { x: number; y: number }) => ({ x: x0 + p.x * scale, y: y0 + p.y * scale });
  const lastFrame = Math.floor((tr.seconds - 0.15 - (from - tr.start)) * FPS);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x0, top: y0, width: w, height, opacity: o, transform: `scale(${0.94 + 0.06 * enter})`, borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 100px rgb(0 0 0 / 0.45), 0 0 0 1px rgb(0 0 0 / 0.12)", background: "#fff" }}>
        <Freeze frame={lastFrame} active={f >= lastFrame}>
          <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round((from - tr.start) * FPS)} muted style={{ width: "100%", height: "100%" }} />
        </Freeze>
        {soften.map((b, i) => (
          <div key={i} style={{ position: "absolute", left: b.x * scale, top: b.y * scale, width: b.width * scale, height: b.height * scale, backdropFilter: "blur(9px)", background: "rgb(255 255 255 / 0.35)", borderRadius: 6 }} />
        ))}
      </div>
      {clicks.length > 0 && <div style={{ opacity: o }}><Cursor clicks={clicks} toScreen={toScreen} /></div>}
      {clicks.map((k, i) => (
        <Sequence key={i} from={Math.round(k.s * FPS)} durationInFrames={12} layout="none">
          <Audio src={staticFile("sfx/click.wav")} volume={0.22} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
