// Provider-agnostic LLM router (D-028, D-029).
// Order: cache → (budget check) → providers in order, each with backoff on 429/503 → recorded replay.
// Every finished call is reported to `log` with provider + model, so the timeline can badge it.
import { LlmProviderError, LlmUnavailableError } from './errors';
import { hashInput } from './hash';
import type {
  Attempt,
  BudgetGuard,
  CallRecord,
  ChatStep,
  ChatStepRequest,
  LlmCache,
  LlmProvider,
  LlmResult,
  ObjectRequest,
  ReplayStore,
  Usage,
} from './types';

export type LlmMode = 'live' | 'replay';

export interface RouterOptions {
  providers: LlmProvider[];
  cache: LlmCache;
  replay?: ReplayStore;
  budget?: BudgetGuard;
  mode?: LlmMode;
  log?: (record: CallRecord) => void | Promise<void>;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** When another provider is left, a wait longer than this (e.g. Groq's retry-after on its per-minute token cap)
   *  switches to that provider now instead of making the visitor wait (D-114). */
  maxWaitBeforeFallbackMs?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

type Need = { vision: boolean; tools: boolean };

export class LlmRouter {
  private readonly o: Required<Omit<RouterOptions, 'replay' | 'budget' | 'log'>> & Pick<RouterOptions, 'replay' | 'budget' | 'log'>;

  constructor(opts: RouterOptions) {
    this.o = {
      mode: 'live',
      maxRetries: 2,
      baseDelayMs: 600,
      maxDelayMs: 8000,
      maxWaitBeforeFallbackMs: 2500,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      random: Math.random,
      now: () => performance.now(),
      ...opts,
    };
  }

  /** Structured output (vision extraction, classification, drafts). Result is validated with the Zod schema. */
  async object<T>(req: ObjectRequest<T>, clientKey?: string): Promise<LlmResult<T>> {
    const inputHash = hashInput({
      kind: 'object',
      route: req.route,
      promptVersion: req.promptVersion,
      schemaName: req.schemaName,
      system: req.system,
      prompt: req.prompt,
      images: (req.images ?? []).map((i) => i.sha256),
    });
    return this.run<T>('object', req, inputHash, { vision: (req.images?.length ?? 0) > 0, tools: false }, clientKey, async (p) => {
      const { object, usage } = await p.generateObject(req as ObjectRequest<unknown>);
      return { value: req.schema.parse(object), usage };
    }, (raw) => req.schema.parse(raw));
  }

  /** One agent turn with tools. The caller runs the loop and executes tool calls through the MCP layer. */
  async chatStep(req: ChatStepRequest, clientKey?: string): Promise<LlmResult<ChatStep>> {
    const inputHash = hashInput({
      kind: 'chat_step',
      route: req.route,
      promptVersion: req.promptVersion,
      system: req.system,
      messages: req.messages,
      tools: req.tools.map((t) => ({ name: t.name, description: t.description })),
    });
    // Replay matches the conversation's shape, not live data: tool results (stock, ids, timestamps) are left out.
    const replayKey = hashInput({
      kind: 'chat_step_replay',
      route: req.route,
      promptVersion: req.promptVersion,
      system: req.system,
      messages: req.messages.map((m) =>
        m.role === 'tool'
          ? { role: 'tool', toolName: m.toolName }
          : m.role === 'assistant'
            ? { role: 'assistant', content: m.content, toolCalls: (m.toolCalls ?? []).map((c) => c.name) }
            : { role: m.role, content: m.content },
      ),
      tools: req.tools.map((t) => t.name),
    });
    return this.run<ChatStep>('chat_step', req, inputHash, { vision: false, tools: req.tools.length > 0 }, clientKey, async (p) => {
      const { step, usage } = await p.chatStep(req);
      return { value: step, usage };
    }, (raw) => raw as ChatStep, replayKey);
  }

  private async run<T>(
    kind: CallRecord['kind'],
    req: { route: CallRecord['route']; promptVersion: string },
    inputHash: string,
    need: Need,
    clientKey: string | undefined,
    call: (p: LlmProvider) => Promise<{ value: T; usage?: Usage }>,
    revive: (raw: unknown) => T,
    replayKey: string = inputHash,
  ): Promise<LlmResult<T>> {
    const t0 = this.o.now();
    const attempts: Attempt[] = [];
    const finish = async (r: Omit<LlmResult<T>, 'inputHash' | 'latencyMs' | 'attempts'>): Promise<LlmResult<T>> => {
      const result: LlmResult<T> = { ...r, inputHash, latencyMs: Math.round(this.o.now() - t0), attempts };
      await this.o.log?.({
        route: req.route,
        kind,
        promptVersion: req.promptVersion,
        inputHash,
        replayKey,
        source: result.source,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        attempts,
        fallbackReason: result.fallbackReason,
        usage: result.usage,
        output: result.value,
      });
      return result;
    };

    // 1. Cache
    const cached = await this.o.cache.get(inputHash);
    if (cached !== undefined) {
      try {
        return await finish({ value: revive(cached), source: 'cache', provider: null, model: null, fallbackReason: null });
      } catch {
        /* stale cache entry that no longer matches the schema: fall through to live */
      }
    }

    let fallbackReason: string | null = null;
    const replay = async (reason: string) => {
      const raw = await this.o.replay?.get(replayKey);
      if (raw === undefined) throw new LlmUnavailableError(`No live provider and no recorded answer (${reason}).`, attempts);
      return finish({ value: revive(raw), source: 'replay', provider: null, model: null, fallbackReason: reason });
    };

    // 2. Replay-only mode (zero live AI calls)
    if (this.o.mode === 'replay') return replay('mode:replay');

    // 3. Budget
    if (this.o.budget && !(await this.o.budget.tryConsume(req.route, clientKey))) return replay('budget');

    // 4. Providers in order, skipping those that lack a needed capability
    const eligible = this.o.providers.filter((p) => (!need.vision || p.capabilities.vision) && (!need.tools || p.capabilities.tools));
    for (const [i, p] of eligible.entries()) {
      for (let attempt = 0; attempt <= this.o.maxRetries; attempt++) {
        const ta = this.o.now();
        try {
          const { value, usage } = await call(p);
          attempts.push({ provider: p.id, model: p.model, ok: true, latencyMs: Math.round(this.o.now() - ta) });
          await this.o.cache.set(inputHash, value);
          return await finish({ value, source: p.id, provider: p.id, model: p.model, fallbackReason: i > 0 ? fallbackReason : null, usage });
        } catch (e) {
          const err = e instanceof LlmProviderError ? e : null;
          const status = err?.status;
          attempts.push({
            provider: p.id,
            model: p.model,
            ok: false,
            status,
            error: e instanceof Error ? e.message.slice(0, 300) : String(e),
            latencyMs: Math.round(this.o.now() - ta),
          });
          fallbackReason = `${p.id}:${status ?? (err ? 'error' : 'invalid_output')}`;
          const retryable = err?.retryable ?? false;
          if (!retryable || attempt === this.o.maxRetries) break; // next provider
          const backoff = Math.min(this.o.maxDelayMs, this.o.baseDelayMs * 2 ** attempt);
          const jittered = backoff / 2 + this.o.random() * (backoff / 2);
          const wait = Math.max(err?.retryAfterMs ?? 0, jittered);
          // A long retry-after: fall back now (next provider, else the recorded answer) rather than stall the visitor.
          if (wait > (i < eligible.length - 1 ? this.o.maxWaitBeforeFallbackMs : this.o.maxDelayMs)) break;
          await this.o.sleep(wait);
        }
      }
    }

    // 5. Recorded transcript, else give up
    return replay(fallbackReason ?? 'no_eligible_provider');
  }
}
