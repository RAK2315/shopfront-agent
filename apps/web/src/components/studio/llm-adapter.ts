import type { AgLlmAdapter, AgLlmRequest, AgLlmResponse } from "ag-studio";

// AgLlmAdapter for AG Studio's Direct LLM runner (D-023). Studio runs the agent loop in the browser;
// each turn is one POST to /api/studio/turn, which calls the model through our budget guard
// (cache → caps → Groq → Gemini → replay). Keys never reach the browser.

interface TurnReply {
  text?: string;
  toolCalls?: Array<{ id: string; name: string; args: unknown }>;
  model?: string | null;
  source?: string;
  approxPromptTokens?: number;
  error?: { code: string; message: string };
}

type StreamEvent = { type: string; [k: string]: unknown };

let seq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

export const shopfrontLlmAdapter: AgLlmAdapter = {
  executeTurn(request: AgLlmRequest, options) {
    const reply: Promise<TurnReply> = fetch("/api/studio/turn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        input: request.input,
        instructions: request.instructions,
        tools: request.tools?.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })),
        responseFormat: request.responseFormat,
      }),
      signal: options?.signal,
    })
      .then((r) => r.json() as Promise<TurnReply>)
      .catch((e: unknown) => ({ error: { code: "network", message: e instanceof Error ? e.message : String(e) } }));

    const shaped = reply.then((r) => {
      const messageId = uid("msg");
      const calls = (r.toolCalls ?? []).map((c) => ({ ...c, arguments: JSON.stringify(c.args ?? {}) }));
      const events: StreamEvent[] = [];
      if (r.text) {
        events.push({ type: "TEXT_MESSAGE_START", messageId, role: "assistant" });
        events.push({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: r.text });
        events.push({ type: "TEXT_MESSAGE_END", messageId });
      }
      for (const c of calls) {
        events.push({ type: "TOOL_CALL_START", toolCallId: c.id, toolCallName: c.name, parentMessageId: messageId });
        events.push({ type: "TOOL_CALL_ARGS", toolCallId: c.id, delta: c.arguments });
        events.push({ type: "TOOL_CALL_END", toolCallId: c.id });
      }
      const response: AgLlmResponse = {
        id: uid("turn"),
        createdAt: Date.now(),
        status: r.error ? "failed" : "completed",
        error: r.error,
        model: r.model ?? undefined,
        output: [
          ...(r.text
            ? [{ id: messageId, kind: "output" as const, type: "message" as const, role: "assistant" as const, status: "completed" as const, content: [{ type: "text" as const, text: r.text, annotations: [] }] }]
            : []),
          ...calls.map((c) => ({ id: uid("fc"), kind: "output" as const, type: "function_call" as const, callId: c.id, name: c.name, arguments: c.arguments, status: "completed" as const })),
        ],
      };
      if (typeof window !== "undefined") (window as unknown as { __studioTurns?: TurnReply[] }).__studioTurns?.push(r);
      return { events, response };
    });

    return {
      stream: {
        async *[Symbol.asyncIterator]() {
          const { events } = await shaped;
          for (const e of events) yield e as never;
        },
      },
      complete: shaped.then((s) => s.response),
    };
  },
};
