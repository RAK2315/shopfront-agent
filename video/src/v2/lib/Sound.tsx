import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { BEATS, frames, startOf } from "../config";
import { FPS } from "../theme";

// The voice (one file per sentence, whole, at its placed time) and the CC0 music bed under it (D-110). The bed sits low,
// dips further while he speaks, and fades in and out. Levels: the voice is levelled to -19 dBFS speech RMS; the bed's
// raw RMS is about -26 dBFS, so 0.18 puts it about 22 dB under speech and 0.36 about 16 dB under in the pauses.
const UNDER = 0.18;
const BETWEEN = 0.36;
const GLIDE = 0.45; // seconds to move between the two levels

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
    const level = UNDER + (BETWEEN - UNDER) * (u * u * (3 - 2 * u));
    const fade = Math.min(interpolate(t, [0, 2], [0, 1], { extrapolateRight: "clamp" }), interpolate(t, [total - 3, total], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return level * fade;
  };
  return <Audio src={staticFile("music/budding-of-consciousness.mp3")} trimBefore={frames(t0)} volume={volume} />;
}
