import type { ComponentType } from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame } from "remotion";
import { BEATS, frames, startOf, XFADE } from "./config";
import { Captions } from "./lib/Captions";
import { Music, Voice } from "./lib/Sound";
import { B03Listing } from "./scenes/B03Listing";
import { B04AgentBuys } from "./scenes/B04AgentBuys";
import { c, sans } from "./theme";

// The v2 cut (DEMO-SCRIPT v6, D-110). Beats follow one another with a short crossfade: the new beat fades in over the
// held last frame of the one before. `only` renders a subset (the preview of beats 3-4).
const SCENES: Record<number, ComponentType> = { 3: B03Listing, 4: B04AgentBuys };

export function MainV2({ only }: { only?: number[] }) {
  const beats = BEATS.filter((b) => !only || only.includes(b.n));
  const t0 = startOf(beats[0]!.n);
  return (
    <AbsoluteFill style={{ background: c.paper }}>
      {beats.map((b, i) => {
        const S = SCENES[b.n] ?? placeholder(b.n, b.id);
        const prev = beats[i - 1];
        const P = prev ? (SCENES[prev.n] ?? placeholder(prev.n, prev.id)) : null;
        return (
          <Sequence key={b.n} from={frames(startOf(b.n) - t0)} durationInFrames={frames(b.sec)} name={`${b.n} ${b.id}`}>
            {P && prev && (
              <Sequence durationInFrames={frames(XFADE)} layout="none">
                <Freeze frame={frames(prev.sec) - 1}>
                  <P />
                </Freeze>
              </Sequence>
            )}
            <FadeIn frames={P ? frames(XFADE) : 0}>
              <S />
            </FadeIn>
            <Voice n={b.n} />
            <Captions n={b.n} />
          </Sequence>
        );
      })}
      <Music only={only} />
    </AbsoluteFill>
  );
}

function FadeIn({ frames: n, children }: { frames: number; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const o = n ? interpolate(f, [0, n], [0, 1], { extrapolateRight: "clamp" }) : 1;
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

const cache: Record<number, ComponentType> = {};
function placeholder(n: number, id: string): ComponentType {
  return (cache[n] ??= () => (
    <AbsoluteFill style={{ background: c.paper, justifyContent: "center", alignItems: "center", fontFamily: sans, fontSize: 56, color: c.ink2 }}>
      Beat {n} · {id} (v2 not built yet)
    </AbsoluteFill>
  ));
}

export const lengthOf = (only?: number[]) => BEATS.filter((b) => !only || only.includes(b.n)).reduce((s, b) => s + b.sec, 0);
