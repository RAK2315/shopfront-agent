import { AbsoluteFill } from "remotion";
import { LogoMark, Paper, Reveal, Rise, Wordmark } from "../lib/Text";
import { c, sans } from "../theme";

// Beat 2, promise (v6): paper; the awning-S builds panel by panel; the wordmark rises from its mask; the tagline sits
// still underneath. Nothing moves once it has arrived.
export function B02Promise() {
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 34, transform: "translateY(-40px)" }}>
          <LogoMark size={200} at={0.15} />
          <Reveal at={0.55} dur={0.75}>
            <Wordmark size={132} />
          </Reveal>
        </div>
        <Rise at={1.6} style={{ position: "absolute", top: 650 }}>
          <div style={{ fontFamily: sans, fontSize: 44, fontWeight: 500, color: c.ink2 }}>
            Her photos become a store any AI agent can buy from, <span style={{ color: c.ink, fontWeight: 700 }}>paid through PayPal</span>
          </div>
        </Rise>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
