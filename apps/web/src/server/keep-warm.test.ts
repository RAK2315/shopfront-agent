import { describe, expect, it } from "vitest";
import { keepWarmTarget } from "./keep-warm";

const app = "https://shopfront-agent.onrender.com";
const nov = new Date("2026-11-20T12:00:00Z");

describe("keepWarmTarget (D-114)", () => {
  it("pings the public live-health route on Render during judging", () => {
    expect(keepWarmTarget({ RENDER: "true", APP_URL: app }, nov)).toBe(`${app}/api/health/live`);
  });

  it("never runs off Render (local dev, scripts)", () => {
    expect(keepWarmTarget({ APP_URL: app }, nov)).toBeNull();
  });

  it("stops after the judging window", () => {
    expect(keepWarmTarget({ RENDER: "true", APP_URL: app }, new Date("2026-12-16T00:00:00Z"))).toBeNull();
  });

  it("refuses a missing, malformed or plain-http APP_URL", () => {
    expect(keepWarmTarget({ RENDER: "true" }, nov)).toBeNull();
    expect(keepWarmTarget({ RENDER: "true", APP_URL: "not a url" }, nov)).toBeNull();
    expect(keepWarmTarget({ RENDER: "true", APP_URL: "http://localhost:3000" }, nov)).toBeNull();
  });
});
