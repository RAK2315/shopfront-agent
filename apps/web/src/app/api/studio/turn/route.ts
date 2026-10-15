import { z } from "zod";
import { LlmUnavailableError, type ChatMessage, type ToolSpec } from "@shopfront/llm";
import { clientKeyOf, llm } from "@/server/llm";

export const dynamic = "force-dynamic";

// One AG Studio agent turn (D-023): Studio's harness runs in the browser and owns the loop and its tools,
// which only change dashboard views and widgets, never orders or money. This route is the model call
// behind our AgLlmAdapter, so it goes through the same budget guard, cache and Groq → Gemini chain as every LLM call.

const MAX_BODY = 400_000;
const PROMPT_VERSION = "studio-v1";

const Text = z.object({ type: z.string(), text: z.string().optional() }).loose();
const Item = z.union([
  z.object({ type: z.literal("message"), role: z.enum(["user", "system", "assistant"]), content: z.array(Text) }).loose(),
  z.object({ type: z.literal("function_call"), callId: z.string(), name: z.string(), arguments: z.string() }).loose(),
  z.object({ type: z.literal("function_call_output"), callId: z.string(), output: z.string() }).loose(),
  z.object({ type: z.literal("reasoning") }).loose(),
]);
const Body = z.object({
  input: z.array(Item).max(200),
  instructions: z.string().max(60_000).optional(),
  tools: z.array(z.object({ name: z.string(), description: z.string(), parameters: z.record(z.string(), z.unknown()) }).loose()).max(80).optional(),
  responseFormat: z.object({ type: z.enum(["text", "json"]), schema: z.unknown().optional(), name: z.string().optional() }).loose(),
});

function toMessages(input: z.infer<typeof Body>["input"]): { system: string[]; messages: ChatMessage[] } {
  const system: string[] = [];
  const messages: ChatMessage[] = [];
  const names = new Map<string, string>();
  for (const it of input) {
    if (it.type === "message") {
      const text = it.content.map((c) => c.text ?? "").join("\n");
      if (it.role === "system") system.push(text);
      else messages.push({ role: it.role, content: text });
    } else if (it.type === "function_call") {
      names.set(it.callId, it.name);
      let args: unknown = {};
      try {
        args = JSON.parse(it.arguments || "{}");
      } catch {
        /* keep {} */
      }
      const last = messages.at(-1);
      const call = { id: it.callId, name: it.name, args };
      if (last?.role === "assistant") last.toolCalls = [...(last.toolCalls ?? []), call];
      else messages.push({ role: "assistant", content: "", toolCalls: [call] });
    } else if (it.type === "function_call_output") {
      messages.push({ role: "tool", toolCallId: it.callId, toolName: names.get(it.callId) ?? "tool", content: it.output });
    }
  }
  return { system, messages };
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY) return Response.json({ error: { code: "too_large", message: "Turn too large." } }, { status: 413 });
  const parsed = Body.safeParse(JSON.parse(raw || "null"));
  if (!parsed.success) return Response.json({ error: { code: "invalid", message: parsed.error.message.slice(0, 300) } }, { status: 400 });
  const b = parsed.data;

  const { system, messages } = toMessages(b.input);
  const tools: ToolSpec[] = (b.tools ?? []).map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
  const json = b.responseFormat.type === "json" ? `\nReply with only a JSON object matching this schema:\n${JSON.stringify(b.responseFormat.schema)}` : "";
  const sys = [b.instructions ?? "", ...system].filter(Boolean).join("\n\n") + json;

  // Rough size of the turn: Studio's own tool schemas are large (D-043). Big turns go Gemini-first.
  const approxPromptTokens = Math.round((sys.length + JSON.stringify(messages).length + JSON.stringify(tools).length) / 4);
  const router = approxPromptTokens > 6500 ? llm().long : llm().agent;
  try {
    const r = await router.chatStep({ route: "grid", promptVersion: PROMPT_VERSION, system: sys, messages, tools }, clientKeyOf(req));
    return Response.json({
      text: r.value.text,
      toolCalls: r.value.toolCalls,
      source: r.source,
      model: r.model,
      fallbackReason: r.fallbackReason,
      usage: r.usage ?? null,
      approxPromptTokens,
    });
  } catch (e) {
    const unavailable = e instanceof LlmUnavailableError;
    console.error("studio turn failed", e);
    return Response.json(
      { error: { code: unavailable ? "ai_unavailable" : "error", message: unavailable ? "The AI assistant is resting (free-tier limit). Try again in a minute." : "The AI assistant failed." } },
      { status: unavailable ? 503 : 500 },
    );
  }
}
