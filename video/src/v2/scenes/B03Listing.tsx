import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import clip from "../../../public/clips/studio-publish.json";
import type { Clip } from "../../lib/clip";
import { beat } from "../config";
import { Footage } from "../lib/Footage";
import { ease, FPS } from "../theme";

// Beat 3, photo → listing (v6): the real /studio take, still and full-frame; waits (the Gemini read, the scrolls, the
// publish call) are skipped by cutting. Context → action → result: the drop, the draft held with its AI fields lit,
// the price block lit while she types $36 and confirms, Publish, then "live" with PayPal's catalog id held.
const C = clip as Clip;

export function B03Listing() {
  const end = beat(3).sec;
  return (
    <AbsoluteFill>
      <Footage
        clip={C}
        end={end}
        cuts={[
          { at: 0, from: 3.1 }, // the drop zone; the photo lands at 4.68; "Uploading…", Gemini starts reading
          { at: 3.9, from: 14.3, move: { dur: 0.9, scroll: 335 } }, // scroll down to the draft (the read itself is cut)
          { at: 7.3, from: 19.35, move: { dur: 0.9, scroll: 639 } }, // scroll down to the price: AI guess, she types $36
          { at: 11.0, from: 24.7, move: { dur: 0.25 } }, // (the stock typed) Confirm price → confirmed
          { at: 13.85, from: 28.4, move: { dur: 0.6, scroll: 136 } }, // a little further (the take jumps at 27.05; the move starts before it): Publish (29.05)
          { at: 16.1, from: 32.7, move: { dur: 0.7, slide: 90 } }, // back up the page: live, mirrored to PayPal's catalog
        ]}
        spots={[
          { t0: 4.1, t1: 6.3, box: { x: 624, y: 332, width: 660, height: 310 } }, // fields filled by AI, each tagged
          { t0: 7.5, t1: 13.2, box: { x: 636, y: 317, width: 632, height: 176 } }, // "Your price · you decide"
          { t0: 16.4, t1: 19.1, box: { x: 136, y: 326, width: 1152, height: 157 } }, // "… is live", PayPal catalog id
        ]}
      />
      <PhotoDrop at={0.2} land={1.5} />
    </AbsoluteFill>
  );
}

/** The photo glides into the drop zone just before the real upload starts (the take used the file picker). */
function PhotoDrop({ at, land }: { at: number; land: number }) {
  const s = useCurrentFrame() / FPS;
  const u = ease.soft(interpolate(s, [at, land], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const o = interpolate(s, [at, at + 0.2, land, land + 0.25], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (o <= 0) return null;
  const from = { x: 1560, y: 980 };
  const to = { x: 959, y: 540 };
  const x = from.x + (to.x - from.x) * u;
  const y = from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 60;
  const size = 300 - 130 * u;
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: o, borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 40px rgb(0 0 0 / 0.22)", border: "5px solid #fff" }}>
      <Img src={staticFile("products/mug.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}
