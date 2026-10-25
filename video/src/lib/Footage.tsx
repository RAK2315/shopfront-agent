import { AbsoluteFill, Sequence } from "remotion";
import { frames } from "../config";
import { center, type Box, type Clip } from "./clip";
import { Shot, type Cam } from "./Shot";

// One capture track cut into segments that play back to back (real time, a labelled speed-up, or an invisible cut
// over a still stretch), under one continuous camera and one continuous cursor. `cams` and `rings` use footage
// seconds (0 = this Footage's start); segments use capture seconds.
export type Seg = { from: number; to: number; rate?: number; label?: string };
export function Footage({ clip, track = "main", segs, cams, rings }: { clip: Clip; track?: string; segs: Seg[]; cams?: Cam[]; rings?: Array<{ t0: number; t1: number; box: Box }> }) {
  let t = 0;
  const placed = segs.map((s) => {
    const rate = s.rate ?? 1;
    const len = (s.to - s.from) / rate;
    const out = { ...s, rate, start: t, len };
    t += len;
    return out;
  });
  const clicks = Object.values(clip.marks)
    .filter((m) => m.kind === "click" && m.track === track && m.box)
    .sort((a, b) => a.at - b.at);
  return (
    <AbsoluteFill>
      {placed.map((s, i) => {
        const before = clicks.filter((m) => m.at < s.from).at(-1);
        const firstUse = placed.findIndex((q) => clicks.some((m) => m.at >= q.from && m.at <= q.to));
        return (
          <Sequence key={i} from={frames(s.start)} durationInFrames={Math.max(1, frames(s.len))} layout="none">
            <Shot
              clip={clip}
              track={track}
              from={s.from}
              dur={s.len}
              rate={s.rate}
              label={s.label}
              cams={cams?.map((k) => ({ ...k, t: k.t - s.start }))}
              rings={rings?.map((r) => ({ ...r, t0: r.t0 - s.start, t1: r.t1 - s.start }))}
              cursorFrom={before ? center(before.box) : undefined}
              cursorFade={i <= firstUse}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

/** Total footage seconds for a list of segments. */
export const segsLength = (segs: Seg[]) => segs.reduce((s, x) => s + (x.to - x.from) / (x.rate ?? 1), 0);
