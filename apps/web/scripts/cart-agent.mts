// A buyer's shopping agent that buys from a Shopfront store through PayPal's Cart API v1 (D-097), using PayPal's own
// published client (@paypal/agentic-commerce-spec: createCart, updateCart, getCart, completeCheckout). It shows what a
// Store Sync assistant does: find a product, build a cart, resolve validation issues, hand the buyer PayPal's approval
// link, complete checkout. The order is authorized; the shop is paid when it ships (D-098).
//
// Usage (anyone, against the hosted demo):
//   pnpm --filter web cart-agent -- --base https://shopfront-agent.onrender.com --store juniper_clay --query "blue mug"
//   [--approve manual|auto]   manual (default): open the approval link, approve, paste the URL PayPal returns you to
//                             auto: approve headless with the sandbox test buyer (needs SANDBOX_BUYER_* in env)
//   [--token <jwt>]           a store-bound token (default: a 1-hour demo token from /api/cart-token)
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { client, completeCheckout, createCart, getCart, updateCart, type PayPalCart, type PayPalCartWritable } from "@paypal/agentic-commerce-spec";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface CartAgentOptions {
  base: string;
  store: string;
  query: string;
  approve: "manual" | "auto" | ((approvalUrl: string) => Promise<string>);
  token?: string;
  quantity?: number;
  address?: PayPalCartWritable["shipping_address"];
  log?: (line: string) => void;
}

export interface CartAgentResult {
  cartId: string;
  steps: Array<{ call: string; status: number; cart?: PayPalCart; error?: unknown }>;
  final?: PayPalCart & { payment_confirmation?: { merchant_order_number?: string; order_review_page?: string } };
}

const SAMPLE_ADDRESS = { address_line_1: "2211 N First St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" };

/** Call one SDK function and normalise the axios-based result to { status, data, error }. */
async function call<T>(p: Promise<unknown>): Promise<{ status: number; data?: T; error?: unknown }> {
  const r = (await p) as { status?: number; data?: T; error?: unknown; response?: { status?: number } };
  return { status: r.status ?? r.response?.status ?? 0, data: r.data, error: r.error };
}

const issuesText = (c?: PayPalCart) =>
  (c?.validation_issues ?? []).map((i) => `${(i.context as { specific_issue?: string } | undefined)?.specific_issue ?? i.code}${i.resolution_options?.length ? ` → ${i.resolution_options.map((o) => o.action).join(" / ")}` : ""}`).join("; ");

