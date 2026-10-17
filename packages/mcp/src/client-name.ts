// The stateless /mcp endpoint builds a new server per HTTP request, so a tool call never sees the client's
// `initialize` (and its clientInfo). Name the agent from the request headers instead. It's a display label only
// (the /pay page and the console); it never grants anything.

const MAX = 40;
const GENERIC = /^(node|undici|node-fetch|python-httpx|python-requests|python-urllib|aiohttp|axios|okhttp|go-http-client|curl|wget|mozilla|java|ruby|deno|bun)$/i;

const clean = (s: string) => s.replace(/[^A-Za-z0-9 ._-]/g, '').trim().slice(0, MAX) || undefined;

export function clientNameFromHeaders(headers: Headers): string | undefined {
  const explicit = headers.get('x-shopfront-client');
  if (explicit) {
    const name = clean(explicit);
    if (name) return name;
  }
  const product = headers.get('user-agent')?.trim().split(/[\s/]/)[0];
  if (!product || GENERIC.test(product)) return undefined;
  return clean(product);
}
