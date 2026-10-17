import { describe, expect, it } from "vitest";
import { agentLabel } from "./agent-label";

describe("agentLabel", () => {
  it("names known agents in plain words", () => {
    expect(agentLabel("shopfront-web-agent")).toBe("our demo shopping agent");
    expect(agentLabel("Claude-User")).toBe("Claude");
  });
  it("shows any other agent by its own name, and nothing when unknown", () => {
    expect(agentLabel("claude-code")).toBe("claude-code");
    expect(agentLabel(null)).toBeNull();
  });
});
