import type { ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { sStart } from "../config";
import { Glow, Paper, Pulse, Rise, useIn, useSec } from "../lib/Text";
import { c, display, ease, mono, sans } from "../theme";

// Beat 9, why you can trust it (v6). Drawn in code, the board never moves; it builds in order along the money path:
// any AI agent → MCP tools → Shopfront → PayPal (each node pulses once as it lights), then the AI models off to the side
// with no money tools, then the one Render service around the app, then the two numbers (README: 24 suites, 148 checks
// against the deployed app; the latest reconcile: 0 mismatches with PayPal).
const CHECKS = 148;

export function B09Trust() {
  const s1 = sStart(9, 1);
  const s2 = sStart(9, 2);
  const tModel = s1 + 1.9; // after "No AI model ever moves money"
  const tCode = s1 + 2.45; // "plain code does"
  const tRender = s2 + 0.75; // "one free Render service"
  const tTested = s2 + 2.3; // "tested live"
  const tPayPal = s2 + 3.1; // "real PayPal sandbox calls"
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Paper />
      <RenderBox at={tRender} />
      <Node at={0.1} x={70} y={300} w={300} h={180} title="Any AI agent" sub="a shopper's assistant" />
      <Edge at={0.5} d="M370 390 H468" label="MCP" />
      <Node at={0.7} x={470} y={290} w={300} h={200} title="MCP tools" sub="IDs and quantities in. No price, no total." />
      <Edge at={1.15} d="M770 390 H858" />
      <Node at={1.3} x={860} y={230} w={560} h={320} title="Shopfront" tone="clay">
        <ul style={{ margin: 0, paddingLeft: 26, display: "grid", gap: 8, fontSize: 27, color: c.ink2, lineHeight: 1.25 }}>
          <li>Prices and totals come from the database</li>
          <li>A checkout state machine in plain code</li>
          <li>Webhooks verified, processed once</li>
          <CodeLine at={tCode}>Only this code moves money</CodeLine>
        </ul>
      </Node>
      <Edge at={1.75} d="M1420 350 H1578" label="Orders" lx={44} ly={-14} />
      <Edge at={2.15} d="M1578 460 H1420" label="Webhooks" lx={-130} ly={34} dashed />
      <PayPalNode at={1.9} />
      <ModelNode at={tModel} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, display: "flex", justifyContent: "center", gap: 36 }}>
        <Stat at={tTested} value={CHECKS} label="checks against this live deployment" />
        <Stat at={tPayPal} value={0} label="mismatches with PayPal" ok />
      </div>
    </AbsoluteFill>
  );
}

