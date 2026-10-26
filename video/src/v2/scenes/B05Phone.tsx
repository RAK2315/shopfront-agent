import type { ReactNode } from "react";
import { AbsoluteFill, Audio, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import dash from "../../../public/clips/dashboard-overview.json";
import store from "../../../public/clips/storefront-phone.json";
import type { Clip } from "../../lib/clip";
import { frames, sStart } from "../config";
import { Phone } from "../lib/Phone";
import { Paper, Rise, useIn, useSec } from "../lib/Text";
import { c, ease, FPS, mono, sans } from "../theme";

// Beat 5, the seller on her phone (v6). Left: the chat strip, rebuilt in code from a real bot session
// (docs/screenshots/telegram/transcript-2026-10-24T20-50-27-466Z.json, a practice shop) and labelled so; no messaging
// app's interface or logo (D-073, S6.4). The wording and amounts are the transcript's. Right: her real storefront at
// phone width (the storefront-phone take, real speed), then, for the refund, the real line from her dashboard.
type Msg = { at: number; from: "bot" | "me"; body: ReactNode; buttons?: string[]; tap?: { at: number; i: number } };

export function B05Phone() {
  const tOrder = sStart(5, 2) + 0.05;
  const tLabel = sStart(5, 3) + 0.2; // "snaps"
  const tRefund = sStart(5, 4);
  const tPolicy = sStart(5, 4) + 1.0; // "outside her policy"
  const tTap = sStart(5, 4) + 2.25; // "tap"
  const msgs: Msg[] = [
    { at: tOrder, from: "bot", body: <><b>Order paid · $37.00</b><br />Items: 1 × Practice copper-red cup<br />PayPal: payment confirmed, paid to the Shopfront sandbox account.</> },
    { at: tLabel, from: "me", body: <LabelPhoto /> },
    { at: tLabel + 0.85, from: "bot", body: <><b>USPS 9400111899227902320212</b><br />Add it to the order for 1 × Practice copper-red cup ($37.00)?</>, buttons: ["Add tracking"], tap: { at: tLabel + 1.65, i: 0 } },
    { at: tLabel + 2.15, from: "bot", body: <><b>Tracking added</b><br />It's on the PayPal order, and the buyer has a note on their order page.</> },
    { at: tRefund, from: "bot", body: <><b>Refund request · $37.00</b><br />Reason: damaged<br />Why you: this buyer already had automatic refunds this month. The amount was computed by the server.</>, buttons: ["Refund $37.00", "Decline"], tap: { at: tTap, i: 0 } },
    { at: tTap + 0.55, from: "bot", body: <><b>Refund approved and sent.</b> PayPal returned the money to the buyer.</> },
  ];
  const storeOut = useIn(tPolicy - 0.4, 0.35);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <div style={{ position: "absolute", left: 500, top: 92 }}>
        <Rise at={0.4}>
          <Label>Rebuilt from a real session in a practice shop</Label>
        </Rise>
        <Phone width={390} height={790} at={0} style={{ marginTop: 14 }}>
          <Chat msgs={msgs} />
        </Phone>
      </div>
      <div style={{ position: "absolute", left: 1030, top: 92, opacity: 1 - storeOut }}>
        <Rise at={0.55}>
          <Label>Her storefront, live</Label>
        </Rise>
        <Phone width={390} height={790} at={0.15} style={{ marginTop: 14 }}>
          <Storefront />
        </Phone>
      </div>
      {useSec() >= tPolicy - 0.1 && <Policy at={tPolicy} />}
    </AbsoluteFill>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: sans, fontSize: 24, fontWeight: 500, color: c.ink2, width: 390, display: "flex", justifyContent: "center", whiteSpace: "nowrap" }}>{children}</div>;
}

