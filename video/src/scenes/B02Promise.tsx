import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COPY } from "../config";
import { Rise, useEnter } from "../lib/motion";
import { c, FPS, ui } from "../theme";
import { LogoMark, Paper, Wordmark } from "./parts";

// Beat 2, Promise (6 s): paper; the awning-S builds panel by panel; the wordmark settles; one line of promise.
export function B02Promise() {
  const f = useCurrentFrame();
  const s = f / FPS;
  const word = useEnter(0.75, 16);
  return (
    <AbsoluteFill style={{ background: c.canvas, overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${1 + 0.025 * (s / 6)})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 36, transform: `translateY(-30px)` }}>
          <LogoMark size={210} at={0.15} />
          <div style={{ opacity: Math.min(1, word * 1.4), transform: `translateX(${(1 - word) * 40}px)` }}>
            <Wordmark size={132} />
          </div>
        </div>
        <Rise at={1.7} style={{ position: "absolute", top: 640 }}>
          <div style={{ fontFamily: ui, fontSize: 42, color: c.ink2, letterSpacing: "-0.01em" }}>
            {COPY.tagline}, <span style={{ color: c.paypal, fontWeight: 600 }}>paid through PayPal</span>
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
