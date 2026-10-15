import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { LlmRouter } from './router';
import { LlmProviderError, LlmUnavailableError } from './errors';
import { MemoryBudget, MemoryStore } from './memory';
import type { CallRecord, LlmProvider, ObjectRequest, ProviderId } from './types';

const Extraction = z.object({ title: z.string(), confidence: z.number() });
const req: ObjectRequest<z.infer<typeof Extraction>> = {
  route: 'cataloger',
  promptVersion: 'v1',
  system: 'Extract a listing.',
  prompt: 'photo',
  schema: Extraction,
  schemaName: 'Extraction',
};
const visionReq = { ...req, images: [{ mime: 'image/png' as const, data: new Uint8Array([1, 2, 3]), sha256: 'abc' }] };

function fake(id: ProviderId, behaviour: Array<unknown | Error>, caps = { vision: true, tools: true, structuredOutput: true }) {
  const calls: number[] = [];
  const queue = [...behaviour];
  const p: LlmProvider & { calls: number[] } = {
    id,
    model: `${id}-model`,
    capabilities: caps,
    calls,
    async generateObject() {
      calls.push(Date.now());
      const next = queue.length > 1 ? queue.shift() : queue[0];
      if (next instanceof Error) throw next;
      return { object: next, usage: { inputTokens: 10, outputTokens: 5 } };
    },
    async chatStep() {
      calls.push(Date.now());
      const next = queue.length > 1 ? queue.shift() : queue[0];
      if (next instanceof Error) throw next;
      return { step: next as { text: string; toolCalls: [] } };
    },
  };
  return p;
}

const ok = { title: 'Blue mug', confidence: 0.9 };
const rate = (id: ProviderId, retryAfterMs?: number) => new LlmProviderError(id, 'rate limited', 429, true, retryAfterMs);
const overloaded = (id: ProviderId) => new LlmProviderError(id, 'overloaded', 503);

function makeRouter(providers: LlmProvider[], extra: Partial<ConstructorParameters<typeof LlmRouter>[0]> = {}) {
  const log: CallRecord[] = [];
  const sleep = vi.fn(async () => {});
  const cache = new MemoryStore();
  const router = new LlmRouter({ providers, cache, sleep, random: () => 0.5, log: (r) => void log.push(r), ...extra });
  return { router, log, sleep, cache };
}

describe('LlmRouter resilience chain (D-029)', () => {
  it('uses the primary provider and logs provider + model', async () => {
    const gemini = fake('gemini', [ok]);
    const { router, log } = makeRouter([gemini, fake('groq', [ok])]);
    const r = await router.object(req);
    expect(r).toMatchObject({ value: ok, source: 'gemini', provider: 'gemini', model: 'gemini-model', fallbackReason: null });
    expect(log[0]).toMatchObject({ route: 'cataloger', source: 'gemini', model: 'gemini-model' });
  });

  it('serves identical input from cache with zero provider calls', async () => {
    const gemini = fake('gemini', [ok]);
    const { router } = makeRouter([gemini]);
    await router.object(visionReq);
    const second = await router.object(visionReq);
    expect(second.source).toBe('cache');
    expect(gemini.calls).toHaveLength(1);
  });

  it('backs off on 429 (honouring retry-after) and then succeeds on the same provider', async () => {
    const gemini = fake('gemini', [rate('gemini', 2000), ok]);
    const { router, sleep } = makeRouter([gemini]);
    const r = await router.object(req);
    expect(r.source).toBe('gemini');
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(r.attempts.map((a) => a.ok)).toEqual([false, true]);
  });

  it('fails over to Groq after retries are exhausted and records why', async () => {
    const gemini = fake('gemini', [overloaded('gemini')]);
    const groq = fake('groq', [ok]);
    const { router, sleep } = makeRouter([gemini, groq]);
    const r = await router.object(req);
    expect(r).toMatchObject({ source: 'groq', fallbackReason: 'gemini:503' });
    expect(gemini.calls).toHaveLength(3); // 1 + 2 retries
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('skips providers without vision for image requests', async () => {
    const gemini = fake('gemini', [rate('gemini')]);
    const groq = fake('groq', [ok], { vision: false, tools: true, structuredOutput: true });
    const replay = new MemoryStore();
    const { router } = makeRouter([gemini, groq], { replay });
    await expect(router.object(visionReq)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(groq.calls).toHaveLength(0);
  });

  it('treats schema-invalid output as a provider failure (no retry, next provider)', async () => {
    const gemini = fake('gemini', [{ title: 42 }]);
    const groq = fake('groq', [ok]);
    const { router } = makeRouter([gemini, groq]);
    const r = await router.object(req);
    expect(r).toMatchObject({ source: 'groq', fallbackReason: 'gemini:invalid_output' });
    expect(gemini.calls).toHaveLength(1);
  });

  it('falls back to a recorded transcript when every provider fails', async () => {
    const replay = new MemoryStore();
    const probe = makeRouter([fake('gemini', [ok])]);
    const recorded = await probe.router.object(req);
    await replay.set(recorded.inputHash, ok);

    const { router } = makeRouter([fake('gemini', [rate('gemini')]), fake('groq', [rate('groq')])], { replay });
    const r = await router.object(req);
    expect(r).toMatchObject({ source: 'replay', value: ok, fallbackReason: 'groq:429' });
  });

  it('replay mode never calls a provider (zero live AI demo)', async () => {
    const gemini = fake('gemini', [ok]);
    const replay = new MemoryStore();
    const probe = makeRouter([fake('gemini', [ok])]);
    await replay.set((await probe.router.object(req)).inputHash, ok);
    const { router } = makeRouter([gemini], { replay, mode: 'replay' });
    expect((await router.object(req)).source).toBe('replay');
    expect(gemini.calls).toHaveLength(0);
  });

  it('respects the free-tier budget before calling providers', async () => {
    const gemini = fake('gemini', [ok]);
    const budget = new MemoryBudget(100, 1, () => 1_000_000);
    const { router } = makeRouter([gemini], { budget, replay: new MemoryStore() });
    await router.object({ ...req, prompt: 'a' }, 'ip-1');
    await expect(router.object({ ...req, prompt: 'b' }, 'ip-1')).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(gemini.calls).toHaveLength(1);
  });

  it('chatStep only uses tool-capable providers', async () => {
    const noTools = fake('gemini', [{ text: 'x', toolCalls: [] }], { vision: true, tools: false, structuredOutput: true });
    const groq = fake('groq', [{ text: '', toolCalls: [{ id: '1', name: 'search_products', args: { query: 'mug' } }] }]);
    const { router } = makeRouter([noTools, groq]);
    const r = await router.chatStep({
      route: 'buyer',
      promptVersion: 'v1',
      system: 's',
      messages: [{ role: 'user', content: 'blue mug' }],
      tools: [{ name: 'search_products', description: 'search', parameters: z.toJSONSchema(z.object({ query: z.string() })) }],
    });
    expect(r.source).toBe('groq');
    expect(r.value.toolCalls[0]!.name).toBe('search_products');
  });
});