function Chat({ msgs }: { msgs: Msg[] }) {
  const s = useSec();
  return (
    <AbsoluteFill style={{ fontFamily: sans, background: c.canvas }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 104, padding: "52px 20px 0", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${c.line}`, background: c.surface, zIndex: 2 }}>
        <div style={{ width: 38, height: 38, borderRadius: 999, background: c.claySoft, display: "grid", placeItems: "center", color: c.clay, fontWeight: 700, fontSize: 20 }}>S</div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, color: c.ink }}>Shop assistant</div>
          <div style={{ fontSize: 16, color: c.ink2 }}>Practice shop, sandbox</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 104, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, padding: "14px 14px 22px", overflow: "hidden" }}>
        {msgs
          .filter((m) => s >= m.at)
          .map((m, i) => {
            const grow = interpolate((s - m.at) * FPS, [0, 10], [0, 1], { extrapolateRight: "clamp", easing: ease.out });
            return (
              <div key={i} style={{ maxHeight: grow * 420, opacity: grow, transform: `translateY(${(1 - grow) * 12}px)`, alignSelf: m.from === "me" ? "flex-end" : "flex-start", maxWidth: "88%", flexShrink: 0 }}>
                <div style={{ background: m.from === "me" ? c.claySoft : c.surface, border: `1px solid ${m.from === "me" ? "oklch(0.88 0.05 40)" : c.line}`, borderRadius: m.from === "me" ? "18px 18px 6px 18px" : "18px 18px 18px 6px", padding: m.from === "me" ? 6 : "11px 14px", fontSize: 19, lineHeight: 1.36, color: c.ink }}>
                  {m.body}
                </div>
                {m.buttons && (
                  <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
                    {m.buttons.map((b, k) => {
                      const age = m.tap && m.tap.i === k ? (s - m.tap.at) * FPS : -1;
                      const sc = age >= 0 && age < 6 ? interpolate(age, [0, 2, 6], [1, 0.96, 1]) : 1;
                      return (
                        <div key={b} style={{ position: "relative", flex: 1, textAlign: "center", fontSize: 18, fontWeight: 700, padding: "9px 12px", borderRadius: 12, border: `1.5px solid ${age >= 0 ? c.clay : c.line}`, background: age >= 0 ? c.clay : c.surface, color: age >= 0 ? "#fff" : c.ink, transform: `scale(${sc})` }}>
                          {b}
                          {age >= 0 && age < 16 && <Tap age={age} />}
                        </div>
                      );
                    })}
                  </div>
                )}
                {m.tap && (
                  <Sequence from={frames(m.tap.at - m.at)} durationInFrames={10} layout="none">
                    <Audio src={staticFile("sfx/click.wav")} volume={0.35} />
                  </Sequence>
                )}
              </div>
            );
          })}
      </div>
    </AbsoluteFill>
  );
}

/** A fingertip tap: a soft circle that fades. */
function Tap({ age }: { age: number }) {
  const r = interpolate(age, [0, 16], [14, 34], { easing: ease.out });
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: "50%", background: "rgb(255 255 255 / 0.3)", border: "2px solid rgb(255 255 255 / 0.75)", opacity: interpolate(age, [0, 16], [0.9, 0]) }} />;
}

/** The label photo she sent, drawn as a plain shipping label (no carrier branding). */
function LabelPhoto() {
  return (
    <div style={{ width: 230, height: 156, borderRadius: 12, background: "oklch(0.9 0.03 75)", padding: 12 }}>
      <div style={{ background: "#fff", height: "100%", borderRadius: 4, padding: "8px 10px", display: "grid", gap: 5, boxShadow: "0 2px 6px rgb(0 0 0 / 0.15)", transform: "rotate(-2deg)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#111" }}>SHIPPING LABEL</div>
        <div style={{ fontSize: 10, color: "#333" }}>TO: A. Buyer, San Jose CA</div>
        <div style={{ height: 34, background: "repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px,#111 4px 5px,#fff 5px 8px)" }} />
        <div style={{ fontFamily: mono, fontSize: 10, color: "#111" }}>9400 1118 9922 7902 3202 12</div>
      </div>
    </div>
  );
}

/** Her real storefront at phone width (the storefront-phone take), real speed. */
function Storefront() {
  const tr = (store as Clip).tracks.main!;
  return (
    <Sequence from={frames(0.6)} layout="none">
      <HoldEnd last={Math.floor((tr.seconds - 0.15) * FPS)}>
        <OffthreadVideo src={staticFile(tr.file)} muted style={{ position: "absolute", left: 0, top: 46, width: "100%", height: "calc(100% - 46px)", objectFit: "cover", objectPosition: "top" }} />
      </HoldEnd>
    </Sequence>
  );
}

function HoldEnd({ last, children }: { last: number; children: ReactNode }) {
  const f = useCurrentFrame();
  return (
    <Freeze frame={last} active={f >= last}>
      {children}
    </Freeze>
  );
}

/** The real line from her dashboard (the overview take): in-policy refunds run on their own. */
function Policy({ at }: { at: number }) {
  const e = useIn(at, 0.5);
  const tr = (dash as Clip).tracks.main!;
  const box = { x: 1058, y: 800, width: 504, height: 94 };
  const k = 1.6;
  return (
    <div style={{ position: "absolute", left: 1010, top: 370, opacity: e, transform: `translateY(${(1 - e) * 14}px)` }}>
      <div style={{ fontFamily: sans, fontSize: 28, fontWeight: 500, color: c.ink2, marginBottom: 14 }}>Her refund policy, from her dashboard</div>
      <div style={{ width: box.width * k, height: box.height * k, overflow: "hidden", borderRadius: 18, boxShadow: "0 20px 50px -16px rgb(40 25 15 / 0.3)", border: `1px solid ${c.line}`, position: "relative", background: "#fff" }}>
        <Freeze frame={0}>
          <OffthreadVideo src={staticFile(tr.file)} trimBefore={Math.round(10 * FPS)} muted style={{ position: "absolute", left: -box.x * k, top: -box.y * k, width: tr.css.w * k, height: tr.css.h * k }} />
        </Freeze>
      </div>
    </div>
  );
}
