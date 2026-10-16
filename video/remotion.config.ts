import { Config } from "@remotion/cli/config";

// 1920×1080 at 30 fps, h264. Every product shot is real footage of the deployed app (D-057).
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(18);
