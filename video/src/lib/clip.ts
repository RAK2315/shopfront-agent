// Types for the capture sidecars (capture/capture.mts) and the voiceover files (voice/make-vo.mjs, voice/words.mjs).
export type Box = { x: number; y: number; width: number; height: number };
export type Mark = { at: number; track: string; box?: Box; kind?: string; [k: string]: unknown };
export type Track = { file: string; start: number; seconds: number; css: { w: number; h: number } };
export type Clip = { beat: string; fps: number; dpr: number; seconds: number; tracks: Record<string, Track>; marks: Record<string, Mark> };
export type Word = { w: string; start: number; end: number };

export const center = (b?: Box) => (b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : undefined);

export function mark(clip: Clip, key: string): Mark {
  const m = clip.marks[key];
  if (!m) throw new Error(`clip ${clip.beat} has no mark "${key}"`);
  return m;
}
