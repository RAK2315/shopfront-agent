import { describe, expect, it } from "vitest";
import { agentStepSummary, aiSourceLabel } from "./ai-source";

describe("AI source wording (REVIEW-1 #4)", () => {
  it("names a replay only when a recording served the step", () => {
    expect(aiSourceLabel("replay")).toBe("Replayed recording");
    expect(aiSourceLabel("cache")).toBe("Answered before");
    expect(aiSourceLabel("groq")).toBe("Live · Groq");
    expect(aiSourceLabel(null)).toBeNull();
    expect(aiSourceLabel("something-else")).toBeNull();
  });

  it("never calls replay mode a fallback, but keeps real provider failures", () => {
    expect(agentStepSummary(["search_products"], "mode:replay")).toBe("Decided to call search_products");
    expect(agentStepSummary([], null)).toBe("Replied to the shopper");
    expect(agentStepSummary([], "groq:429")).toBe("Replied to the shopper · fallback after groq:429");
  });
});
