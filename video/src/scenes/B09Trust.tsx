import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COPY, say } from "../config";
import { Rise, useEnter, useProgress } from "../lib/motion";
import { c, display, ease, FPS, mono, ui } from "../theme";

// Beat 9, Why you can trust it (12 s): the architecture draws itself (agent → MCP → Shopfront → PayPal), the model sits
// off to the side with no money tools, the whole app inside one Render box; counters; the camera pulls back.
export function B09Trust() {
  const f = useCurrentFrame();
  const s = f / FPS;
  const tModel = say(9, "model");
  const tRender = say(9, "Render");
  const tTested = say(9, "tested");
  const tPayPal = say(9, "PayPal");
  // Camera: close on the money path, a look at the model, then the pull-back to the whole board on "Render".
  const look = useProgress(tModel, tModel + 1.0);
  const pull = useProgress(tRender - 0.5, tRender + 0.9);
  const zoom = (1.32 - 0.04 * look) * (1 - pull) + 1 * pull;
  const fx = (760 + 260 * look) * (1 - pull) + 960 * pull;
  const fy = (480 + 140 * look) * (1 - pull) + 640 * pull;
  const drift = 1 + 0.004 * s;
  return (
    <AbsoluteFill style={{ background: c.canvas, overflow: "hidden" }}>
      <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${960 - fx * zoom * drift}px, ${540 - fy * zoom * drift}px) scale(${zoom * drift})` }}>
        <RenderBox at={tRender - 0.2} />
        <Node at={0.1} x={80} y={420} w={290} h={150} title="Any AI agent" sub="a shopper's assistant" />
        <Edge at={0.35} d="M370 495 H480" label="MCP" />
        <Node at={0.3} x={480} y={400} w={290} h={190} title="MCP tools" sub="IDs and quantities in. No price, no total." />
        <Edge at={0.6} d="M770 495 H850" />
        <Node at={0.5} x={850} y={330} w={590} h={330} title="Shopfront" tone="clay">
          <ul style={{ margin: 0, paddingLeft: 26, display: "grid", gap: 10, fontSize: 25, color: c.ink2 }}>
            <li>Prices and totals come from the database</li>
            <li>A checkout state machine in plain code</li>
            <li>Webhooks verified, processed once</li>
            <li style={{ color: c.ink, fontWeight: 600 }}>Only this code moves money</li>
          </ul>
        </Node>
        <Edge at={0.85} d="M1440 455 H1560" label="Orders" lx={30} ly={-24} />
        <Edge at={1.0} d="M1560 590 H1440" label="Webhooks" lx={-112} ly={44} dashed />
        <PayPalNode at={0.8} />
        <Edge at={tModel + 0.2} d="M1145 700 V662" dashed />
        <ModelNode at={tModel} badgeAt={say(9, "money;") - 0.1} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 790, display: "flex", justifyContent: "center", gap: 36 }}>
        <Stat at={tTested - 0.2} value={COPY.checks} label="checks against this live deployment" />
        <Stat at={tPayPal - 0.2} value={COPY.mismatches} label="mismatches with PayPal" ok />
      </div>
    </AbsoluteFill>
  );
}

function Node({ at, x, y, w, h, title, sub, tone, children }: { at: number; x: number; y: number; w: number; h: number; title: string; sub?: string; tone?: "clay"; children?: ReactNode }) {
  const e = useEnter(at);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        opacity: Math.min(1, e * 1.4),
        transform: `translateY(${(1 - e) * 18}px) scale(${0.95 + 0.05 * e})`,
        background: c.surface,
        border: `2px solid ${tone === "clay" ? c.clay : c.line}`,
        borderRadius: 22,
        padding: "22px 26px",
        boxShadow: "0 10px 30px rgb(0 0 0 / 0.06)",
        fontFamily: ui,
        display: "grid",
        alignContent: "start",
        gap: 12,
      }}
    >
      <div style={{ fontFamily: display, fontWeight: 600, fontSize: 38, color: tone === "clay" ? c.clay : c.ink, letterSpacing: "-0.01em" }}>{title}</div>
      {sub && <div style={{ fontSize: 24, color: c.ink2, lineHeight: 1.3 }}>{sub}</div>}
      {children}
    </div>
  );
}

function PayPalNode({ at }: { at: number }) {
  const items = ["Orders v2", "Webhooks", "Catalog", "Cart API"];
  return (
    <Node at={at} x={1560} y={360} w={290} h={330} title="PayPal">
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((t, i) => (
          <Rise key={t} at={at + 0.15 + i * 0.07} dy={10}>
            <div style={{ fontSize: 24, fontWeight: 500, color: c.paypal, background: c.paypalSoft, borderRadius: 10, padding: "6px 12px" }}>{t}</div>
          </Rise>
        ))}
      </div>
    </Node>
  );
}

function ModelNode({ at, badgeAt }: { at: number; badgeAt: number }) {
  const b = useEnter(badgeAt, 12);
  return (
    <div style={{ position: "absolute", left: 850, top: 700 }}>
      <Rise at={at}>
        <div style={{ width: 590, height: 92, borderRadius: 18, border: `2px dashed ${c.line}`, background: c.surface2, display: "flex", alignItems: "center", gap: 18, padding: "0 24px", fontFamily: ui, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 26, fontWeight: 600, color: c.ink }}>AI models</div>
          <div style={{ fontSize: 22, color: c.ink2 }}>drafts, chat, answers</div>
          <div style={{ marginLeft: "auto", fontSize: 21, fontWeight: 600, color: c.danger, background: "oklch(0.955 0.03 27)", padding: "6px 12px", borderRadius: 999, opacity: Math.min(1, b * 1.5), transform: `scale(${0.8 + 0.2 * b})` }}>no money tools</div>
        </div>
      </Rise>
    </div>
  );
}

function RenderBox({ at }: { at: number }) {
  const f = useCurrentFrame();
  const p = interpolate(f / FPS, [at, at + 1.1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.camera });
  const per = 2 * (1040 + 650);
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
        <rect x={430} y={280} width={1040} height={550} rx={30} fill={`oklch(0.955 0.03 40 / ${0.45 * p})`} stroke={c.clay} strokeWidth={3} strokeDasharray={`${per * p} ${per}`} />
      </svg>
      <div style={{ position: "absolute", left: 456, top: 238, opacity: p, fontFamily: ui, fontSize: 26, fontWeight: 600, color: c.clay }}>One free Render service · the whole app</div>
    </>
  );
}

function Edge({ at, d, label, dashed, lx = 8, ly = -14 }: { at: number; d: string; label?: string; dashed?: boolean; lx?: number; ly?: number }) {
  const f = useCurrentFrame();
  const p = interpolate(f / FPS, [at, at + 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out });
  const [, x1, y1] = d.match(/M(\d+) (\d+)/)!.map(Number);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={c.ink2} />
        </marker>
      </defs>
      <path d={d} stroke={c.ink2} strokeWidth={3} fill="none" pathLength={1} strokeDasharray={dashed ? "0.06 0.04" : `${p} 1`} opacity={dashed ? p : 1} markerEnd={p > 0.9 ? "url(#ah)" : undefined} />
      {label && (
        <text x={x1! + lx} y={y1! + ly} fontFamily={mono} fontSize={20} fill={c.ink2} opacity={p}>
          {label}
        </text>
      )}
    </svg>
  );
}

function Stat({ at, value, label, ok }: { at: number; value: number; label: string; ok?: boolean }) {
  const f = useCurrentFrame();
  const e = useEnter(at);
  const n = Math.round(interpolate(f / FPS, [at, at + 1], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out }));
  return (
    <div style={{ opacity: Math.min(1, e * 1.4), transform: `translateY(${(1 - e) * 20}px)`, display: "flex", alignItems: "baseline", gap: 16, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 20, padding: "18px 30px", fontFamily: ui, boxShadow: "0 10px 30px rgb(0 0 0 / 0.06)" }}>
      <span style={{ fontFamily: display, fontWeight: 600, fontSize: 64, color: ok ? c.success : c.ink, fontVariantNumeric: "lining-nums tabular-nums" }}>{ok ? value : n}</span>
      <span style={{ fontSize: 28, color: c.ink2 }}>{label}</span>
      {ok && <span style={{ fontSize: 30, color: c.success, fontWeight: 700 }}>✓</span>}
    </div>
  );
}