function Node({ at, x, y, w, h, title, sub, tone, children }: { at: number; x: number; y: number; w: number; h: number; title: string; sub?: string; tone?: "clay"; children?: ReactNode }) {
  const e = useIn(at, 0.5);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: e, transform: `translateY(${(1 - e) * 14}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: c.surface, border: `2px solid ${tone === "clay" ? c.clay : c.line}`, borderRadius: 22, padding: "22px 26px", boxShadow: "0 12px 30px -12px rgb(40 25 15 / 0.18)", fontFamily: sans, display: "grid", alignContent: "start", gap: 12 }}>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 40, color: tone === "clay" ? c.clay : c.ink, letterSpacing: "-0.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 26, color: c.ink2, lineHeight: 1.28 }}>{sub}</div>}
        {children}
      </div>
      <Pulse at={at + 0.15} />
    </div>
  );
}

function CodeLine({ at, children }: { at: number; children: ReactNode }) {
  const e = useIn(at, 0.5);
  return (
    <li style={{ position: "relative", color: c.ink, fontWeight: 700 }}>
      <span style={{ background: `oklch(0.955 0.03 40 / ${e})`, borderRadius: 8, padding: "2px 8px", margin: "0 -8px", boxShadow: `0 0 0 2px color-mix(in oklch, ${c.clay} ${Math.round(80 * e)}%, transparent)` }}>{children}</span>
    </li>
  );
}

function PayPalNode({ at }: { at: number }) {
  const items = ["Orders v2", "Webhooks", "Catalog", "Cart API"];
  return (
    <Node at={at} x={1580} y={250} w={300} h={300} title="PayPal">
      <div style={{ display: "grid", gap: 9 }}>
        {items.map((t, i) => (
          <Rise key={t} at={at + 0.2 + i * 0.1} dy={10}>
            <div style={{ fontSize: 25, fontWeight: 500, color: "oklch(0.36 0.12 255)", background: "oklch(0.95 0.025 255)", borderRadius: 10, padding: "5px 12px" }}>{t}</div>
          </Rise>
        ))}
      </div>
    </Node>
  );
}

function ModelNode({ at }: { at: number }) {
  const e = useIn(at, 0.5);
  const b = useIn(at + 0.45, 0.4);
  return (
    <>
      <Edge at={at + 0.2} d="M1140 640 V556" dashed />
      <div style={{ position: "absolute", left: 860, top: 640, width: 560, height: 92, opacity: e, transform: `translateY(${(1 - e) * 14}px)` }}>
        <div style={{ height: "100%", borderRadius: 18, border: `2px dashed oklch(0.75 0.01 45)`, background: "oklch(0.975 0.006 70)", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", fontFamily: sans, whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: c.ink }}>AI models</div>
          <div style={{ fontSize: 24, color: c.ink2 }}>drafts, chat, answers</div>
          <div style={{ marginLeft: "auto", fontSize: 23, fontWeight: 700, color: c.danger, background: "oklch(0.955 0.03 27)", padding: "6px 14px", borderRadius: 999, opacity: b }}>no money tools</div>
        </div>
        <Pulse at={at + 0.15} radius={18} />
      </div>
    </>
  );
}

function RenderBox({ at }: { at: number }) {
  const s = useSec();
  const p = interpolate(s, [at, at + 1.0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.soft });
  const w = 1000;
  const h = 560;
  const per = 2 * (w + h);
  return (
    <>
      <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
        <rect x={440} y={200} width={w} height={h} rx={30} fill={`oklch(0.955 0.03 40 / ${0.5 * p})`} stroke={c.clay} strokeWidth={3} strokeDasharray={`${per * p} ${per}`} />
      </svg>
      <div style={{ position: "absolute", left: 466, top: 150, opacity: p, fontFamily: sans, fontSize: 30, fontWeight: 700, color: c.clay }}>One free Render service runs the whole app</div>
    </>
  );
}

function Edge({ at, d, label, dashed, lx = 8, ly = -14 }: { at: number; d: string; label?: string; dashed?: boolean; lx?: number; ly?: number }) {
  const p = useIn(at, 0.45);
  const [, x1, y1] = d.match(/M(\d+) (\d+)/)!.map(Number);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1920} height={1080}>
      <path d={d} stroke={c.ink2} strokeWidth={3} fill="none" pathLength={1} strokeDasharray={dashed ? "0.06 0.04" : `${p} 1`} opacity={dashed ? p : 1} />
      {label && (
        <text x={x1! + lx} y={y1! + ly} fontFamily={mono} fontSize={21} fill={c.ink2} opacity={p}>
          {label}
        </text>
      )}
    </svg>
  );
}

function Stat({ at, value, label, ok }: { at: number; value: number; label: string; ok?: boolean }) {
  const s = useSec();
  const e = useIn(at, 0.5);
  const n = Math.round(interpolate(s, [at, at + 1], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.out }));
  return (
    <div style={{ position: "relative", opacity: e, transform: `translateY(${(1 - e) * 14}px)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 20, padding: "16px 30px", fontFamily: sans, boxShadow: "0 12px 30px -12px rgb(40 25 15 / 0.18)" }}>
        <span style={{ fontFamily: display, fontWeight: 600, fontSize: 64, color: ok ? c.success : c.ink, fontVariantNumeric: "lining-nums tabular-nums" }}>{ok ? value : n}</span>
        <span style={{ fontSize: 30, fontWeight: 500, color: c.ink2 }}>{label}</span>
      </div>
      {ok && <Glow at={at + 0.3} color={c.success} radius={20} />}
    </div>
  );
}
