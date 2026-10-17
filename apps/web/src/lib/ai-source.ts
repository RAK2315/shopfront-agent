// Which AI answered a step, in plain words (REVIEW-1 #4). "Replayed recording" appears only when a recording
// actually served the step; "Answered before" is the exact same question answered earlier (the cache).
export type AiSource = "gemini" | "groq" | "cache" | "replay";

export const AI_SOURCE_LABEL: Record<AiSource, string> = {
  groq: "Live · Groq",
  gemini: "Live · Gemini",
  cache: "Answered before",
  replay: "Replayed recording",
};

export function aiSourceLabel(source: string | null | undefined): string | null {
  return source && source in AI_SOURCE_LABEL ? AI_SOURCE_LABEL[source as AiSource] : null;
}

/**
 * Timeline summary for one agent step. "fallback after X" is shown only for a real provider failure (for example
 * "groq:429"). Replay mode isn't a fallback: the step's source badge already says "Replayed recording".
 */
export function agentStepSummary(toolNames: string[], fallbackReason: string | null): string {
  const what = toolNames.length ? `Decided to call ${toolNames.join(", ")}` : "Replied to the shopper";
  return fallbackReason && fallbackReason !== "mode:replay" ? `${what} · fallback after ${fallbackReason}` : what;
}
