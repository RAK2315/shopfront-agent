import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadAlegreyaSans } from "@remotion/google-fonts/AlegreyaSans";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { Easing } from "remotion";

// v2 (D-110): Alegreya for headlines, Alegreya Sans for supporting text and captions (the same family, open source);
// the app's own fonts stay inside the footage. loadFont() holds rendering until the files are in.
export const display = loadAlegreya("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const sans = loadAlegreyaSans("normal", { weights: ["400", "500", "700"], subsets: ["latin"] }).fontFamily;
export const mono = loadGeistMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const c = {
  paper: "oklch(0.965 0.012 75)",
  canvas: "oklch(0.985 0 0)",
  surface: "oklch(1 0 0)",
  ink: "oklch(0.22 0.012 45)",
  ink2: "oklch(0.34 0.012 45)", // supporting text: strong contrast, never faint grey
  line: "oklch(0.88 0.008 45)",
  clay: "oklch(0.56 0.14 40)",
  claySoft: "oklch(0.955 0.03 40)",
  success: "oklch(0.5 0.11 150)",
  danger: "oklch(0.53 0.17 27)",
  panel: "oklch(0.19 0.01 45)",
  panelText: "oklch(0.95 0.004 45)",
  panelMuted: "oklch(0.74 0.01 45)",
  panelLine: "oklch(0.3 0.01 45)",
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;

// Motion (D-110): smooth deceleration, no steep ease-in-out on short moves, no overshoot.
export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1), // entrances, spotlights, captions
  soft: Easing.bezier(0.33, 0, 0.15, 1), // longer moves (the cursor's glide, a scroll): gentle start, long settle
  in: Easing.bezier(0.5, 0, 0.75, 0), // exits only, short
};
