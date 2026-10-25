import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import clip from "../../public/clips/studio-publish.json";
import type { Clip } from "../lib/clip";
import { Footage, type Seg } from "../lib/Footage";
import { ease, FPS } from "../theme";

// Beat 3, Photo → listing (18 s): the real /studio take (D-106: the green mug published once, on camera).
// Capture seconds → beat seconds: idle stretches are cut where the page is still; the Gemini read and the publish
// call are sped up and labelled.
const C = clip as Clip;
export const SEGS: Seg[] = [
  { from: 3.6, to: 5.2 }, // the drop zone; the photo lands at 4.68
  { from: 5.2, to: 11.0, rate: 4, label: "4× speed" }, // "Reading the photo…" (Gemini, live: 3.7 s)
  { from: 11.0, to: 13.4 }, // the draft card fills, AI tags on every field
  { from: 16.9, to: 19.4 }, // scroll to the price block: "AI guess · confirm before publishing"
  { from: 20.9, to: 25.6, rate: 1.5, label: "1.5× speed" }, // she types $36, stock 6, Confirm price
  { from: 25.6, to: 29.3, rate: 1.5, label: "1.5× speed" }, // confirmed; Publish
  { from: 29.3, to: 32.9, rate: 2, label: "2× speed" }, // publishing to the shop and PayPal's catalog
  { from: 32.9, to: 35.55 }, // live, mirrored to PayPal's catalog, with the catalog id
];

export function B03Listing() {
  return (
    <AbsoluteFill>
      <Footage
        clip={C}
        segs={SEGS}
        cams={[
          { t: 0, zoom: 1, x: 720, y: 405 },
          { t: 1.5, zoom: 1.08, x: 712, y: 420 },
          { t: 2.9, zoom: 1.0, x: 720, y: 405 },
          { t: 4.0, zoom: 1.0, x: 720, y: 405 },
          { t: 5.2, zoom: 1.32, x: 950, y: 470 },
          { t: 6.0, zoom: 1.15, x: 950, y: 430 },
          { t: 7.0, zoom: 1.15, x: 950, y: 430 },
          { t: 7.7, zoom: 1.8, x: 1035, y: 412 },
          { t: 8.5, zoom: 1.8, x: 1035, y: 412 },
          { t: 9.2, zoom: 1.32, x: 950, y: 440 },
          { t: 11.2, zoom: 1.32, x: 950, y: 440 },
          { t: 12.3, zoom: 1.12, x: 900, y: 420 },
          { t: 15.3, zoom: 1.12, x: 760, y: 410 },
          { t: 16.3, zoom: 1.7, x: 520, y: 410 },
        ]}
        rings={[
          { t0: 7.4, t1: 8.9, box: { x: 926, y: 399, width: 220, height: 20 } },
          { t0: 16.0, t1: 18.0, box: { x: 249, y: 423, width: 231, height: 24 } },
        ]}
      />
      <PhotoDrop at={0.15} land={1.05} />
    </AbsoluteFill>
  );
}

/** The photo card arcs in from the corner and drops into the upload zone just before the real upload starts. */
function PhotoDrop({ at, land }: { at: number; land: number }) {
  const f = useCurrentFrame();
  const s = f / FPS;
  const u = interpolate(s, [at, land], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.hand });
  const o = interpolate(s, [at, at + 0.15, land, land + 0.2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  const from = { x: 1560, y: 1020 };
  const to = { x: 958, y: 560 };
  const ctrl = { x: 1500, y: 560 };
  const x = (1 - u) ** 2 * from.x + 2 * (1 - u) * u * ctrl.x + u * u * to.x;
  const y = (1 - u) ** 2 * from.y + 2 * (1 - u) * u * ctrl.y + u * u * to.y;
  const sc = 1 - 0.55 * u;
  return (
    <div style={{ position: "absolute", left: x - 150, top: y - 150, width: 300, height: 300, opacity: o, transform: `scale(${sc}) rotate(${8 - 8 * u}deg)`, borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 60px rgb(0 0 0 / 0.3)", border: "6px solid #fff" }}>
      <Img src={staticFile("products/mug.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}
