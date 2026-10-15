// LlmProvider implementations over the Vercel AI SDK (verified against node_modules/ai/docs, AI SDK 7).
// The SDK's own retries are disabled (maxRetries: 0): the router owns backoff + fallback (D-029).
import { APICallError, generateText, jsonSchema, Output, tool, type ModelMessage } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LlmProviderError } from './errors';
import type { ChatMessage, ChatStepRequest, LlmProvider, ObjectRequest, ProviderId, ToolSpec } from './types';

type SdkModel = Parameters<typeof generateText>[0]['model'];

function toProviderError(provider: ProviderId, e: unknown): LlmProviderError {
  if (APICallError.isInstance(e)) {
    const retryAfter = Number(e.responseHeaders?.['retry-after']);
    return new LlmProviderError(
      provider,
      e.message.slice(0, 300),
      e.statusCode,
      e.isRetryable || e.statusCode === 429 || (e.statusCode ?? 0) >= 500,
      Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
    );
  }
  if (e instanceof LlmProviderError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  // Network/timeouts are retryable; schema/parse errors are not.
  const network = /fetch failed|ECONNRESET|ETIMEDOUT|timeout|aborted/i.test(msg);
  return new LlmProviderError(provider, msg.slice(0, 300), undefined, network);
}

export function toModelMessages(messages: ChatMessage[]): ModelMessage[] {
  return messages.map((m): ModelMessage => {
    if (m.role === 'user') return { role: 'user', content: m.content };
    if (m.role === 'assistant') {
      return {
        role: 'assistant',
        content: [
          ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
          ...(m.toolCalls ?? []).map((tc) => ({ type: 'tool-call' as const, toolCallId: tc.id, toolName: tc.name, input: tc.args })),
        ],
      };
    }
    let value: unknown;
    try {
      value = JSON.parse(m.content);
    } catch {
      value = m.content;
    }
    return {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: m.toolCallId ?? '',
          toolName: m.toolName ?? '',
          output: { type: 'json', value: value as never },
        },
      ],
    };
  });
}

function toSdkTools(tools: ToolSpec[]) {
  // No `execute`: the model only proposes calls; our agent loop runs them through the MCP layer.
  return Object.fromEntries(
    tools.map((t) => [t.name, tool({ description: t.description, inputSchema: jsonSchema(t.parameters as never) })]),
  );
}

interface SdkProviderOptions {
  id: ProviderId;
  model: string;
  sdkModel: SdkModel;
  vision: boolean;
  providerOptions?: Record<string, Record<string, unknown>>;
  timeoutMs?: number;
}

class SdkProvider implements LlmProvider {
  readonly id: ProviderId;
  readonly model: string;
  readonly capabilities;
  constructor(private readonly o: SdkProviderOptions) {
    this.id = o.id;
    this.model = o.model;
    this.capabilities = { vision: o.vision, tools: true, structuredOutput: true };
  }

  async generateObject(req: ObjectRequest<unknown>) {
    try {
      const content = [
        { type: 'text' as const, text: req.prompt },
        ...(req.images ?? []).map((i) => ({ type: 'file' as const, mediaType: i.mime, data: i.data })),
      ];
      const r = await generateText({
        model: this.o.sdkModel,
        system: req.system,
        messages: [{ role: 'user', content }],
        output: Output.object({ schema: req.schema as never }),
        temperature: 0,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(this.o.timeoutMs ?? 45_000),
        providerOptions: this.o.providerOptions as never,
      });
      return { object: r.output, usage: { inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens } };
    } catch (e) {
      throw toProviderError(this.id, e);
    }
  }

  async chatStep(req: ChatStepRequest) {
    try {
      const r = await generateText({
        model: this.o.sdkModel,
        system: req.system,
        messages: toModelMessages(req.messages),
        tools: toSdkTools(req.tools),
        temperature: 0,
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(this.o.timeoutMs ?? 30_000),
        providerOptions: this.o.providerOptions as never,
      });
      return {
        step: {
          text: r.text,
          toolCalls: r.toolCalls.map((tc) => ({ id: tc.toolCallId, name: tc.toolName, args: tc.input })),
        },
        usage: { inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens },
      };
    } catch (e) {
      throw toProviderError(this.id, e);
    }
  }
}

export function groqProvider(apiKey: string, model: string): LlmProvider {
  const groq = createGroq({ apiKey });
  return new SdkProvider({
    id: 'groq',
    model,
    sdkModel: groq(model),
    vision: false,
    providerOptions: { groq: { reasoningEffort: 'low', structuredOutputs: true } },
  });
}

export function geminiProvider(apiKey: string, model: string): LlmProvider {
  const google = createGoogleGenerativeAI({ apiKey });
  return new SdkProvider({
    id: 'gemini',
    model,
    sdkModel: google(model),
    vision: true,
    // Gemini 3.x thinks by default; minimal thinking cuts free-tier latency (D-038).
    providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } },
    timeoutMs: 60_000,
  });
}
