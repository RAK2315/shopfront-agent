import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BEATS, frames, startOf, voTimeline } from "./config";
import { Captions } from "./lib/Caption";
import { BeatFrame } from "./lib/motion";
import { B01Hook } from "./scenes/B01Hook";
import { B02Promise } from "./scenes/B02Promise";
import { B03Listing } from "./scenes/B03Listing";
import { B04AgentBuys } from "./scenes/B04AgentBuys";
import { B05Phone } from "./scenes/B05Phone";
import { B06PaidDirect } from "./scenes/B06PaidDirect";
import { B07Gauntlet } from "./scenes/B07Gauntlet";
import { B08Dashboard } from "./scenes/B08Dashboard";
import { B09Trust } from "./scenes/B09Trust";
import { B10Close } from "./scenes/B10Close";
import { c } from "./theme";

// The demo video: ten beats (DEMO-SCRIPT v5.1, D-108), each with its own voiceover file and one-line captions.
const SCENES: Record<number, { C: ComponentType; dark?: boolean }> = {
  1: { C: B01Hook, dark: false },
  2: { C: B02Promise },
  3: { C: B03Listing },
  4: { C: B04AgentBuys },
  5: { C: B05Phone },
  6: { C: B06PaidDirect },
  7: { C: B07Gauntlet },
  8: { C: B08Dashboard },
  9: { C: B09Trust },
  10: { C: B10Close },
};

export function registerScene(n: number, C: ComponentType, dark = false) {
  SCENES[n] = { C, dark };
}

export function Main() {
  return (
    <AbsoluteFill style={{ background: c.canvas }}>
      {BEATS.map((b) => {
        const S = SCENES[b.n];
        return (
          <Sequence key={b.n} from={frames(startOf(b.n))} durationInFrames={frames(b.sec)} name={`${b.n} ${b.id}`}>
            <BeatFrame sec={b.sec} bg={c.canvas}>
              {S ? <S.C /> : <Placeholder n={b.n} />}
            </BeatFrame>
            {voTimeline(b.n).parts.map((p, k) => (
              <Sequence key={k} from={frames(p.at)} layout="none">
                <Audio src={staticFile(`voice/beat-${String(b.n).padStart(2, "0")}.mp3`)} trimBefore={frames(p.from)} trimAfter={frames(p.to)} />
              </Sequence>
            ))}
            <Captions beat={b.n} dark={S?.dark} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function Placeholder({ n }: { n: number }) {
  return <AbsoluteFill style={{ background: c.surface2, justifyContent: "center", alignItems: "center", fontSize: 60, color: c.muted }}>Beat {n}</AbsoluteFill>;
}
