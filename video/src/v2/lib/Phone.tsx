import type { CSSProperties, ReactNode } from "react";
import { c } from "../theme";
import { useIn } from "./Text";

// A plain phone drawn in code (no brand), lit like a product shot: a dark bezel, a restrained shadow. It enters once
// (fade, a short rise, a whisper of scale) and then stays perfectly still: no floating, no bounce.
export function Phone({ width, height, at = 0, children, style }: { width: number; height: number; at?: number; children: ReactNode; style?: CSSProperties }) {
  const e = useIn(at, 0.8);
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 56,
        background: "#171413",
        padding: 11,
        boxShadow: "0 28px 60px -18px rgb(40 25 15 / 0.35), 0 8px 18px rgb(40 25 15 / 0.12), inset 0 0 0 2px #2d2826",
        opacity: e,
        transform: `translateY(${(1 - e) * 24}px) scale(${0.985 + 0.015 * e})`,
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 46, overflow: "hidden", background: c.canvas }}>
        <div style={{ position: "absolute", top: 13, left: "50%", width: 104, height: 28, marginLeft: -52, borderRadius: 999, background: "#171413", zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}
