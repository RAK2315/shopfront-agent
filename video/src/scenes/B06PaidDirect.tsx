import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from "remotion";
import cart from "../../public/clips/cart-agent.json";
import fern from "../../public/clips/live-fern.json";
import getPaid from "../../public/clips/get-paid.json";
import { frames, say } from "../config";
import type { Clip } from "../lib/clip";
import { Footage, segsLength, type Seg } from "../lib/Footage";
import { Rise, useEnter } from "../lib/motion";
import { c, ease, FPS, mono, ui } from "../theme";

// Beat 6, Paid directly · any agent · Store Sync (17 s): Log in with PayPal → Verified by PayPal (real take); a Fern &
// Loom order "paid directly to Fern & Loom's PayPal" on the live wire (real take); then PayPal's own Cart API client
// run against the live store, its real output replayed as a terminal (apps/web/scripts/video-cart.mts, D-109).
const G: Seg[] = [
  { from: 0.6, to: 2.9 }, // the Get paid card; "Try Log in with PayPal" at 2.76
  { from: 6.6, to: 12.0, rate: 4, label: "4× speed" }, // PayPal's own login page, the sandbox account
  { from: 65.9, to: 67.6 }, // back: "Verified by PayPal" with the account id
];
const F: Seg[] = [{ from: 94.0, to: 95.8 }];
const lenG = segsLength(G);
const lenF = segsLength(F);

export function B06PaidDirect() {
  const tTerm = lenG + lenF;
  return (
    <AbsoluteFill style={{ background: c.panel }}>
      <Sequence durationInFrames={frames(lenG)}>
        <Footage
          clip={getPaid as Clip}
          segs={G}
          cams={[
            { t: 0, zoom: 1.25, x: 760, y: 330 },
            { t: 2.2, zoom: 1.25, x: 900, y: 320 },
            { t: 2.35, zoom: 1.0, x: 720, y: 405 },
            { t: 3.6, zoom: 1.0, x: 720, y: 405 },
            { t: 3.7, zoom: 1.45, x: 640, y: 380 },
          ]}
          rings={[{ t0: 3.85, t1: 5.3, box: { x: 157, y: 351, width: 1111, height: 46 } }]}
        />
      </Sequence>
      <Sequence from={frames(lenG)} durationInFrames={frames(lenF)}>
        <Footage clip={fern as Clip} segs={F} cams={[{ t: 0, zoom: 1.65, x: 380, y: 610 }, { t: lenF, zoom: 1.75, x: 400, y: 620 }]} rings={[{ t0: 0.3, t1: lenF, box: { x: 84, y: 652, width: 228, height: 20 } }]} />
      </Sequence>
      <Sequence from={frames(tTerm)}>
        <Terminal />
      </Sequence>
    </AbsoluteFill>
  );
}

type Line = { t: number; text: string; tone?: string };
const SKIP_FROM = 4; // PayPal approval by the sandbox buyer (real ~14.6 s) is skipped and labelled

function Terminal() {
  const f = useCurrentFrame();
  const s = f / FPS;
  const lines = (cart as { lines: Line[] }).lines;
  // Real timestamps → on-screen times: the command types first; the long wait for the buyer's approval is cut.
  const start = 0.35;
  const typeEnd = start + 0.9;
  const shown = lines.map((l, i) => {
    if (i === 0) return { ...l, at: start };
    const real = l.t > SKIP_FROM ? l.t - 14.6 + 0.9 : l.t;
    return { ...l, at: typeEnd + 0.15 + real * 0.62 };
  });
  const enter = useEnter(0, 16);
  const tMismatch = shown.find((l) => l.text.includes("PRICE_MISMATCH"))!.at;
  const tSync = say(6, "So") - (tTermStart());
  const push = interpolate(s, [tMismatch + 0.2, tMismatch + 0.9, tMismatch + 2.6, tMismatch + 3.3], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.camera });
  const zoom = 1 + 0.32 * push + 0.004 * s;
  const fy = 540 + (440 - 540) * push;
  const fx = 960 + (760 - 960) * push;
  return (
    <AbsoluteFill style={{ background: "oklch(0.16 0.01 45)", overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${960 - fx * zoom}px, ${540 - fy * zoom}px) scale(${zoom})` }}>
        <div style={{ position: "absolute", left: 190, top: 120, width: 1540, height: 700, opacity: Math.min(1, enter * 1.4), transform: `translateY(${(1 - enter) * 40}px)`, borderRadius: 20, background: c.panel, border: `1px solid ${c.panelLine}`, boxShadow: "0 30px 80px rgb(0 0 0 / 0.45)", overflow: "hidden" }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: `1px solid ${c.panelLine}`, fontFamily: ui, fontSize: 20, color: c.panelMuted }}>
            <span style={{ display: "flex", gap: 8 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: c.panelLine }} />)}</span>
            <span style={{ marginLeft: 8 }}>PayPal's own Cart API client → Juniper Clay Studio, live · real output</span>
          </div>
          <div style={{ padding: "26px 30px", fontFamily: mono, fontSize: 25, lineHeight: 1.62, color: c.panelText, whiteSpace: "pre" }}>
            {shown.map((l, i) => {
              if (s < l.at) return null;
              const age = (s - l.at) * FPS;
              const o = interpolate(age, [0, 6], [0, 1], { extrapolateRight: "clamp" });
              let text = l.text;
              if (i === 0) text = l.text.slice(0, Math.max(0, Math.round(interpolate(s, [start, typeEnd], [0, l.text.length], { extrapolateRight: "clamp" }))));
              const color = l.tone === "cmd" ? c.panelText : l.tone === "issue" ? "oklch(0.8 0.14 75)" : l.tone === "ok" ? "oklch(0.78 0.14 150)" : c.panelMuted;
              return (
                <div key={i} style={{ opacity: o, color }}>
                  {l.tone === "cmd" ? <span style={{ color: c.clay }}>{text.slice(0, 2)}</span> : null}
                  {l.tone === "cmd" ? text.slice(2) : text}
                  {i === 6 && s > shown[7]!.at - 0.05 && <div style={{ color: c.panelMuted, opacity: 0.8, fontFamily: ui, fontSize: 21, padding: "2px 0" }}>· · · the sandbox buyer approves in PayPal (14.6 s, cut)</div>}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Rise at={tSync} style={{ position: "absolute", left: 0, right: 0, top: 850, display: "flex", justifyContent: "center" }}>
        <div style={{ fontFamily: ui, fontSize: 30, fontWeight: 600, color: c.panelText, background: "oklch(0.56 0.14 40 / 0.22)", border: `1px solid ${c.clay}`, padding: "10px 24px", borderRadius: 999 }}>Every store: Store-Sync-ready on PayPal's Cart API</div>
      </Rise>
    </AbsoluteFill>
  );
}

/** Where the terminal starts within the beat (seconds). */
function tTermStart() {
  return segsLength(G) + segsLength(F);
}
