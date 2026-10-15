import "server-only";
import { newId } from "@shopfront/core";
import { and, desc, eq, inArray, schema } from "@shopfront/db";
import {
  geminiProvider,
  groqProvider,
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

/** Answers recorded from a live provider, looked up by input hash. Writes happen in `log` (one row per call). */
class AgentRunStore implements LlmCache, ReplayStore {
  async get(key: string) {
    const { db } = services();
    const [row] = await db
      .select({ output: schema.agentRuns.output })
      .from(schema.agentRuns)
      .where(and(eq(schema.agentRuns.inputHash, key), inArray(schema.agentRuns.provider, ["gemini", "groq"])))
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

function providers(list: string): LlmProvider[] {
  const e = env();
  const make: Record<string, () => LlmProvider | null> = {
    groq: () => (e.GROQ_API_KEY ? groqProvider(e.GROQ_API_KEY, e.GROQ_MODEL) : null),
    gemini: () => (e.GEMINI_API_KEY ? geminiProvider(e.GEMINI_API_KEY, e.GEMINI_MODEL) : null),
  };
  return list
    .split(",")
    .map((p) => make[p.trim()]?.())
    .filter((p): p is LlmProvider => !!p);
}

const g = globalThis as unknown as { __llm?: { agent: LlmRouter; vision: LlmRouter; long: LlmRouter } };

/**
 * `agent` = Groq → Gemini for tool calling and chat; `vision` = Gemini only (D-038); `long` = the agent chain
 * reversed, for prompts too large for Groq's free 8k tokens/minute (AG Studio turns, D-043). One shared budget.
 */
export function llm() {
  if (g.__llm) return g.__llm;
  const e = env();
  const store = new AgentRunStore();
  const budget = new MemoryBudget(e.LLM_MAX_CALLS_PER_DAY, e.LLM_MAX_CALLS_PER_IP_PER_HOUR);
  const base = { cache: store, replay: store, budget, mode: e.LLM_MODE, log: logRun };
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
