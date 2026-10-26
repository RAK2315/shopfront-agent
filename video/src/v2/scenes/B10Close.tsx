import { AbsoluteFill } from "remotion";
import { sStart } from "../config";
import { LogoMark, Paper, Reveal, Rise, Wordmark } from "../lib/Text";
import { c, mono, sans } from "../theme";

// Beat 10, close (v6): paper, the mark and the wordmark, the line, then the live URL with "Try it live" and the sandbox
// note, all at once. After the URL appears nothing moves; it holds about 4.5 s. The words are on screen, so this beat has
// no captions.
export const URL = "shopfront-agent.onrender.com";

export function B10Close() {
  const tLine = sStart(10, 2);
  const tUrl = sStart(10, 3) - 0.3;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: 30, transform: "translateY(-10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
            <LogoMark size={170} at={0.1} />
            <Reveal at={0.45} dur={0.7}>
              <Wordmark size={112} />
            </Reveal>
          </div>
          <Rise at={tLine}>
            <div style={{ fontFamily: sans, fontSize: 44, fontWeight: 500, color: c.ink2 }}>Any seller, buyable by any AI agent, paid through PayPal</div>
          </Rise>
          <Rise at={tUrl} style={{ display: "grid", justifyItems: "center", gap: 18, marginTop: 26 }}>
            <div style={{ fontFamily: sans, fontSize: 34, fontWeight: 700, color: c.clay }}>Try it live</div>
            <div style={{ fontFamily: mono, fontSize: 54, fontWeight: 500, color: "#fff", background: c.clay, padding: "14px 36px", borderRadius: 16, boxShadow: "0 14px 34px -10px oklch(0.56 0.14 40 / 0.55)" }}>{URL}</div>
            <div style={{ fontFamily: sans, fontSize: 30, fontWeight: 500, color: c.ink2 }}>Runs on the PayPal sandbox. The test buyer's login is in the README.</div>
          </Rise>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
