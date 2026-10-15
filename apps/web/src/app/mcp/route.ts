import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createShopMcpServer } from "@shopfront/mcp";
import { recordEvent } from "@/server/events";
import { services } from "@/server/services";
import { shop } from "@/server/shop";

export const dynamic = "force-dynamic";

// Public, stateless MCP endpoint (Streamable HTTP, JSON responses): one server per request.
// Any MCP client — Claude Desktop, MCP Inspector, our hosted buyer agent — calls the same tools.
async function handle(req: Request) {
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