export async function runCartAgent(o: CartAgentOptions): Promise<CartAgentResult> {
  const log = o.log ?? ((l: string) => console.log(l));
  const base = o.base.replace(/\/$/, "");

  // 1. Discovery over Shopfront's public MCP (Store Sync's catalog side).
  const mcp = new McpClient({ name: "cart-api-test-agent", version: "1.0.0" });
  await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
  const text = (r: unknown) => JSON.parse((r as { content: Array<{ text: string }> }).content[0]!.text);
  const found = text(await mcp.callTool({ name: "search_products", arguments: { query: o.query, limit: 10 } })) as { results: Array<{ product_id: string; title: string; seller: { handle: string } }> };
  const pick = found.results.find((p) => p.seller.handle === o.store) ?? (await (async () => {
    const all = text(await mcp.callTool({ name: "search_products", arguments: { query: "handmade", limit: 20 } })) as typeof found;
    return all.results.find((p) => p.seller.handle === o.store);
  })());
  if (!pick) throw new Error(`No listing from ${o.store} for "${o.query}"`);
  const product = text(await mcp.callTool({ name: "get_product", arguments: { product_id: pick.product_id } })) as { variants: Array<{ variant_id: string; available: boolean; price: { value: string } }> };
  await mcp.close();
  const variant = product.variants.find((v) => v.available) ?? product.variants[0]!;
  log(`agent  found "${pick.title}" (${variant.variant_id}, $${variant.price.value}) in ${o.store}`);

  // 2. A store-bound token: given, or a one-hour demo token.
  let token = o.token;
  if (!token) {
    const r = await fetch(`${base}/api/cart-token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ store: o.store }) });
    if (!r.ok) throw new Error(`demo token: HTTP ${r.status}`);
    token = ((await r.json()) as { token: string }).token;
  }
  client.setConfig({ baseURL: `${base}/api/paypal/v1/stores/${o.store}`, throwOnError: false });
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const steps: CartAgentResult["steps"] = [];

  // 3. A cart with no address yet: the merchant answers REQUIRES_ADDITIONAL_INFORMATION and says how to resolve it.
  const items = [{ variant_id: variant.variant_id, quantity: o.quantity ?? 1, name: pick.title }];
  const created = await call<PayPalCart>(createCart({ body: { items, payment_method: { type: "paypal" } }, headers }));
  steps.push({ call: "POST /merchant-cart", status: created.status, cart: created.data, error: created.error });
  if (!created.data?.id) throw new Error(`createCart: HTTP ${created.status} ${JSON.stringify(created.error).slice(0, 200)}`);
  const cartId = created.data.id;
  log(`cart   POST /merchant-cart → ${created.status} ${created.data.validation_status} ${issuesText(created.data)}`);

  // 4. Resolve: PUT the full cart with the address (a complete replacement, per the spec).
  const body: PayPalCartWritable = { items, customer: { name: { given_name: "Sandbox", surname: "Buyer" } }, shipping_address: o.address ?? SAMPLE_ADDRESS, payment_method: { type: "paypal" } };
  const updated = await call<PayPalCart>(updateCart({ path: { cartId }, body, headers }));
  steps.push({ call: "PUT /merchant-cart/{id}", status: updated.status, cart: updated.data, error: updated.error });
  log(`cart   PUT /merchant-cart/${cartId} → ${updated.status} ${updated.data?.validation_status} total $${updated.data?.totals?.total.value} ${issuesText(updated.data)}`);
  const pm = updated.data?.payment_method;
  if (updated.data?.validation_status !== "VALID" || !pm?.token || !pm.approval_url) return { cartId, steps };

  // 5. The buyer approves in PayPal (an agent never can). PayPal returns them to /cart/approved?token=…&PayerID=….
  log(`buyer  approve in PayPal: ${pm.approval_url}`);
  const returned =
    typeof o.approve === "function"
      ? await o.approve(pm.approval_url)
      : o.approve === "auto"
        ? await approveHeadless(pm.approval_url)
        : await (async () => {
            const rl = createInterface({ input: process.stdin, output: process.stdout });
            const url = await rl.question("Paste the URL PayPal sent you back to: ");
            rl.close();
            return url;
          })();
  const back = new URL(returned);
  const payerId = back.searchParams.get("PayerID");
  if (!payerId || back.searchParams.get("token") !== pm.token) throw new Error("That isn't the return URL for this cart's PayPal order.");
  const ready = await call<PayPalCart>(getCart({ path: { cartId }, headers }));
  steps.push({ call: "GET /merchant-cart/{id}", status: ready.status, cart: ready.data });
  log(`cart   GET /merchant-cart/${cartId} → ${ready.data?.status}`);

  // 6. Complete checkout with the token and payer id PayPal returned. The merchant authorizes; charged on ship.
  const done = await call<CartAgentResult["final"]>(completeCheckout({ path: { cartId }, body: { ...body, payment_method: { type: "paypal", token: pm.token, payer_id: payerId } }, headers }));
  steps.push({ call: "POST /merchant-cart/{id}/checkout", status: done.status, cart: done.data, error: done.error });
  log(`cart   POST /merchant-cart/${cartId}/checkout → ${done.status} ${done.data?.status ?? JSON.stringify(done.error).slice(0, 160)}`);
  if (done.data?.payment_confirmation) log(`order  ${done.data.payment_confirmation.merchant_order_number} · authorized, charged when it ships · ${done.data.payment_confirmation.order_review_page}`);
  return { cartId, steps, final: done.data };
}

/** Approve with the published sandbox buyer, headless (Playwright). Returns the URL PayPal redirected to. */
async function approveHeadless(approvalUrl: string): Promise<string> {
  const { chromium } = await import("@playwright/test");
  const { loginAndApprove } = await import("./lib/paypal-popup.js");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(approvalUrl, { waitUntil: "domcontentloaded" });
    await loginAndApprove(page, { email: process.env.SANDBOX_BUYER_EMAIL!, password: process.env.SANDBOX_BUYER_PASSWORD! });
    await page.waitForURL(/\/cart\/approved\?/, { timeout: 90_000 });
    return page.url();
  } finally {
    await browser.close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
  const r = await runCartAgent({
    base: arg("--base", "https://shopfront-agent.onrender.com")!,
    store: arg("--store", "juniper_clay")!,
    query: arg("--query", "mug")!,
    approve: arg("--approve", "manual") === "auto" ? "auto" : "manual",
    token: arg("--token"),
  });
  console.log(r.final?.status === "COMPLETED" ? `\nDone: cart ${r.cartId} COMPLETED (authorized; the shop is paid when it ships).` : `\nStopped: cart ${r.cartId} is ${r.steps.at(-1)?.cart?.status ?? "not complete"}.`);
}
