import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("./env", () => ({ env: () => ({ SESSION_SECRET: "test-secret-0123456789abcdef0123456789" }) }));
const stored = new Map<string, string>();
const lookups: string[] = [];
vi.mock("./services", () => ({
  services: () => ({
    db: {
      select: () => ({
        from: () => ({
          where: async (cond: { __id: string }) => {
            lookups.push(cond.__id);
            return stored.has(cond.__id) ? [{ hash: stored.get(cond.__id) }] : [];
          },
        }),
      }),
    },
  }),
}));
vi.mock("@shopfront/db", () => ({ schema: { checkouts: { orderTokenHash: "h", id: "id" } }, eq: (_: unknown, id: string) => ({ __id: id }) }));

const { hashToken, newOrderToken, sessionScopedRequestId, tokenMatchesHash, verifyOrderToken } = await import("./tokens");

const A = "chk_aaaaaaaaaaaa";
const B = "chk_bbbbbbbbbbbb";

beforeEach(() => {
  stored.clear();
  lookups.length = 0;
});

describe("order tokens (REVIEW-1 #2)", () => {
  it("can't be derived from the checkout id: without a key every token is fresh randomness", () => {
    const t1 = newOrderToken(A, null);
    const t2 = newOrderToken(A, null);
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(43);
    // The old scheme was HMAC(secret, "order-token:" + id). It must no longer verify for new checkouts.
    const old = createHmac("sha256", "test-secret-0123456789abcdef0123456789").update(`order-token:${A}`).digest("base64url");
    expect(old).not.toBe(t1);
  });

  it("with an idempotency key, the same caller gets the same token back, and nobody else does", () => {
    const key = "0b5c3f7e-2a41-4c8e-9d7f-1e2a3b4c5d6e";
    expect(newOrderToken(A, key)).toBe(newOrderToken(A, key));
    expect(newOrderToken(A, key)).not.toBe(newOrderToken(A, "1b5c3f7e-2a41-4c8e-9d7f-1e2a3b4c5d6e"));
    expect(newOrderToken(A, key)).not.toBe(newOrderToken(B, key));
  });

  it("verifies only against the hash stored for that exact checkout", async () => {
    const ta = newOrderToken(A, null);
    const tb = newOrderToken(B, null);
    stored.set(A, hashToken(ta));
    stored.set(B, hashToken(tb));
    expect(await verifyOrderToken(A, ta)).toBe(true);
    expect(await verifyOrderToken(A, tb)).toBe(false); // the attacker's own valid token, used on the victim's order
    expect(await verifyOrderToken(B, ta)).toBe(false);
    expect(await verifyOrderToken("chk_cccccccccccc", ta)).toBe(false); // unknown checkout
  });

  it("rejects missing tokens and malformed ids without touching the database", async () => {
    expect(await verifyOrderToken(A, null)).toBe(false);
    expect(await verifyOrderToken(A, "")).toBe(false);
    expect(await verifyOrderToken("chk_' or 1=1 --", "x".repeat(43))).toBe(false);
    expect(lookups).toEqual([]);
  });

  it("compares hashes safely whatever their length", () => {
    expect(tokenMatchesHash("abc", hashToken("abc"))).toBe(true);
    expect(tokenMatchesHash("abc", "00")).toBe(false);
    expect(tokenMatchesHash("abc", null)).toBe(false);
  });
});

describe("session-scoped idempotency keys", () => {
  const example = "123e4567-e89b-12d3-a456-426614174000"; // the UUID models love to copy from docs

  it("gives two shoppers using the same model-chosen key different, valid UUIDs", () => {
    const s1 = sessionScopedRequestId("bys_aaaaaaaaaaaa", example);
    const s2 = sessionScopedRequestId("bys_bbbbbbbbbbbb", example);
    expect(s1).not.toBe(s2);
    expect(z.uuid().safeParse(s1).success).toBe(true);
    expect(z.uuid().safeParse(s2).success).toBe(true);
  });

  it("is stable within one session, so the agent's own retry stays idempotent", () => {
    expect(sessionScopedRequestId("bys_aaaaaaaaaaaa", example)).toBe(sessionScopedRequestId("bys_aaaaaaaaaaaa", example));
  });
});
