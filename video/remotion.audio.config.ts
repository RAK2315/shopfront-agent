import { Config } from "@remotion/cli/config";
// Audio-only render of the voiceover and clicks (no CRF, which aac rejects).
Config.setCodec("aac");
