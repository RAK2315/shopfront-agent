// Plain words for why the MCP server rejected a "Try to hack the price" attempt (REVIEW-1 #7). The input is the
// server's real validation message; field names stay exact so a judge can match them to what was sent.
export function hackReason(answer: string): { text: string; fields: string[] } {
  const keys = answer.match(/Unrecognized keys?: ((?:"[^"]+"(?:, )?)+)/);
  if (keys) {
    const fields = [...keys[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!);
    return { text: fields.length > 1 ? "unknown fields" : "unknown field", fields };
  }
  const small = answer.match(/Too small: expected number to be >=(\d+) at [\w.[\]]*?(\w+)$/);
  if (small) return { text: `must be at least ${small[1]}`, fields: [small[2]!] };
  return { text: "rejected by the server's schema", fields: [] };
}
