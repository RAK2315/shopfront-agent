import { Audio, Sequence, interpolate, staticFile } from "remotion";
import env from "../../../public/music/budding-of-consciousness.env.json";
import { BEATS, frames, startOf } from "../config";
import { FPS } from "../theme";

// The voice (one file per sentence, whole, at its placed time) and the CC0 music bed under it (D-110). The bed is held
// at a steady level whatever the track does (it swells about 9 dB around 52 s): its gain follows the track's own
// loudness (voice/music-env.mjs). Targets, against the voice's -19 dBFS speech RMS: -44 dBFS while he speaks (25 dB
// under), -38 dBFS in the pauses (19 dB under). It fades in over 2 s and out over 3 s.
const UNDER = -44;
const BETWEEN = -38;
const GLIDE = 0.45; // seconds to move between the two levels
const MAX_GAIN = 1;

const E = env as { step: number; db: number[] };
const musicDb = (t: number) => {
  const x = t / E.step;
  const i = Math.max(0, Math.min(E.db.length - 2, Math.floor(x)));
  const u = Math.min(1, Math.max(0, x - i));
  return E.db[i]! + (E.db[i + 1]! - E.db[i]!) * u;
};

export function Voice({ n }: { n: number }) {
  const b = BEATS.find((x) => x.n === n)!;
  return (
    <>
      {b.sentences.map((s) => (
        <Sequence key={s.i} from={frames(s.start)} durationInFrames={frames(s.seconds) + 3} layout="none">
          <Audio src={staticFile(s.file)} />
        </Sequence>
      ))}
    </>
  );
}

/** The music bed for the beats in `only` (all when omitted), aligned to where they sit in the full cut. */
export function Music({ only }: { only?: number[] }) {
  const beats = BEATS.filter((b) => !only || only.includes(b.n));
  const t0 = startOf(beats[0]!.n);
  const total = beats.reduce((s, b) => s + b.sec, 0);
  const speech = beats.flatMap((b) => b.sentences.map((s) => [startOf(b.n) - t0 + s.start - 0.15, startOf(b.n) - t0 + s.end + 0.2] as const));
  const volume = (f: number) => {
    const t = f / FPS;
    let d = Infinity;
    for (const [a, z] of speech) d = Math.min(d, t < a ? a - t : t > z ? t - z : 0);
    const u = Math.min(1, d / GLIDE);
    const target = UNDER + (BETWEEN - UNDER) * (u * u * (3 - 2 * u));
    const gain = Math.min(MAX_GAIN, 10 ** ((target - musicDb(t0 + t)) / 20));
    const fade = Math.min(interpolate(t, [0, 2], [0, 1], { extrapolateRight: "clamp" }), interpolate(t, [total - 3, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return gain * fade;
  };
  return <Audio src={staticFile("music/budding-of-consciousness.mp3")} trimBefore={frames(t0)} volume={volume} />;
}
