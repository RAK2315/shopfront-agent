import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { useEnter } from "../lib/motion";
import { c, display, FPS } from "../theme";

/** A plain phone drawn in code (no brand): a dark bezel, rounded screen, a small speaker slot. */
export function Phone({ width, height, children, style }: { width: number; height: number; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ width, height, borderRadius: 58, background: "#151312", padding: 12, boxShadow: "0 30px 80px rgb(0 0 0 / 0.35), inset 0 0 0 2px #2b2725", ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 47, overflow: "hidden", background: c.canvas }}>
        <div style={{ position: "absolute", top: 14, left: "50%", width: 110, height: 30, marginLeft: -55, borderRadius: 999, background: "#151312", zIndex: 5 }} />
        {children}
      </div>
    </div>
  );
}

/** The awning-S mark (video/public/brand/logo-mark.svg), built panel by panel: the S, then three panels drop in. */
export function LogoMark({ size, at = 0 }: { size: number; at?: number }) {
  const sIn = useEnter(at, 15);
  const p = [useEnter(at + 0.18, 11), useEnter(at + 0.27, 11), useEnter(at + 0.36, 11)];
  const panels = [
    "M33.2 22.6 H43.2 L40.9 37.6 A8.75 8.75 0 0 1 23.4 37.6 L30.4 24.1 Q31.1 22.6 33.2 22.6 Z",
    "M45.6 22.6 H54.4 L57.8 37.6 A7.8 7.8 0 0 1 42.2 37.6 Z",
    "M56.8 22.6 H66.8 Q68.9 22.6 69.6 24.1 L76.6 37.6 A8.75 8.75 0 0 1 59.1 37.6 Z",
  ];
  return (
    <svg width={size} height={size} viewBox="12 12 76 76" style={{ overflow: "visible" }}>
      <path
        fill="#1C1917"
        opacity={Math.min(1, sIn * 1.5)}
        transform={`translate(50 57) scale(${0.85 + 0.15 * sIn}) translate(-50 -57)`}
        d="M25 42 H40 V45 Q40 47.5 43.6 47.5 H62.6 A12.35 12.35 0 0 1 62.6 72.2 H35.6 A10.2 10.2 0 0 1 25.4 62 H60.4 A2.25 2.25 0 0 0 60.4 57.5 H35 A10 10 0 0 1 25 47.5 Z"
      />
      <g fill="#B4532A" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" paintOrder="stroke">
        {panels.map((d, i) => (
          <path key={i} d={d} opacity={Math.min(1, p[i]! * 1.6)} transform={`translate(0 ${(1 - p[i]!) * -14})`} />
        ))}
      </g>
    </svg>
  );
}

export function Wordmark({ size }: { size: number }) {
  return <span style={{ fontFamily: display, fontWeight: 600, fontSize: size, letterSpacing: "-0.02em", color: c.ink }}>Shopfront Agent</span>;
}

/** Paper texture background with a slow drift (nothing ever fully still). */
export function Paper() {
  const f = useCurrentFrame();
  const s = f / FPS;
  return <Img src={staticFile("images/paper-texture.jpg")} style={{ position: "absolute", inset: -40, width: "calc(100% + 80px)", height: "calc(100% + 80px)", objectFit: "cover", transform: `translate(${-s * 3}px, ${-s * 1.5}px) scale(1.02)` }} />;
}
