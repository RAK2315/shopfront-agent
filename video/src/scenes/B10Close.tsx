import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COPY } from "../config";
import { Rise, useProgress } from "../lib/motion";
import { c, ease, FPS, mono, ui } from "../theme";
import { LogoMark, Paper, Wordmark } from "./parts";

// Beat 10, Close (8 s): the payoff. Paper, the mark and wordmark, the live URL, the sandbox line; the camera pulls back.
export function B10Close() {
  const f = useCurrentFrame();
  const s = f / FPS;
  const pull = useProgress(0, 3.2, ease.camera);
  return (
    <AbsoluteFill style={{ background: c.canvas, overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${1.16 - 0.16 * pull + 0.006 * s})` }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 34, transform: "translateY(-20px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <LogoMark size={170} at={0.1} />
            <Rise at={0.45}>
              <Wordmark size={112} />
            </Rise>
          </div>
          <Rise at={1.5}>
            <div style={{ fontFamily: ui, fontSize: 40, color: c.ink2 }}>Any seller · buyable by any AI agent · paid through PayPal</div>
          </Rise>
          <Rise at={4.9}>
            <div style={{ fontFamily: mono, fontSize: 52, fontWeight: 500, color: c.surface, background: c.clay, padding: "14px 34px", borderRadius: 16, boxShadow: "0 12px 40px oklch(0.56 0.14 40 / 0.35)" }}>{COPY.url}</div>
          </Rise>
          <Rise at={5.4}>
            <div style={{ fontFamily: ui, fontSize: 28, color: c.muted }}>{COPY.sandboxLine}</div>
          </Rise>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
