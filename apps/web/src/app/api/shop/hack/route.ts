import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { and, asc, desc, eq, gt, gte, schema, sql } from "@shopfront/db";
import { appUrl } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";
import { runHeaders } from "@/server/run-context";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

// "Try to hack the price" (Phase 6 guardrail demo; Phase 13 lite, walkthrough #5, D-091). Twelve real attacks against
// the public endpoints, exactly what a malicious or confused agent could send: price tampering, quantity tricks,
// fake ids, a stolen order token, and a forged PayPal webhook. Every result is the server's real answer. No LLM is
// called; the only PayPal call is the webhook signature check that the forgery fails. "Checkouts created" is counted
// in the database, not assumed.

export type AttackFamily = "price" | "quantity" | "ids" | "tokens" | "webhook" | "size";
export interface Attack {
  id: string;
  label: string;
  family: AttackFamily;
  blocked: boolean;
  answer: string;
}

export async function POST(req: Request) {
  const limited = rateLimit(req, "shop_hack");
  if (limited) return limited;
  const { db } = services();
  const started = new Date();
  const [v] = await db
    .select({ variantId: schema.variants.id, productId: schema.products.id, title: schema.products.title })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .innerJoin(schema.sellers, eq(schema.sellers.id, schema.products.sellerId))
    .where(and(eq(schema.products.status, "approved"), eq(schema.variants.active, true), gt(schema.variants.stock, 0), eq(schema.sellers.testOnly, false)))
    .orderBy(asc(schema.variants.priceCents))
    .limit(1);
  if (!v) return Response.json({ error: { code: "NOT_FOUND", message: "Nothing listed yet." } }, { status: 404 });
  // Somebody else's real checkout id (ids are not secrets; the order token is).
  const [victim] = await db.select({ id: schema.checkouts.id, orderId: schema.checkouts.paypalOrderId }).from(schema.checkouts).where(eq(schema.checkouts.status, "paid")).orderBy(desc(schema.checkouts.createdAt)).limit(1);

  // The stateless MCP endpoint names its client from this header (D-081), so the count below can find its checkouts.
  const headers = { ...(await runHeaders()), "x-shopfront-client": "price-hacker-demo" };
  const client = new Client({ name: "price-hacker-demo", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(appUrl("/mcp")), { requestInit: { headers } }));
  const tool = async (id: string, label: string, family: AttackFamily, name: string, args: Record<string, unknown>): Promise<Attack> => {
    try {
      const r = await client.callTool({ name, arguments: args });
      const text = (r.content as Array<{ text?: string }>)[0]?.text ?? "";
      return { id, label, family, blocked: Boolean(r.isError), answer: text.slice(0, 300) };
    } catch (e) {
      // The SDK surfaces schema violations as a JSON-RPC error (-32602) before any handler runs.
      return { id, label, family, blocked: true, answer: e instanceof Error ? e.message.replace(/\s+/g, " ").slice(0, 300) : String(e) };
    }
  };
  const forgedWebhook = async (): Promise<Attack> => {
    const label = "Forge PayPal's “payment completed” webhook";
    try {
      const res = await fetch(appUrl("/webhooks/paypal"), {
        method: "POST",
        headers: {
          ...headers,
          "content-type": "application/json",
          "paypal-transmission-id": crypto.randomUUID(),
          "paypal-transmission-time": new Date().toISOString(),
          "paypal-transmission-sig": "Zm9yZ2VkLXNpZ25hdHVyZQ==",
          "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-forged",
          "paypal-auth-algo": "SHA256withRSA",
        },
        body: JSON.stringify({ id: `WH-FORGED-${Date.now()}`, event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "FORGEDCAPTURE01", status: "COMPLETED", supplementary_data: { related_ids: { order_id: victim?.orderId ?? "NONE" } } } }),
      });
      const out = (await res.json().catch(() => ({}))) as { verified?: boolean };
      return { id: "webhook", label, family: "webhook", blocked: out.verified !== true, answer: out.verified === false ? "PayPal's signature check failed: stored as unverified and ignored" : `HTTP ${res.status}` };
    } catch (e) {
      return { id: "webhook", label, family: "webhook", blocked: true, answer: e instanceof Error ? e.message : String(e) };
    }
  };

  try {
    const item = { variant_id: v.variantId, quantity: 1 };
    const stolen = victim ? { checkout_id: victim.id, order_token: "x".repeat(43) } : { checkout_id: "chk_aaaaaaaaaaaa", order_token: "x".repeat(43) };
    const attempts: Attack[] = [
      await tool("price0", "Set the item price to $0", "price", "create_checkout", { items: [{ ...item, price: 0 }] }),
      await tool("total", "Send a $0.01 total and a 100% discount", "price", "create_checkout", { items: [item], total: "0.01", discount_percent: 100 }),
      await tool("currency", "Pay in a cheaper currency", "price", "create_checkout", { items: [item], currency: "JPY" }),
      await tool("cents", "Smuggle price_cents inside the item", "price", "create_checkout", { items: [{ ...item, price_cents: 1 }] }),
      await tool("negative", "Negative quantity for a credit", "quantity", "create_checkout", { items: [{ ...item, quantity: -3 }] }),
      await tool("fraction", "Half a mug (quantity 0.5)", "quantity", "create_checkout", { items: [{ ...item, quantity: 0.5 }] }),
      await tool("bulk", "Order 10,000 to break stock", "quantity", "create_checkout", { items: [{ ...item, quantity: 10000 }] }),
      await tool("fake", "Invent a free variant id", "ids", "create_checkout", { items: [{ variant_id: "var_free00000000", quantity: 1 }] }),
      await tool("refund", "Refund someone else's order with a guessed token", "tokens", "request_refund", { ...stolen, reason_code: "damaged" }),
      await tool("refundamt", "Ask for a $500 refund amount", "tokens", "request_refund", { ...stolen, reason_code: "damaged", amount: 500 }),
      await tool("peek", "Read someone else's order status", "tokens", "get_checkout_status", stolen),
      await forgedWebhook(),
      await tool("size", "Flood one checkout with 11 line items", "size", "create_checkout", { items: Array.from({ length: 11 }, () => item) }),
    ];
    const product = await client.callTool({ name: "get_product", arguments: { product_id: v.productId } });
    const detail = JSON.parse((product.content as Array<{ text: string }>)[0]!.text) as { variants: Array<{ variant_id: string; price: { value: string } }>; shipping: { flat: { value: string } } };
    const price = detail.variants.find((x) => x.variant_id === v.variantId)?.price.value;
    // Counted, not assumed: checkouts this demo client created since it started.
    const [{ n } = { n: 0 }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.checkouts)
      .where(and(eq(schema.checkouts.mcpClientName, "price-hacker-demo"), gte(schema.checkouts.createdAt, started)));
    return Response.json({ product: v.title, serverPrice: price, shipping: detail.shipping.flat.value, attempts, checkoutsCreated: Number(n) });
  } finally {
    await client.close().catch(() => {});
  }
}
