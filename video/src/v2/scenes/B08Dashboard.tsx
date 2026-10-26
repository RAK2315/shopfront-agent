import { AbsoluteFill, Sequence } from "remotion";
import over from "../../../public/clips/dashboard-overview.json";
import report from "../../../public/clips/dashboard-report.json";
import type { Clip } from "../../lib/clip";
import { beat, frames } from "../config";
import { Footage } from "../lib/Footage";

// Beat 8, her dashboard (v6, the AG Grid prize beat). Real takes of /studio/dashboard, still and full-frame, waits cut.
// 1. AG Grid: group by product (the grid regroups with subtotals), then a click on an order opens its full PayPal
//    history. 2. Ask "unshipped orders over $50": the grid filters itself and says what changed; one click on Undo
//    restores it. 3. AG Studio: the Shop Manager answers from her database and from PayPal, each number tagged with its
//    source; asked to refund an order, it says no (it has no tool that moves money). It ends on Reconciled with PayPal.
const T_REPORT = 19.2;

export function B08Dashboard() {
  const end = beat(8).sec;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={frames(T_REPORT)}>
        <Footage
          clip={over as Clip}
          end={T_REPORT}
          cuts={[
            { at: 0, from: 1.2 }, // the overview at rest: KPIs, the orders grid, the chart
            { at: 1.2, from: 1.2 }, // (the same still page, repeated so the press on Group lands on its words)
            { at: 2.4, from: 1.2 }, // Group: product (pressed at 3.17)
            { at: 6.2, from: 10.6 }, // a click on an order (11.51) → its PayPal history (12.5)
            { at: 10.8, from: 63.6 }, // Ask: she types "unshipped orders over $50", sends (66.2) → filtered, with a banner
            { at: 16.6, from: 73.2 }, // Undo (73.94) → the full grid is back
          ]}
          spots={[
            { t0: 0.9, t1: 3.4, box: { x: 20, y: 470, width: 1022, height: 430 } }, // the AG Grid
            { t0: 4.65, t1: 6.1, box: { x: 20, y: 470, width: 1022, height: 150 } }, // grouped by product, subtotal
            { t0: 8.2, t1: 10.6, box: { x: 36, y: 556, width: 996, height: 344 } }, // the order's PayPal history
            { t0: 14.6, t1: 16.5, box: { x: 40, y: 240, width: 1516, height: 96 } }, // the view changed, and how; Undo
          ]}
        />
      </Sequence>
      <Sequence from={frames(T_REPORT)} durationInFrames={frames(end - T_REPORT)}>
        <Footage
          clip={report as Clip}
          end={end - T_REPORT}
          cuts={[
            { at: 0, from: 16.9 }, // AG Studio: "What sold this week?" being typed; sent at 18.19
            { at: 1.8, from: 24.75 }, // the answer, [db] and [paypal] (24.96)
            { at: 6.7, from: 37.2 }, // "Refund order … in full right now."; sent at 38.25
            { at: 8.2, from: 44.75 }, // the polite no (44.96)
          ]}
          spots={[
            { t0: 2.1, t1: 6.6, box: { x: 16, y: 585, width: 372, height: 185 } },
            { t0: 8.5, t1: 10.9, box: { x: 16, y: 620, width: 372, height: 145 } },
            { t0: 11.1, t1: 13.4, box: { x: 802, y: 67, width: 204, height: 44 } }, // Reconciled with PayPal
          ]}
          loupes={[
            { t0: 2.3, t1: 6.5, box: { x: 16, y: 585, width: 372, height: 185 }, x: 580, y: 300, scale: 1.9 },
            { t0: 8.6, t1: 10.8, box: { x: 16, y: 620, width: 372, height: 145 }, x: 580, y: 340, scale: 1.9 },
          ]}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
