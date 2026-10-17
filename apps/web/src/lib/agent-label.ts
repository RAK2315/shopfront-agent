// How a buyer's agent is named on /pay and the console. The raw name comes from the MCP request headers
// (`clientNameFromHeaders`); a few known ones get a friendlier label.
const KNOWN: Record<string, string> = {
  "shopfront-web-agent": "our demo shopping agent",
  "claude-user": "Claude",
  "claude-ai": "Claude",
  claude: "Claude",
};

export function agentLabel(clientName: string | null | undefined): string | null {
  if (!clientName) return null;
  return KNOWN[clientName.toLowerCase()] ?? clientName;
}
