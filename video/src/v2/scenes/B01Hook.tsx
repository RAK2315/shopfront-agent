import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile } from "remotion";
import { frames, sStart } from "../config";
import { Phone } from "../lib/Phone";
import { Reveal, Rise, useIn, useSec } from "../lib/Text";
import { c, display, ease, sans } from "../theme";

// Beat 1, hook (v6): the photography carries it and the camera barely moves. The studio, then Juniper wrapping a mug;
// her phone, where the sale happens in DMs; an AI shopping agent that finds nothing to press; then three lines, one at a
// time, after the voice: No store. No feed. No checkout.
const DMS = ["is this still available?", "do you ship to Ohio?", "how much for the green one?", "still available??"];
const LINES = ["No store.", "No feed.", "No checkout."];

export function B01Hook() {
  const s = useSec();
  const swap = sStart(1, 1) + 1.3; // after "like Juniper"
  const a = interpolate(s, [swap, swap + 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.soft });
  const tPhone = sStart(1, 1) + 2.9; // "social posts"
  const tAgent = sStart(1, 2) + 2.0; // "and an agent"
  const press = sStart(1, 2) + 3.25; // "buy"
  const tLines = sStart(1, 2) + 4.5; // after "a DM"
  const dim = useIn(tLines - 0.35, 0.7);
  return (
    <AbsoluteFill style={{ background: c.panel, overflow: "hidden" }}>
      <Img src={staticFile("images/studio-workbench.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1 + 0.025 * Math.min(1, s / (swap + 0.9))})`, opacity: 1 - a }} />
      <Img src={staticFile("images/hands-wrapping-mug.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.0 + 0.02 * ease.soft(Math.min(1, Math.max(0, (s - swap) / 9)))})`, opacity: a }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, oklch(0.15 0.01 45 / 0.45), oklch(0.15 0.01 45 / 0) 55%)" }} />
      <AbsoluteFill style={{ background: `oklch(0.15 0.01 45 / ${0.5 * dim})` }} />
      <div style={{ position: "absolute", left: 200, top: 100 }}>
        <Phone width={420} height={860} at={tPhone}>
          <Feed tPhone={tPhone} press={press} />
        </Phone>
        <AgentCursor at={tAgent} press={press} />
      </div>
      <div style={{ position: "absolute", left: 820, top: 300, display: "grid", gap: 4 }}>
        {LINES.map((w, i) => (
          <Reveal key={w} at={tLines + i * 0.5}>
            <div style={{ fontFamily: display, fontWeight: 600, fontSize: 124, lineHeight: 1.04, color: "#fff", letterSpacing: "-0.02em" }}>{w}</div>
          </Reveal>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Feed({ tPhone, press }: { tPhone: number; press: number }) {
  const s = useSec();
  const failed = s >= press;
  return (
    <div style={{ padding: "62px 20px 20px", display: "grid", gap: 14, fontFamily: sans }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: c.ink, paddingBottom: 8, borderBottom: `1px solid ${c.line}` }}>Juniper Clay Studio</div>
      <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${c.line}`, background: c.surface }}>
        <Img src={staticFile("products/mug.jpg")} style={{ width: "100%", height: 200, objectFit: "cover" }} />
        <div style={{ padding: "10px 14px 14px", display: "grid", gap: 10 }}>
          <div style={{ fontSize: 21, color: c.ink }}>New green mug, wheel-thrown. DM to buy!</div>
          <div style={{ height: 48, borderRadius: 12, border: `2px dashed ${failed ? c.danger : c.line}`, display: "grid", placeItems: "center", color: failed ? c.danger : c.ink2, fontSize: 20, fontWeight: 500 }}>
            {failed ? "No checkout here" : "Buy"}
          </div>
        </div>
      </div>
      {DMS.map((t, i) => (
        <Rise key={t} at={tPhone + 0.7 + i * 0.4} dy={12} style={{ justifySelf: "start" }}>
          <div style={{ background: "oklch(0.93 0.008 60)", color: c.ink, fontSize: 21, padding: "10px 16px", borderRadius: "18px 18px 18px 6px", maxWidth: 330 }}>{t}</div>
        </Rise>
      ))}
    </div>
  );
}

/** The shopper's AI agent: glides in from the right on a soft arc to where a Buy button would be, presses, finds nothing. */
function AgentCursor({ at, press }: { at: number; press: number }) {
  const s = useSec();
  const u = ease.soft(interpolate(s, [at, press - 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const from = { x: 760, y: 760 };
  const to = { x: 318, y: 404 };
  const ctrl = { x: 640, y: 440 };
  const x = (1 - u) ** 2 * from.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x;
  const y = (1 - u) ** 2 * from.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y;
  const age = (s - press) * 30;
  const sc = age >= 0 && age < 6 ? interpolate(age, [0, 2, 6], [1, 0.92, 1]) : 1;
  const o = interpolate(s, [at - 0.2, at + 0.15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <svg width={40} height={40} viewBox="0 0 24 24" style={{ transform: `scale(${sc})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 3px 5px rgb(0 0 0 / 0.35))" }}>
        <path d="M5 3 L5 19.5 L9.4 15.6 L12.3 21.6 L15.1 20.3 L12.3 14.4 L18.2 14.2 Z" fill={c.clay} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 30, top: 34, whiteSpace: "nowrap", background: c.panel, color: c.panelText, fontFamily: sans, fontSize: 20, fontWeight: 500, padding: "5px 13px", borderRadius: 999 }}>AI shopping agent</div>
      <Sequence from={frames(press)} durationInFrames={10} layout="none">
        <Audio src={staticFile("sfx/click.wav")} volume={0.45} />
      </Sequence>
    </div>
  );
}
