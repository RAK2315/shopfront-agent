import { describe, expect, it } from "vitest";
import { ByteLru } from "./byte-lru";

const entry = (n: number) => ({ bytes: new Uint8Array(n) });

describe("ByteLru", () => {
  it("returns what was stored", () => {
    const c = new ByteLru(100);
    const a = entry(10);
    c.set("a", a);
    expect(c.get("a")).toBe(a);
    expect(c.get("missing")).toBeUndefined();
  });
  it("evicts the least recently used entries to stay within the byte budget", () => {
    const c = new ByteLru(100);
    c.set("a", entry(40));
    c.set("b", entry(40));
    c.get("a"); // a is now more recent than b
    c.set("c", entry(40));
    expect(c.get("b")).toBeUndefined();
    expect(c.get("a")).toBeDefined();
    expect(c.get("c")).toBeDefined();
    expect(c.bytes).toBeLessThanOrEqual(100);
  });
  it("never caches an entry bigger than the whole budget", () => {
    const c = new ByteLru(100);
    c.set("big", entry(101));
    expect(c.get("big")).toBeUndefined();
    expect(c.bytes).toBe(0);
  });
  it("replacing a key does not double-count its bytes", () => {
    const c = new ByteLru(100);
    c.set("a", entry(30));
    c.set("a", entry(50));
    expect(c.bytes).toBe(50);
    expect(c.size).toBe(1);
  });
});
