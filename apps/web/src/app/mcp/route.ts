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
    onToolCall: ({ tool, ctx, ok, errorCode, ms }) => {
      if (tool === "create_checkout" && ok) return; // the shop service records a richer event itself
      void recordEvent(services().db, {
        actor: "mcp",
        kind: ok ? "tool_call" : "tool_error",
        summary: ok ? `${tool}` : `${tool} rejected · ${errorCode}`,
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
