import { AbsoluteFill, interpolate, Sequence } from "remotion";
import cart from "../../../public/clips/cart-agent.json";
import fern from "../../../public/clips/live-fern.json";
import getPaid from "../../../public/clips/get-paid.json";
import type { Clip } from "../../lib/clip";
import { beat, frames } from "../config";
import { Footage } from "../lib/Footage";
import { Spotlights } from "../lib/Spotlight";
import { FadeFrom, useIn, useSec } from "../lib/Text";
import { c, FPS, mono, sans } from "../theme";

// Beat 6, paid directly and the Cart API (v6). Real takes, still and full-frame: Log in with PayPal → PayPal's own login
// page → "Verified by PayPal"; the live wire's Fern & Loom order, "paid directly to Fern & Loom's PayPal". Then PayPal's
// own Cart API client run against the live store (apps/web/scripts/video-cart.mts, D-109): its real output, replayed
// line by line at its real pace, with the two waits (the agent's search and the buyer's approval in PayPal) cut.
const T_FERN = 5.3;
const T_TERM = 7.4;

export function B06PaidDirect() {
  const end = beat(6).sec;
  return (
    <AbsoluteFill style={{ background: c.panel }}>
      <Sequence durationInFrames={frames(T_FERN)}>
        <Footage
          clip={getPaid as Clip}
          end={T_FERN}
          cuts={[
            { at: 0, from: 1.6 }, // the Get paid card; "Try Log in with PayPal" pressed at 2.76
            { at: 1.75, from: 6.2 }, // PayPal's own login page (the sandbox login itself is cut)
            { at: 2.9, from: 65.85 }, // back: "Verified by PayPal" with the account id (66.14)
          ]}
          spots={[{ t0: 3.35, t1: 5.1, box: { x: 157, y: 351, width: 1111, height: 46 } }]}
        />
      </Sequence>
      <Sequence from={frames(T_FERN)} durationInFrames={frames(T_TERM - T_FERN)}>
        <Footage clip={fern as Clip} end={T_TERM - T_FERN} cuts={[{ at: 0, from: 97.6 }]} spots={[{ t0: 0.25, t1: 2.0, box: { x: 44, y: 620, width: 920, height: 84 } }]} />
      </Sequence>
      <Sequence from={frames(T_TERM)} durationInFrames={frames(end - T_TERM)}>
        <FadeFrom at={0} dur={0.3}>
          <Terminal />
        </FadeFrom>
      </Sequence>
    </AbsoluteFill>
  );
}

type Line = { t: number; text: string; tone?: string };
const X = 160;
const Y = 110;
const LINE = 40;
const top = (i: number) => Y + 56 + 26 + i * LINE;

/** Real seconds of the run → seconds of this shot. The agent's search (about 2 s) and the buyer's approval in PayPal
 * (about 14.6 s) are cut; everything else keeps its real pace. */
function shotTime(real: number) {
  if (real <= 0) return 0.3;
  if (real < 10) return 1.5 + (real - 2.025);
  return 4.05 + (real - 18.398);
}

function Terminal() {
  const s = useSec();
  const lines = (cart as { lines: Line[] }).lines;
  const enter = useIn(0, 0.45);
  const typed = interpolate(s, [0.3, 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spots = [
    { t0: 3.6, t1: 6.5, box: { x: X + 18, y: top(2) - 2, width: 1564, height: LINE * 4 + 2 }, pad: 0 }, // PRICE_MISMATCH → ACCEPT_NEW_PRICE → VALID
    { t0: 6.55, t1: 8.1, box: { x: X + 18, y: top(9) - 2, width: 1564, height: LINE * 2 + 2 }, pad: 0 }, // checkout COMPLETED at the shop's price
  ];
  return (
    <AbsoluteFill style={{ background: "oklch(0.16 0.01 45)" }}>
      <div style={{ position: "absolute", left: X, top: Y, width: 1600, height: 690, opacity: enter, transform: `translateY(${(1 - enter) * 16}px)`, borderRadius: 20, background: c.panel, border: `1px solid ${c.panelLine}`, boxShadow: "0 30px 80px rgb(0 0 0 / 0.45)", overflow: "hidden" }}>
        <div style={{ height: 56, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: `1px solid ${c.panelLine}`, fontFamily: sans, fontSize: 23, color: c.panelText }}>
          <span style={{ display: "flex", gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: c.panelLine }} />
            ))}
          </span>
          <span style={{ marginLeft: 8, fontWeight: 500 }}>PayPal's own Cart API client, buying from Juniper Clay Studio's live store</span>
          <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 500, color: c.panelText, border: `1px solid ${c.panelMuted}`, borderRadius: 999, padding: "3px 14px" }}>Real output, replayed</span>
        </div>
        <div style={{ position: "absolute", left: 34, top: 56 + 26, fontFamily: mono, fontSize: 24, lineHeight: `${LINE}px`, color: c.panelText, whiteSpace: "pre" }}>
          {lines.map((l, i) => {
            const at = shotTime(l.t);
            if (s < at) return null;
            const o = interpolate((s - at) * FPS, [0, 5], [0, 1], { extrapolateRight: "clamp" });
            const text = i === 0 ? l.text.slice(0, Math.round(typed * l.text.length)) : l.text;
            const color = l.tone === "issue" ? "oklch(0.82 0.13 75)" : l.tone === "ok" ? "oklch(0.8 0.14 150)" : l.tone === "cmd" ? c.panelText : "oklch(0.8 0.01 45)";
            return (
              <div key={i} style={{ opacity: o, color, height: LINE }}>
                {l.tone === "cmd" ? (
                  <>
                    <span style={{ color: c.clay }}>{text.slice(0, 2)}</span>
                    {text.slice(2)}
                  </>
                ) : (
                  text
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Spotlights spots={spots} />
    </AbsoluteFill>
  );
}
