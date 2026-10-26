import { Composition } from "remotion";
import { frames, TOTAL_SEC } from "./config";
import { Main } from "./Main";
import { FPS, H, W } from "./theme";
import { lengthOf, MainV2 } from "./v2/Main";

const PREVIEW = [3, 4];

export function Root() {
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={frames(TOTAL_SEC)} fps={FPS} width={W} height={H} />
      <Composition id="MainV2" component={MainV2} durationInFrames={Math.round(lengthOf() * FPS)} fps={FPS} width={W} height={H} defaultProps={{}} />
      {/* Caption-free stills for the Devpost gallery: npx remotion still StillV2 --props='{"only":[5]}' --frame=N */}
      <Composition id="StillV2" component={MainV2} durationInFrames={Math.round(lengthOf() * FPS)} fps={FPS} width={W} height={H} defaultProps={{ captions: false }} />
      <Composition id="PreviewV2" component={MainV2} durationInFrames={Math.round(lengthOf(PREVIEW) * FPS)} fps={FPS} width={W} height={H} defaultProps={{ only: PREVIEW }} />
    </>
  );
}
