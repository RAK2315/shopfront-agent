import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createShopMcpServer, TOOL_DEFINITIONS, type ToolName } from "@shopfront/mcp";
import { recordEvent } from "@/server/events";
import { services } from "@/server/services";
import { shop } from "@/server/shop";

export const dynamic = "force-dynamic";

// Public, stateless MCP endpoint (Streamable HTTP, JSON responses): one server per request.
// Any MCP client — Claude Desktop, MCP Inspector, our hosted buyer agent — calls the same tools.
async function handle(req: Request) {
  if (req.method === "POST") await recordBlockedCalls(req.clone());
  const server = createShopMcpServer(shop, {
    onToolCall: ({ tool, ctx, ok, errorCode, ms, args, result }) => {
      if (tool === "create_checkout" && ok) return; // the shop service records a richer event itself
      void recordEvent(services().db, {
        actor: "mcp",
        kind: ok ? "tool_call" : "tool_error",
        checkoutId: checkoutOf(args),
        summary: ok ? describe(tool, args, result) : `${tool} rejected · ${errorCode}`,
        data: { tool, mcpRequestId: ctx.requestId, client: ctx.clientName, ms, errorCode },
      }).catch(() => {});
    },
  });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;

// Timeline summaries. Never include order_token or other secrets.
function describe(tool: string, args: unknown, result: unknown): string {
  const a = (args ?? {}) as Record<string, unknown>;
  const r = (result ?? {}) as Record<string, unknown>;
  switch (tool) {
    case "search_products": {
      const max = typeof a.max_price_usd === "number" ? ` under $${a.max_price_usd}` : "";
      return `search_products · “${String(a.query ?? "").slice(0, 60)}”${max} → ${Number(r.total ?? 0)} result${r.total === 1 ? "" : "s"}`;
    }
    case "get_product":
      return `get_product · ${String(r.title ?? a.product_id ?? "")}`.slice(0, 120);
    case "get_checkout_status":
      return `get_checkout_status · ${String(r.status_label ?? r.status ?? "")}`;
    default:
      return tool;
  }
}

function checkoutOf(args: unknown): string | null {
  const id = (args as { checkout_id?: unknown } | undefined)?.checkout_id;
  return typeof id === "string" && /^chk_[a-z0-9]{12}$/.test(id) ? id : null;
}

/**
 * The SDK rejects tool calls that break the strict input schemas (extra fields such as price or total) before our
 * handlers run. Validate the same schemas here first, so every blocked attempt is visible on the live timeline.
 */
async function recordBlockedCalls(req: Request) {
  try {
    const body = (await req.json()) as unknown;
    const calls = (Array.isArray(body) ? body : [body]) as Array<{ method?: string; params?: { name?: string; arguments?: unknown } }>;
    for (const c of calls) {
      if (c?.method !== "tools/call" || !c.params?.name || !(c.params.name in TOOL_DEFINITIONS)) continue;
      const tool = c.params.name as ToolName;
      const parsed = TOOL_DEFINITIONS[tool].inputSchema.safeParse(c.params.arguments ?? {});
      if (parsed.success) continue;
      const extra = parsed.error.issues.flatMap((i) => (i.code === "unrecognized_keys" ? i.keys : []));
      const summary = extra.length
        ? `${tool} blocked by server · unknown field${extra.length > 1 ? "s" : ""} ${extra.map((k) => `“${k}”`).join(", ")} · totals are set by the server`
        : `${tool} blocked by server · invalid input (${parsed.error.issues[0]?.path.join(".") || "arguments"})`;
      await recordEvent(services().db, { actor: "mcp", kind: "tool_error", summary, data: { tool, errorCode: "VALIDATION_ERROR", fields: extra } });
    }
  } catch {
    /* not JSON: the transport answers it */
  }
}
