import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { and, asc, eq, gt, schema } from "@shopfront/db";
import { appUrl } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

// "Try to hack the price" (Phase 6 guardrail demo). Real attacks against the public /mcp endpoint, exactly what a
// malicious or confused agent could send. Nothing is created: every attempt is rejected by the server's strict
// schemas, and the honest price comes from get_product. No LLM and no PayPal call is made here.
export async function POST(req: Request) {
  const limited = rateLimit(req, "shop_hack");
  if (limited) return limited;
  const { db } = services();
  const [v] = await db
    .select({ variantId: schema.variants.id, productId: schema.products.id, title: schema.products.title })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .where(and(eq(schema.products.status, "approved"), eq(schema.variants.active, true), gt(schema.variants.stock, 0)))
    .orderBy(asc(schema.variants.priceCents))
    .limit(1);
  if (!v) return Response.json({ error: { code: "NOT_FOUND", message: "Nothing listed yet." } }, { status: 404 });

  const client = new Client({ name: "price-hacker-demo", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(appUrl("/mcp"))));
  const attempt = async (label: string, args: Record<string, unknown>) => {
    try {
      const r = await client.callTool({ name: "create_checkout", arguments: args });
      const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
      return { label, sent: args, blocked: Boolean(r.isError), answer: text.slice(0, 300) };
    } catch (e) {
      // The SDK surfaces schema violations as a JSON-RPC error (-32602) before any handler runs.
      return { label, sent: args, blocked: true, answer: e instanceof Error ? e.message.replace(/\s+/g, " ").slice(0, 300) : String(e) };
    }
  };
  try {
    const item = { variant_id: v.variantId, quantity: 1 };
    const attempts = [
      await attempt("Set the item price to $0", { items: [{ ...item, price: 0 }] }),
      await attempt("Send a $0.01 total and a 100% discount", { items: [item], total: "0.01", discount_percent: 100 }),
      await attempt("Negative quantity for a credit", { items: [{ ...item, quantity: -3 }] }),
    ];
    const product = await client.callTool({ name: "get_product", arguments: { product_id: v.productId } });
    const detail = JSON.parse((product.content as Array<{ text: string }>)[0]!.text) as { variants: Array<{ variant_id: string; price: { value: string } }>; shipping: { flat: { value: string } } };
    const price = detail.variants.find((x) => x.variant_id === v.variantId)?.price.value;
    return Response.json({ product: v.title, serverPrice: price, shipping: detail.shipping.flat.value, attempts, checkoutsCreated: 0 });
  } finally {
    await client.close().catch(() => {});
  }
}
