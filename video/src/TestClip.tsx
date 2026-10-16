import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { c, display, ui } from "./theme";

// Toolchain proof (Phase 7): title → real /capture footage with captions and one zoom → end card. 20 s.
export type TestClipProps = {
  src: string;
  seconds: number; // length of the capture (from its sidecar)
  marks: { prompt: { at: number }; checkoutCard: { at: number; box: { x: number; y: number; width: number; height: number } } };
};

const TITLE = 2;
const CLIP_FROM = 0.4; // seconds into the capture
const FOOTAGE = 15; // the capture plays in real time, then its last (zoomed) frame holds
const ease = Easing.bezier(0.16, 1, 0.3, 1); // --ease-out-expo

function Caption({ text }: { text: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 64 }}>
      <div style={{ opacity: o, maxWidth: 1200, background: "oklch(0.19 0.01 45 / 0.88)", color: c.panelText, fontFamily: ui, fontSize: 40, lineHeight: 1.3, padding: "14px 28px", borderRadius: 10, textAlign: "center" }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}

function Footage({ src, marks, seconds }: TestClipProps) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const last = Math.floor((seconds - CLIP_FROM) * fps) - 2;
  const t = f / fps + CLIP_FROM; // capture time
  const card = marks.checkoutCard;
  // Zoom toward the checkout card once it has landed: the server's total is the point of the beat.
  const z = interpolate(t, [card.at + 0.8, card.at + 1.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const scale = 1 + z * 0.9;
  const ox = card.box.x + card.box.width / 2;
  const oy = card.box.y + card.box.height / 2;
  const cue = (from: number, to: number, text: string) => (t >= from && t < to ? <Caption key={text} text={text} /> : null);
  return (
    <AbsoluteFill style={{ background: c.canvas }}>
      <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: `${ox}px ${oy}px` }}>
        <Freeze frame={last} active={f >= last}>
          <OffthreadVideo src={src} startFrom={Math.round(CLIP_FROM * fps)} />
        </Freeze>
      </AbsoluteFill>
      {cue(marks.prompt.at - 0.2, marks.prompt.at + 3, "A shopper asks an agent for a blue mug under forty dollars.")}
      {cue(marks.prompt.at + 3, card.at + 0.6, "The agent sends product IDs and quantities, never prices.")}
      {cue(card.at + 0.6, 99, "The total comes from her catalog, on the server.")}
    </AbsoluteFill>
  );
}

function Card({ title, sub }: { title: string; sub: string }) {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 14], [16, 0], { extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ background: c.panel, justifyContent: "center", alignItems: "center", gap: 20 }}>
      <div style={{ opacity: o, transform: `translateY(${y}px)`, fontFamily: display, fontWeight: 500, fontSize: 112, color: c.panelText, letterSpacing: "-0.02em" }}>{title}</div>
      <div style={{ opacity: o, fontFamily: ui, fontSize: 36, color: c.panelMuted }}>{sub}</div>
    </AbsoluteFill>
  );
}

export function TestClip(props: TestClipProps) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: c.panel }}>
      <Sequence durationInFrames={TITLE * fps}>
        <Card title="Shopfront Agent" sub="Real footage of the hosted app · toolchain test" />
      </Sequence>
      <Sequence from={TITLE * fps} durationInFrames={FOOTAGE * fps}>
        <Footage {...props} />
      </Sequence>
      <Sequence from={(TITLE + FOOTAGE) * fps}>
        <Card title="Agent → MCP → PayPal" sub="shopfront-agent.onrender.com" />
      </Sequence>
    </AbsoluteFill>
  );
}
