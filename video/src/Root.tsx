import { Composition, staticFile } from "remotion";
import { TestClip } from "./TestClip";
import clip from "../public/clips/split-shop.json";

export const FPS = 30;

export function Root() {
  return (
    <Composition
      id="TestClip"
      component={TestClip}
      durationInFrames={20 * FPS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ src: staticFile("clips/split-shop.mp4"), seconds: clip.seconds, marks: clip.marks }}
    />
  );
}
