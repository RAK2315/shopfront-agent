import { Composition } from "remotion";
import { frames, TOTAL_SEC } from "./config";
import { Main } from "./Main";
import { FPS, H, W } from "./theme";

export function Root() {
  return <Composition id="Main" component={Main} durationInFrames={frames(TOTAL_SEC)} fps={FPS} width={W} height={H} />;
}
