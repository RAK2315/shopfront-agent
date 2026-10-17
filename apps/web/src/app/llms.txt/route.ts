import { asc, eq, schema, sql } from "@shopfront/db";
import { appUrl } from "@/server/env";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

// llms.txt for crawler-based agents (D-012): what Shopfront is, how to buy, and every storefront.
export async function GET() {
  const { db } = services();
  const sellers = await db
    .select({ handle: schema.sellers.handle, name: schema.sellers.displayName, bio: schema.sellers.bio, n: sql<number>`count(${schema.products.id})` })
    .from(schema.sellers)
    .leftJoin(schema.products, sql`${schema.products.sellerId} = ${schema.sellers.id} and ${schema.products.status} = 'approved'`)
    .where(eq(schema.sellers.testOnly, false)) // the judge demo seller is reachable by name only (D-073)
    .groupBy(schema.sellers.handle, schema.sellers.displayName, schema.sellers.bio)
    .orderBy(asc(schema.sellers.displayName));
  const body = [
    "# Shopfront",
    "",
    "> Independent makers' shops that AI shopping agents can buy from. One MCP endpoint covers every seller; payment is approved by the human in PayPal.",
    "",
    "## How an agent buys",
    `- MCP endpoint (Streamable HTTP): ${appUrl("/mcp")}`,
    "- Tools: search_products, get_product, create_checkout (variant ids and quantities only), get_checkout_status, request_refund.",
    "- Prices and totals are set by the server from the seller's catalog. Give the returned pay_url to the human; they approve in PayPal.",
    "- Sandbox demo: no real money moves.",
    "",
    "## Shops",
    ...sellers.map((s) => `- [${s.name}](${appUrl(`/s/${s.handle}`)}): ${s.bio} (${Number(s.n)} listed)`),
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
}
