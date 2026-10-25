import { AbsoluteFill, Sequence } from "remotion";
import over from "../../public/clips/dashboard-overview.json";
import report from "../../public/clips/dashboard-report.json";
import { frames } from "../config";
import type { Clip } from "../lib/clip";
import { Footage, segsLength, type Seg } from "../lib/Footage";

// Beat 8, Dashboard (36 s, the AG Grid prize beat): real takes of /studio/dashboard at 1600 × 900. Overview on AG
// Grid: group by product, a click opens an order's PayPal history, a live sale slides in, Ask "unshipped orders over
// $50" with one-click Undo. Report on AG Studio: five pages, the Shop Manager's sourced answer ([db] and [paypal]),
// a refused refund, an AI change tagged AI + Undo, Reconciled with PayPal. The voice plays continuously; segments are
// cut so each phrase lands on its moment.
const OVER: Seg[] = [
  { from: 1.0, to: 3.0 }, // the overview: KPIs, the orders grid, the chart
  { from: 3.0, to: 5.9 }, // Group: product (pressed at 3.17)
  { from: 10.6, to: 14.8, rate: 1.6, label: "1.6× speed" }, // a click on an order → its PayPal history
  { from: 58.2, to: 60.0 }, // a sale from another window slides in at the top, no reload
  { from: 62.9, to: 70.6, rate: 1.8, label: "1.8× speed" }, // Ask: "unshipped orders over $50" → view + banner
  { from: 72.8, to: 74.8, rate: 1.25, label: "1.25× speed" }, // Undo
];
const REPORT: Seg[] = [
  { from: 1.6, to: 13.4, rate: 2.4, label: "2.4× speed" }, // five report pages
  { from: 15.2, to: 18.4, rate: 2, label: "2× speed" }, // "What sold this week?"
  { from: 24.4, to: 27.9 }, // the answer: [db] … [paypal] …
  { from: 34.4, to: 38.5, rate: 2.5, label: "2.5× speed" }, // "Refund order … in full right now."
  { from: 44.6, to: 47.6 }, // a polite no: no tool moves money
  { from: 51.3, to: 55.6, rate: 3, label: "3× speed" }, // "Add a donut chart of refunds by reason"
  { from: 62.0, to: 63.7 }, // the change strip, tagged AI
  { from: 67.2, to: 68.3 }, // Undo all
  { from: 70.0, to: 71.9 }, // Reconciled with PayPal ✓
];
const lenOver = segsLength(OVER);

export function B08Dashboard() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={frames(lenOver)}>
        <Footage
          clip={over as Clip}
          segs={OVER}
          cams={[
            { t: 0, zoom: 1.0, x: 800, y: 450 },
            { t: 2.0, zoom: 1.05, x: 800, y: 470 },
            { t: 3.2, zoom: 1.25, x: 560, y: 640 },
            { t: 4.9, zoom: 1.25, x: 560, y: 650 },
            { t: 5.3, zoom: 1.3, x: 560, y: 700 },
            { t: 7.4, zoom: 1.3, x: 560, y: 700 },
            { t: 7.6, zoom: 1.3, x: 560, y: 610 },
            { t: 9.3, zoom: 1.3, x: 560, y: 610 },
            { t: 9.6, zoom: 1.25, x: 800, y: 280 },
            { t: 11.9, zoom: 1.25, x: 800, y: 280 },
            { t: 12.6, zoom: 1.12, x: 760, y: 430 },
            { t: 13.6, zoom: 1.2, x: 1060, y: 350 },
          ]}
          rings={[
            { t0: 7.9, t1: 9.3, box: { x: 45, y: 568, width: 978, height: 52 } },
            { t0: 12.7, t1: 13.6, box: { x: 49, y: 250, width: 1487, height: 86 } },
          ]}
        />
      </Sequence>
      <Sequence from={frames(lenOver)}>
        <Footage
          clip={report as Clip}
          segs={REPORT}
          cams={[
            { t: 0, zoom: 1.0, x: 800, y: 450 },
            { t: 4.9, zoom: 1.06, x: 760, y: 430 },
            { t: 5.6, zoom: 1.6, x: 360, y: 640 },
            { t: 6.9, zoom: 1.6, x: 360, y: 640 },
            { t: 7.5, zoom: 1.85, x: 360, y: 690 },
            { t: 14.5, zoom: 1.85, x: 360, y: 700 },
            { t: 15.4, zoom: 1.0, x: 800, y: 450 },
            { t: 17.8, zoom: 1.0, x: 800, y: 450 },
            { t: 18.2, zoom: 1.3, x: 1200, y: 300 },
            { t: 18.9, zoom: 1.3, x: 1200, y: 300 },
            { t: 19.6, zoom: 1.8, x: 904, y: 260 },
          ]}
          rings={[
            { t0: 7.4, t1: 10.0, box: { x: 40, y: 676, width: 332, height: 64 } },
            { t0: 12.4, t1: 14.6, box: { x: 40, y: 696, width: 332, height: 64 } },
            { t0: 16.2, t1: 17.8, box: { x: 16, y: 176, width: 1568, height: 78 } },
            { t0: 19.9, t1: 20.8, box: { x: 802, y: 67, width: 204, height: 44 } },
          ]}
        />
      </Sequence>
    </AbsoluteFill>
  );
}
