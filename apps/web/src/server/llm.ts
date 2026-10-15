import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, timingSafeEqual } from "node:crypto";
import { newId } from "@shopfront/core";
import { and, desc, eq, inArray, schema } from "@shopfront/db";
import {
  geminiProvider,
  groqProvider,
  LlmProviderError,
  LlmRouter,
  MemoryBudget,
  type CallRecord,
  type LlmCache,
  type LlmProvider,
  type ReplayStore,
} from "@shopfront/llm";
import { env } from "./env";
import { services } from "./services";

// The one door to an LLM (CLAUDE.md "llm.call budget guard"): cache → caps → provider chain → replay.
// Every finished call is one agent_runs row, which also serves as the cache and the replay store (D-029).

/** Answers recorded from a live provider. Writes happen in `log` (one row per call). */
class AgentRunStore implements LlmCache, ReplayStore {
  /** `by` = input_hash for the cache (exact input), replay_key for recorded-transcript replay (D-029, D-055). */
  constructor(private readonly by: "inputHash" | "replayKey") {}
  async get(key: string) {
    const { db } = services();
    const [row] = await db
      .select({ output: schema.agentRuns.output })
      .from(schema.agentRuns)
      .where(and(eq(schema.agentRuns[this.by], key), inArray(schema.agentRuns.provider, ["gemini", "groq"])))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(1);
    return row?.output ?? undefined;
  }
  async set() {
    /* the call log row is the cache entry */
  }
}

async function logRun(r: CallRecord) {
  try {
    await services().db.insert(schema.agentRuns).values({
      id: newId("agentRun"),
      route: r.route,
      provider: r.source,
      model: r.model ?? r.source,
      promptVersion: r.promptVersion,
      inputHash: r.inputHash,
      replayKey: r.replayKey ?? r.inputHash,
      output: r.output as never,
      latencyMs: r.latencyMs,
      inputTokens: r.usage?.inputTokens ?? null,
      outputTokens: r.usage?.outputTokens ?? null,
      cacheHit: r.source === "cache",
      fallbackReason: r.fallbackReason,
    });
  } catch (e) {
    console.error("agent_runs log failed", e);
  }
}

// ---------- test hook (AT-6): force one provider to answer 429 for a single request ----------
// Enabled only by a header signed with SESSION_SECRET, so nobody else can steer traffic or burn quota with it.
const forced = new AsyncLocalStorage<ReadonlySet<string>>();

export function forceFailureSignature(providersCsv: string) {
  return createHmac("sha256", env().SESSION_SECRET).update(`force-fail:${providersCsv}`).digest("base64url");
}

/** Runs `fn` with the providers named in a correctly signed `x-shopfront-force-fail` header failing with 429. */
export function withTestHooks<T>(req: Request, fn: () => Promise<T>): Promise<T> {
  const list = req.headers.get("x-shopfront-force-fail");
  const sig = req.headers.get("x-shopfront-test-sig");
  if (!list || !sig) return fn();
  const a = Buffer.from(forceFailureSignature(list));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return fn();
  return forced.run(new Set(list.split(",").map((x) => x.trim())), fn);
}

function hooked(p: LlmProvider): LlmProvider {
  const fail = () => {
    if (forced.getStore()?.has(p.id)) throw new LlmProviderError(p.id, "forced 429 (test hook)", 429, false);
  };
  return {
    id: p.id,
    model: p.model,
    capabilities: p.capabilities,
    generateObject: (req) => (fail(), p.generateObject(req)),
    chatStep: (req) => (fail(), p.chatStep(req)),
  };
}

function providers(list: string): LlmProvider[] {
  const e = env();
  const make: Record<string, () => LlmProvider | null> = {
    groq: () => (e.GROQ_API_KEY ? groqProvider(e.GROQ_API_KEY, e.GROQ_MODEL) : null),
    gemini: () => (e.GEMINI_API_KEY ? geminiProvider(e.GEMINI_API_KEY, e.GEMINI_MODEL) : null),
  };
  return list
    .split(",")
    .map((p) => make[p.trim()]?.())
    .filter((p): p is LlmProvider => !!p)
    .map(hooked);
}

const g = globalThis as unknown as { __llm?: { agent: LlmRouter; vision: LlmRouter; long: LlmRouter } };

/**
 * `agent` = Groq → Gemini for tool calling and chat; `vision` = Gemini only (D-038); `long` = the agent chain
 * reversed, for prompts too large for Groq's free 8k tokens/minute (AG Studio turns, D-043). One shared budget.
 */
export function llm() {
  if (g.__llm) return g.__llm;
  const e = env();
  const budget = new MemoryBudget(e.LLM_MAX_CALLS_PER_DAY, e.LLM_MAX_CALLS_PER_IP_PER_HOUR);
  const base = { cache: new AgentRunStore("inputHash"), replay: new AgentRunStore("replayKey"), budget, mode: e.LLM_MODE, log: logRun };
  g.__llm = {
    agent: new LlmRouter({ ...base, providers: providers(e.LLM_AGENT_PROVIDERS) }),
    vision: new LlmRouter({ ...base, providers: providers(e.LLM_VISION_PROVIDERS) }),
    long: new LlmRouter({ ...base, providers: providers(e.LLM_AGENT_PROVIDERS).reverse() }),
  };
  return g.__llm;
}

/** Client key for per-IP caps. Render puts the caller first in x-forwarded-for. */
export function clientKeyOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
