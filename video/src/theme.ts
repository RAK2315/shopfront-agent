import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";

// The app's own tokens (apps/web/DESIGN.md); Remotion renders in Chromium, so OKLCH works as-is.
export const display = loadAlegreya("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;
export const ui = loadGeist("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;
export const c = {
  canvas: "oklch(0.985 0 0)",
  ink: "oklch(0.22 0.012 45)",
  ink2: "oklch(0.42 0.012 45)",
  clay: "oklch(0.56 0.14 40)",
  panel: "oklch(0.19 0.01 45)",
  panelText: "oklch(0.94 0.004 45)",
  panelMuted: "oklch(0.72 0.01 45)",
};
