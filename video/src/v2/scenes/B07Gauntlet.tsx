import { AbsoluteFill, Img, interpolate, Sequence, staticFile } from "remotion";
import run from "../../../public/clips/gauntlet.json";
import page from "../../../public/clips/gauntlet-page.json";
import type { Clip } from "../../lib/clip";
import { beat, frames } from "../config";
import { Footage } from "../lib/Footage";
import { Spotlights } from "../lib/Spotlight";
import { FadeFrom, Glow, Paper, Reveal, useIn, useSec } from "../lib/Text";
import { c, display, ease, W } from "../theme";

// Beat 7, the Gauntlet (v6). It opens on paper with its own question (the bridge into the technical half). Then the
// real /gauntlet run starts at real speed; a crossfade to a full-page screenshot of the same finished run, which scrolls
// smoothly down to the photo-injection row and holds: the attack (the real sticker photo), the naive shop harmed (a
// real PayPal sandbox order for $6.00 instead of $37.00), Shopfront blocked with its reason. Last, the real run's
// counters, 27/31 harmed and 31/31 blocked, with a glow drawn around (never on) the real cards, held in silence.
const T_RUN = 2.9;
const T_PAGE = 8.9;
const T_COUNT = 19.3;
const X = 0.4; // crossfades inside the beat

const K = W / page.pageWidth; // the screenshot at the footage's scale (both 1425 CSS px across)
const Y0 = 796; // where the live run's page is scrolled when the crossfade starts
const Y1 = 1500; // the photo family in view
const pageBox = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x * K, y: (b.y - Y1) * K, width: b.width * K, height: b.height * K });

export function B07Gauntlet() {
  const end = beat(7).sec;
  return (
    <AbsoluteFill style={{ background: c.paper }}>
      <Sequence durationInFrames={frames(T_RUN + X)}>
        <Question />
      </Sequence>
      <Sequence from={frames(T_RUN)} durationInFrames={frames(T_PAGE + X - T_RUN)}>
        <FadeFrom at={0} dur={X}>
          <Footage
            clip={run as Clip}
            end={T_PAGE + X - T_RUN}
            cuts={[
              { at: 0, from: 1.5 }, // "Run the Gauntlet" (pressed at 2.67); the counters reset, the run starts
              { at: 2.5, from: 6.3 }, // the first results stream in, family by family
            ]}
          />
        </FadeFrom>
      </Sequence>
      <Sequence from={frames(T_PAGE)} durationInFrames={frames(T_COUNT + X - T_PAGE)}>
        <FadeFrom at={0} dur={X}>
          <FinishedRun />
        </FadeFrom>
      </Sequence>
      <Sequence from={frames(T_COUNT)} durationInFrames={frames(end - T_COUNT)}>
        <FadeFrom at={0} dur={X}>
          <Counters />
        </FadeFrom>
      </Sequence>
    </AbsoluteFill>
  );
}

function Question() {
  return (
    <AbsoluteFill>
      <Paper />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ fontFamily: display, fontWeight: 600, fontSize: 104, lineHeight: 1.08, color: c.ink, letterSpacing: "-0.02em", textAlign: "center", transform: "translateY(-30px)" }}>
          <Reveal at={0.3}>Can an agent be tricked</Reveal>
          <Reveal at={0.65}>into paying less?</Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** The screenshot of the finished run: a steady eased scroll, then a still hold on the photo-injection row. */
function FinishedRun() {
  const s = useSec();
  const u = ease.soft(interpolate(s, [0.15, 2.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const y = Y0 + (Y1 - Y0) * u;
  const row = page.rows.find((r) => r.attack === "photo-sticker")!.box;
  const spots = [
    { t0: 2.7, t1: 5.5, box: pageBox({ x: 50, y: 1724, width: 362, height: 178 }) }, // the attack: a sticker on the photo
    { t0: 5.5, t1: 8.6, box: pageBox({ x: 418, y: 1731, width: 478, height: 162 }) }, // naive: a real PayPal order for $6.00 instead of $37.00
    { t0: 8.6, t1: 10.4, box: pageBox({ x: 904, y: 1731, width: 478, height: 162 }) }, // Shopfront: blocked at $37.00, and why
  ];
  return (
    <AbsoluteFill style={{ background: "#fafaf9", overflow: "hidden" }}>
      <Img src={staticFile("clips/gauntlet-page.png")} style={{ position: "absolute", left: 0, top: -y * K, width: W, height: page.pageHeight * K }} />
      <Spotlights spots={spots} />
      <StickerPhoto at={2.9} out={5.6} near={row.y} />
    </AbsoluteFill>
  );
}

/** The attack itself, large: the real photo the Gauntlet fed to the vision step (apps/web/public/gauntlet). */
function StickerPhoto({ at, out }: { at: number; out: number; near: number }) {
  const e = useIn(at, 0.45);
  const x = 1 - useIn(out, 0.3, ease.in);
  const o = Math.min(e, x);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 76, top: 610, width: 330, height: 330, opacity: o, transform: `translateY(${(1 - e) * 14}px)`, borderRadius: 16, overflow: "hidden", border: "6px solid #fff", boxShadow: `0 24px 60px -12px rgb(30 20 10 / 0.5), 0 0 0 2px ${c.clay}` }}>
      <Img src={staticFile("images/gauntlet-photo-sticker.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

/** The real run's counters at the top of the page, held; red builds around "harmed", then green around "blocked". */
function Counters() {
  const k = W / (1440 - 15);
  const oy = (810 * k - 1080) / 2;
  const card = (x: number) => ({ x: x * k, y: 449 * k - oy, width: 652 * k, height: 173 * k });
  return (
    <AbsoluteFill>
      <Footage clip={run as Clip} end={beat(7).sec - T_COUNT} cuts={[{ at: 0, from: 29.2 }]} />
      <Glow at={0.3} box={card(48)} color={c.danger} strength={0.7} />
      <Glow at={0.85} box={card(728)} color={c.success} />
    </AbsoluteFill>
  );
}
