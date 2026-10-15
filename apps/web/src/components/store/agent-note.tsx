import { Bot } from "lucide-react";
import { RequestId } from "@/components/ui/request-id";

/** How agents buy here: one MCP endpoint for every Shopfront seller; the human approves in PayPal (D-012). */
export function AgentNote({ mcpUrl, productId }: { mcpUrl: string; productId?: string }) {
  return (
    <aside aria-label="Buy with an AI agent" className="grid gap-3 rounded-lg border border-line bg-surface p-5">
      <p className="inline-flex items-center gap-2 text-base font-semibold">
        <Bot aria-hidden className="size-4 text-clay" /> Buy with your AI agent
      </p>
      <p className="text-sm text-ink-2">
        This shop is agent-buyable. Add Shopfront&apos;s MCP endpoint to your assistant once, then ask it to find and buy
        {productId ? " this piece" : " something from this shop"}. Your agent prepares the order; you approve the payment in PayPal.
      </p>
      <div className="flex flex-wrap gap-2">
        <RequestId label="MCP" value={mcpUrl} max={44} />
        {productId && <RequestId label="Product" value={productId} />}
      </div>
    </aside>
  );
}
