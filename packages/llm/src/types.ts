import type { ZodType } from 'zod';

export type ProviderId = 'gemini' | 'groq' | 'fake';
/** Who actually produced an answer. Shown as a badge on the event timeline (D-029). */
export type AnswerSource = ProviderId | 'cache' | 'replay';

export type LlmRoute = 'cataloger' | 'buyer' | 'ops' | 'insights' | 'grid' | 'label' | 'refund_reason' | 'message';

export interface ImagePart {
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  data: Uint8Array;
  /** sha256 of the original bytes: part of the cache key, so identical photos never hit the API twice. */
  sha256: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolCalls?: ToolCall[];
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema (from MCP listTools or z.toJSONSchema). Args are validated again by the MCP layer before anything executes. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: unknown;
}

interface BaseRequest {
  route: LlmRoute;
  /** Bump when the prompt changes: invalidates the cache and recorded transcripts for this route. */
  promptVersion: string;
  system: string;
}

export interface ObjectRequest<T> extends BaseRequest {
  prompt: string;
  images?: ImagePart[];
  schema: ZodType<T>;
  schemaName: string;
}

export interface ChatStepRequest extends BaseRequest {
  messages: ChatMessage[];
  tools: ToolSpec[];
}

export interface ChatStep {
  text: string;
  toolCalls: ToolCall[];
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ProviderCapabilities {
  vision: boolean;
  tools: boolean;
  structuredOutput: boolean;
}

/** One provider = one model behind one API. Implementations wrap the Vercel AI SDK (gemini, groq). */
export interface LlmProvider {
  readonly id: ProviderId;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  /** Must call the model with temperature 0 and native structured output when available. Returns raw JSON. */
  generateObject(req: ObjectRequest<unknown>): Promise<{ object: unknown; usage?: Usage }>;
  /** One model turn: text and/or proposed tool calls. The agent loop (and tool execution) lives outside. */
  chatStep(req: ChatStepRequest): Promise<{ step: ChatStep; usage?: Usage }>;
}

export interface Attempt {
  provider: ProviderId;
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
  latencyMs: number;
}

export interface LlmResult<T> {
  value: T;
  source: AnswerSource;
  provider: ProviderId | null;
  model: string | null;
  inputHash: string;
  latencyMs: number;
  attempts: Attempt[];
  /** Why we did not use the first-choice provider, e.g. "gemini:429" or "budget". */
  fallbackReason: string | null;
  usage?: Usage;
}

/** Persisted once per finished call (agent_runs table). */
export interface CallRecord {
  route: LlmRoute;
  kind: 'object' | 'chat_step';
  promptVersion: string;
  inputHash: string;
  /** Key for recorded-transcript replay: like inputHash, but tool-result contents are ignored (live data drifts). */
  replayKey?: string;
  source: AnswerSource;
  provider: ProviderId | null;
  model: string | null;
  latencyMs: number;
  attempts: Attempt[];
  fallbackReason: string | null;
  usage?: Usage;
  output: unknown;
}

export interface LlmCache {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

/** Recorded transcripts for zero-AI demo replay (D-029). Keyed by the same input hash as the cache. */
export interface ReplayStore {
  get(key: string): Promise<unknown | undefined>;
}

export interface BudgetGuard {
  /** Returns false when the free-tier budget (per day / per client) is exhausted. Counts the call if true. */
  tryConsume(route: LlmRoute, clientKey?: string): Promise<boolean>;
}
