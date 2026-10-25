import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import clip from "../../public/clips/split-shop.json";
import { frames } from "../config";
import type { Clip } from "../lib/clip";
import { Footage, segsLength, type Seg } from "../lib/Footage";
import { useProgress } from "../lib/motion";
import { Popup } from "../lib/Popup";
import { Shot } from "../lib/Shot";

// Beat 4, An agent buys (24 s): the real /capture split (shopper's agent left, live wire right), PayPal's own popup
// for the human's approval, then the paid card and the signature-verified webhook on the wire.
const C = clip as Clip;
const A: Seg[] = [
  { from: 3.0, to: 9.6, rate: 1.5, label: "1.5× speed" }, // the shopper types the request; send at 9.36
  { from: 9.6, to: 16.0 }, // search_products → get_product → create_checkout; the card lands at 13.9
  { from: 60.8, to: 62.6 }, // the PayPal button is ready; the human presses it at 62.34
];
const POP = { from: 95.8, dur: 3.4 }; // PayPal's review window; Complete Purchase at 98.3
const B: Seg[] = [
  { from: 99.5, to: 104.0, rate: 1.5, label: "1.5× speed" }, // PayPal confirms; capture
  { from: 104.0, to: 109.0 }, // the card is paid; the webhook, signature verified, on the wire
];
const lenA = segsLength(A); // 12.6
const lenB = segsLength(B);

export function B04AgentBuys() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={frames(lenA)}>
        <Footage
          clip={C}
          segs={A}
          cams={[
            { t: 0, zoom: 1, x: 800, y: 450 },
            { t: 0.9, zoom: 1.3, x: 400, y: 640 },
            { t: 4.3, zoom: 1.3, x: 400, y: 640 },
            { t: 5.2, zoom: 1.18, x: 1180, y: 420 },
            { t: 8.0, zoom: 1.18, x: 1180, y: 460 },
            { t: 8.7, zoom: 1.0, x: 800, y: 450 },
            { t: 9.6, zoom: 1.75, x: 560, y: 500 },
            { t: 10.9, zoom: 1.75, x: 560, y: 500 },
            { t: 11.7, zoom: 1.3, x: 330, y: 560 },
          ]}
          rings={[{ t0: 9.7, t1: 11.2, box: { x: 572, y: 468, width: 128, height: 52 } }]}
        />
      </Sequence>
      <Sequence from={frames(lenA)} durationInFrames={frames(POP.dur)}>
        <Freeze frame={0}>
          <Shot clip={C} from={62.6} dur={0.1} cams={[{ t: 0, zoom: 1.3, x: 330, y: 560 }]} cursor={false} />
        </Freeze>
        <Dim />
        <Popup clip={C} track="paypal" from={POP.from} dur={POP.dur} soften={[{ x: 44, y: 255, width: 64, height: 112 }]} />
      </Sequence>
      <Sequence from={frames(lenA + POP.dur)} durationInFrames={frames(lenB)}>
        <Footage
          clip={C}
          segs={B}
          cams={[
            { t: 0, zoom: 1.0, x: 800, y: 450 },
            { t: 2.6, zoom: 1.0, x: 800, y: 450 },
            { t: 3.4, zoom: 1.5, x: 1120, y: 540 },
            { t: 6.3, zoom: 1.5, x: 1120, y: 540 },
            { t: 7.6, zoom: 1.02, x: 800, y: 450 },
          ]}
        />
      </Sequence>
    </AbsoluteFill>
  );
}

function Dim() {
  const f = useCurrentFrame();
  const o = useProgress(0, 0.35);
  void f;
  return <AbsoluteFill style={{ background: `oklch(0.15 0.01 45 / ${0.45 * o})` }} />;
}
