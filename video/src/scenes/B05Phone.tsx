import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import dash from "../../public/clips/dashboard-overview.json";
import store from "../../public/clips/storefront-phone.json";
import { COPY, frames, say } from "../config";
import type { Clip } from "../lib/clip";
import { Rise, useEnter, useExit } from "../lib/motion";
import { c, ease, FPS, mono, ui } from "../theme";
import { Phone } from "./parts";

// Beat 5, Seller on her phone (18 s). The chat strip is rebuilt in code from a real bot session
// (docs/screenshots/telegram/transcript-2026-10-24T20-50-27-466Z.json, a practice shop), labelled as such, with no
// messaging-app interface or logo (D-073, S6.4). Amounts are the transcript's. Then a real dashboard detail and a
// 2 s cut to the real storefront at phone width.
type Msg = { at: number; from: "bot" | "me"; body: ReactNode; buttons?: string[]; tap?: { at: number; i: number } };

export function B05Phone() {
  const tPing = say(5, "order") - 0.1;
  const tLabel = say(5, "snaps");
  const tRefund = say(5, "refund");
  const tSmall = say(5, "Small");
  const msgs: Msg[] = [
    { at: tPing, from: "bot", body: <><b>Order paid · $37.00</b><br />1 × Practice copper-red cup<br /><span style={{ color: c.ink2 }}>PayPal: payment confirmed. Send me a photo of the shipping label and I'll add tracking to the PayPal order.</span></> },
    { at: tLabel, from: "me", body: <LabelPhoto /> },
    { at: tLabel + 0.9, from: "bot", body: <><b>USPS 9400111899227902320212</b><br />Add it to the order for 1 × Practice copper-red cup ($37.00)?</>, buttons: ["Add tracking"], tap: { at: tLabel + 1.9, i: 0 } },
    { at: tLabel + 2.4, from: "bot", body: <><b>Tracking added</b><br />It's on the PayPal order, and the buyer has a note on their order page.</> },
    { at: tRefund - 0.1, from: "bot", body: <><b>Refund request · $37.00</b><br />1 × Practice copper-red cup<br />Reason: damaged<br /><span style={{ color: c.ink2 }}>Why you: this buyer already had automatic refunds this month. The amount was computed by the server.</span></>, buttons: ["Refund $37.00", "Decline"], tap: { at: tRefund + 1.9, i: 0 } },
    { at: tRefund + 2.4, from: "bot", body: <><b>Refund approved and sent.</b><br />PayPal returned the money to the buyer.</> },
  ];
  const f = useCurrentFrame();
  const s = f / FPS;
  const slide = interpolate(s, [tSmall - 0.2, tSmall + 0.7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.camera });
  return (
    <AbsoluteFill style={{ background: c.surface2, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 750 - 300 * slide, top: 118, transform: `translateY(${(1 - useEnter(0, 16)) * 900}px)` }}>
        <Phone width={420} height={820}>
          <Chat msgs={msgs} />
        </Phone>
        <Rise at={0.6} style={{ position: "absolute", left: -100, right: -100, top: -62, display: "flex", justifyContent: "center" }}>
          <div style={{ fontFamily: ui, fontSize: 21, color: c.ink2, background: c.surface, border: `1px solid ${c.line}`, padding: "6px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>{COPY.rebuilt}</div>
        </Rise>
      </div>
      {s > tSmall - 0.3 && <Policy at={tSmall} out={tSmall + 1.9} />}
      <Sequence from={frames(tSmall + 2.1)} layout="none">
        <Storefront />
      </Sequence>
    </AbsoluteFill>
  );
}

function Chat({ msgs }: { msgs: Msg[] }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  return (
    <AbsoluteFill style={{ fontFamily: ui, background: c.canvas }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 108, padding: "56px 20px 0", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${c.line}`, background: c.surface, zIndex: 2 }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: c.claySoft, display: "grid", placeItems: "center", color: c.clay, fontWeight: 700 }}>S</div>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: c.ink }}>Shop assistant</div>
          <div style={{ fontSize: 15, color: c.muted }}>practice shop · sandbox</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 108, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, padding: "14px 14px 22px", overflow: "hidden" }}>
        {msgs.filter((m) => s >= m.at).map((m, i) => {
          const age = (s - m.at) * FPS;
          const grow = interpolate(age, [0, 9], [0, 1], { extrapolateRight: "clamp", easing: ease.out });
          return (
            <div key={i} style={{ maxHeight: grow * 420, opacity: Math.min(1, grow * 1.6), transform: `translateY(${(1 - grow) * 14}px)`, alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "88%", flexShrink: 0, overflow: "visible" }}>
              <div style={{ background: m.from === "me" ? c.claySoft : c.surface, border: `1px solid ${m.from === "me" ? "oklch(0.88 0.05 40)" : c.line}`, borderRadius: m.from === "me" ? "18px 18px 6px 18px" : "18px 18px 18px 6px", padding: m.from === "me" ? 6 : "11px 14px", fontSize: 17, lineHeight: 1.38, color: c.ink }}>
                {m.body}
              </div>
              {m.buttons && (
                <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
                  {m.buttons.map((b, k) => {
                    const tapAge = m.tap && m.tap.i === k ? (s - m.tap.at) * FPS : -1;
                    const pressed = tapAge >= 0;
                    const sc = tapAge >= 0 && tapAge < 8 ? interpolate(tapAge, [0, 4, 8], [1, 0.96, 1]) : 1;
                    return (
                      <div key={b} style={{ position: "relative", flex: 1, textAlign: "center", fontSize: 16, fontWeight: 600, padding: "9px 12px", borderRadius: 12, border: `1.5px solid ${pressed ? c.clay : c.line}`, background: pressed ? c.clay : c.surface, color: pressed ? "#fff" : c.ink, transform: `scale(${sc})` }}>
                        {b}
                        {tapAge >= 0 && tapAge < 18 && <Tap age={tapAge} />}
                      </div>
                    );
                  })}
                </div>
              )}
              {m.tap && (
                <Sequence from={Math.round((m.tap.at - m.at) * FPS)} durationInFrames={12} layout="none">
                  <Audio src={staticFile("sfx/click.wav")} volume={0.22} />
                </Sequence>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/** A fingertip tap: a soft circle that presses and fades. */
function Tap({ age }: { age: number }) {
  const r = interpolate(age, [0, 18], [14, 40], { easing: ease.out });
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", background: "rgb(255 255 255 / 0.35)", border: "2px solid rgb(255 255 255 / 0.8)", opacity: interpolate(age, [0, 18], [0.9, 0]) }} />;
}

/** The label photo the seller sent, drawn as a plain shipping label (no carrier branding). */
function LabelPhoto() {
  return (
    <div style={{ width: 220, height: 150, borderRadius: 12, background: "oklch(0.9 0.03 75)", padding: 12, transform: "rotate(-2deg)" }}>
      <div style={{ background: "#fff", height: "100%", borderRadius: 4, padding: "8px 10px", display: "grid", gap: 5, boxShadow: "0 2px 6px rgb(0 0 0 / 0.15)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#111" }}>SHIPPING LABEL</div>
        <div style={{ fontSize: 9, color: "#333" }}>TO: A. Buyer · San Jose CA</div>
        <div style={{ height: 34, background: "repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px,#111 4px 5px,#fff 5px 8px)" }} />
        <div style={{ fontFamily: mono, fontSize: 10, color: "#111" }}>9400 1118 9922 7902 3202 12</div>
      </div>
    </div>
  );
}

/** A real detail from the seller's dashboard (the overview take): "In-policy refunds run automatically". */
function Policy({ at, out }: { at: number; out: number }) {
  const e = useEnter(at + 0.2, 15);
  const x = useExit(out, 0.3);
  const C = dash as Clip;
  const tr = C.tracks.main!;
  const box = { x: 1068, y: 812, width: 486, height: 74 };
  const k = 1.55; // css px → canvas px
  return (
    <div style={{ position: "absolute", left: 980, top: 300, opacity: Math.min(1, e * 1.4) * x, transform: `translateY(${(1 - e) * 30 - (1 - x) * 20}px)` }}>
      <div style={{ fontFamily: ui, fontSize: 22, fontWeight: 600, color: c.ink2, marginBottom: 12 }}>Her refund policy, in code · from her dashboard</div>
      <div style={{ width: box.width * k, height: box.height * k, overflow: "hidden", borderRadius: 16, boxShadow: "0 20px 50px rgb(0 0 0 / 0.14)", border: `1px solid ${c.line}`, position: "relative", background: "#fff" }}>
        <Freeze frame={0}>
          <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round(10 * FPS)} muted style={{ position: "absolute", left: -box.x * k, top: -box.y * k, width: tr.css.w * k, height: tr.css.h * k }} />
        </Freeze>
      </div>
    </div>
  );
}

/** The real public storefront at phone width (2 s). */
function Storefront() {
  const e = useEnter(0, 16);
  const C = store as Clip;
  const tr = C.tracks.main!;
  return (
    <div style={{ position: "absolute", left: 1240, top: 120 + (1 - e) * 800 }}>
      <Phone width={360} height={760}>
        <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round(1.2 * FPS)} playbackRate={1.4} muted style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      </Phone>
      <div style={{ fontFamily: ui, fontSize: 21, color: c.ink2, textAlign: "center", marginTop: 16 }}>Her storefront, on any phone</div>
    </div>
  );
}
