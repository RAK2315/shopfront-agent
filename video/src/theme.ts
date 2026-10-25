import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { Easing } from "remotion";

// The app's own fonts and tokens (apps/web/DESIGN.md, globals.css). loadFont() holds rendering (delayRender) until
// the font files are in, so frame 0 never shows a fallback font.
export const display = loadAlegreya("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
export const ui = loadGeist("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const mono = loadGeistMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

export const c = {
  canvas: "oklch(0.985 0 0)",
  surface: "oklch(1 0 0)",
  surface2: "oklch(0.962 0.006 45)",
  line: "oklch(0.905 0.006 45)",
  ink: "oklch(0.22 0.012 45)",
  ink2: "oklch(0.42 0.012 45)",
  muted: "oklch(0.52 0.01 45)",
  clay: "oklch(0.56 0.14 40)",
  claySoft: "oklch(0.955 0.03 40)",
  success: "oklch(0.5 0.11 150)",
  successSoft: "oklch(0.955 0.035 150)",
  warning: "oklch(0.5 0.11 70)",
  danger: "oklch(0.53 0.17 27)",
  paypal: "oklch(0.33 0.13 262)",
  paypalBright: "oklch(0.55 0.19 255)",
  paypalSoft: "oklch(0.955 0.025 255)",
  panel: "oklch(0.19 0.01 45)",
  panel2: "oklch(0.235 0.01 45)",
  panelText: "oklch(0.94 0.004 45)",
  panelMuted: "oklch(0.72 0.01 45)",
  panelLine: "oklch(0.3 0.01 45)",
};

export const FPS = 30;
export const W = 1920;
export const H = 1080;

// Motion (launch-motion §3): nothing linear; entrances overshoot a touch; exits are faster and ease in; camera eases.
export const ease = {
  camera: Easing.bezier(0.65, 0, 0.35, 1), // easy ease
  out: Easing.bezier(0.16, 1, 0.3, 1),
  enter: Easing.bezier(0.34, 1.56, 0.64, 1), // slight overshoot
  exit: Easing.bezier(0.55, 0, 1, 0.45),
  hand: Easing.bezier(0.45, 0.05, 0.2, 1.08), // a hand: eases in, a tiny overshoot as it lands
};
