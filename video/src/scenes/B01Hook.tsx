import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { COPY, say } from "../config";
import { Rise, useEnter, useProgress } from "../lib/motion";
import { c, display, ease, FPS, ui } from "../theme";
import { Phone } from "./parts";

// Beat 1, Hook (10 s): the studio, a maker wrapping a mug, a phone full of DMs, an agent that finds no Buy button.
export function B01Hook() {
  const f = useCurrentFrame();
  const s = f / FPS;
  const swap = say(1, "Juniper's") + 0.1;
  const agentIn = say(1, "shopping");
  const press = say(1, "buy") - 0.05;
  const words = say(1, "agent", 1) + 0.15;
  const a = useProgress(swap, swap + 0.8, ease.camera);
  const dim = useProgress(words - 0.2, words + 0.5);
  return (
    <AbsoluteFill style={{ background: c.panel, overflow: "hidden" }}>
      <Img src={staticFile("images/studio-workbench.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.02 + 0.07 * (s / 10)}) translateX(${-s * 4}px)`, opacity: 1 - a }} />
      <Img src={staticFile("images/hands-wrapping-mug.jpg")} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.1 - 0.05 * a + 0.02 * Math.max(0, s - swap) / 6})`, opacity: a }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, oklch(0.15 0.01 45 / 0.55), oklch(0.15 0.01 45 / 0.05) 60%)" }} />
      <AbsoluteFill style={{ background: `oklch(0.15 0.01 45 / ${0.5 * dim})` }} />
      <PhoneDMs agentIn={agentIn} press={press} />
      <NoWords at={words} />
    </AbsoluteFill>
  );
}

function PhoneDMs({ agentIn, press }: { agentIn: number; press: number }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const inn = useEnter(1.6, 16);
  const shake = s > press && s < press + 0.45 ? Math.sin((s - press) * 60) * 7 * (1 - (s - press) / 0.45) : 0;
  const failed = s > press + 0.1;
  return (
    <div style={{ position: "absolute", left: 1180, top: 120 + (1 - inn) * 700, transform: `rotate(${-3 + inn * 1.2}deg)` }}>
      <Phone width={420} height={840}>
        <div style={{ padding: "64px 22px 20px", display: "grid", gap: 14, fontFamily: ui }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: c.ink, paddingBottom: 8, borderBottom: `1px solid ${c.line}` }}>Messages</div>
          <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${c.line}`, background: c.surface }}>
            <Img src={staticFile("products/mug.jpg")} style={{ width: "100%", height: 190, objectFit: "cover" }} />
            <div style={{ padding: "10px 14px 14px", display: "grid", gap: 10 }}>
              <div style={{ fontSize: 19, color: c.ink }}>New green mug, wheel-thrown. DM to buy!</div>
              <div
                style={{
                  height: 46,
                  borderRadius: 12,
                  border: `2px dashed ${failed ? c.danger : c.line}`,
                  display: "grid",
                  placeItems: "center",
                  color: failed ? c.danger : c.muted,
                  fontSize: 18,
                  transform: `translateX(${shake}px)`,
                }}
              >
                {failed ? "No checkout here" : "Buy"}
              </div>
            </div>
          </div>
          {COPY.dms.map((t, i) => (
            <Rise key={t} at={2.1 + i * 0.32} style={{ justifySelf: "start" }}>
              <div style={{ background: c.surface2, color: c.ink, fontSize: 20, padding: "10px 16px", borderRadius: "18px 18px 18px 6px", maxWidth: 330 }}>{t}</div>
            </Rise>
          ))}
        </div>
      </Phone>
      <AgentCursor agentIn={agentIn} press={press} />
    </div>
  );
}

/** The agent's cursor: arcs in from the left to where a Buy button would be, presses, finds nothing. */
function AgentCursor({ agentIn, press }: { agentIn: number; press: number }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const u = interpolate(s, [agentIn, press - 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.hand });
  const from = { x: -420, y: 620 };
  const to = { x: 210, y: 410 };
  const ctrl = { x: -60, y: 260 };
  const x = (1 - u) ** 2 * from.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x;
  const y = (1 - u) ** 2 * from.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y;
  const age = (s - press) * FPS;
  const sc = age >= 0 && age < 8 ? interpolate(age, [0, 4, 8], [1, 0.86, 1]) : 1;
  const o = interpolate(s, [agentIn - 0.1, agentIn + 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o }}>
      <svg width={42} height={42} viewBox="0 0 24 24" style={{ transform: `scale(${sc})`, transformOrigin: "5px 3px", filter: "drop-shadow(0 3px 5px rgb(0 0 0 / 0.35))" }}>
        <path d="M5 3 L5 19.5 L9.4 15.6 L12.3 21.6 L15.1 20.3 L12.3 14.4 L18.2 14.2 Z" fill={c.clay} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 30, top: 34, whiteSpace: "nowrap", background: c.panel, color: c.panelText, fontFamily: ui, fontSize: 18, fontWeight: 500, padding: "5px 12px", borderRadius: 999 }}>AI shopping agent</div>
    </div>
  );
}

function NoWords({ at }: { at: number }) {
  return (
    <div style={{ position: "absolute", left: 140, top: 380, display: "grid", gap: 6 }}>
      {COPY.noWords.map((w, i) => (
        <Rise key={w} at={at + i * 0.22} dy={40}>
          <div style={{ fontFamily: display, fontWeight: 600, fontSize: 112, lineHeight: 1.02, color: "#fff", letterSpacing: "-0.02em", textShadow: "0 4px 30px rgb(0 0 0 / 0.35)" }}>{w}.</div>
        </Rise>
      ))}
    </div>
  );
}
