import { AbsoluteFill, Sequence } from "remotion";
import clip from "../../../public/clips/split-shop.json";
import type { Clip } from "../../lib/clip";
import { beat, frames } from "../config";
import { Footage, Still } from "../lib/Footage";
import { Window } from "../lib/Window";

// Beat 4, an agent buys (v6): the real /capture split, still and full-frame (a push-in would cut through the other
// panel). The shopper's request, the agent working on the live wire, the checkout card with the shop's total, Pay
// with PayPal; PayPal's own window in order (its login page, then the review screen held with $41.00, Complete
// Purchase); the card clearly Paid; then PayPal's capture webhook arriving, signature verified.
const C = clip as Clip;
const POP = 16.35; // PayPal's window opens (beat seconds): capture 19.65, after the press, before PayPal dims the page
const POP_END = 20.85;

export function B04AgentBuys() {
  const end = beat(4).sec;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={frames(POP)}>
        <Footage
          clip={C}
          end={POP}
          cuts={[
            { at: 0, from: 2.4 }, // she types the request; sent at 6.89; the agent works, the wire fills
            { at: 9.6, from: 12.9 }, // the checkout card lands (13.61); Pay with PayPal (19.58)
          ]}
          spots={[
            { t0: 0.4, t1: 4.7, box: { x: 37, y: 827, width: 726, height: 44 } }, // the request
            { t0: 6.9, t1: 9.5, box: { x: 822, y: 340, width: 744, height: 556 } }, // the live wire: search, get_product
            { t0: 10.5, t1: 14.3, box: { x: 41, y: 411, width: 672, height: 318 } }, // the card: the shop's total
            { t0: 14.3, t1: 16.3, box: { x: 61, y: 560, width: 225, height: 45 }, pad: 8 }, // Pay with PayPal
          ]}
        />
      </Sequence>
      <Sequence from={frames(POP)} durationInFrames={frames(POP_END - POP)}>
        <Still clip={C} at={19.65} />
        <Window
          clip={C}
          track="paypal"
          end={POP_END - POP}
          cuts={[
            { at: 0, from: 22.4 }, // PayPal's own login page (the sandbox buyer's login is cut)
            { at: 1.4, from: 36.0 }, // the review screen, $41.00; Complete Purchase at 38.27
          ]}
          soften={[{ x: 48, y: 318, width: 58, height: 40 }]}
        />
      </Sequence>
      <Sequence from={frames(POP_END)} durationInFrames={frames(end - POP_END)}>
        <Footage
          clip={C}
          end={end - POP_END}
          cuts={[
            { at: 0, from: 42.85 }, // back from PayPal: the card is Paid
            { at: 3.75, from: 68.9 }, // PayPal's capture webhook arrives (69.89), signature verified
          ]}
          spots={[
            { t0: 0.3, t1: 3.5, box: { x: 41, y: 373, width: 672, height: 464 } }, // Paid
            { t0: 4.7, t1: 6.6, box: { x: 836, y: 384, width: 716, height: 80 } }, // PAYMENT.CAPTURE.COMPLETED, verified
            { t0: 6.6, t1: 8.0, box: { x: 72, y: 600, width: 330, height: 26 }, pad: 8 }, // on the buyer's card too
          ]}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
