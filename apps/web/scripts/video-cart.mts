// Video beat 6 (DEMO-SCRIPT v5.1): PayPal's own Cart API client (@paypal/agentic-commerce-spec) shops a Shopfront
// store and first tries to set its own price, $0.01. The store answers PRICE_MISMATCH → ACCEPT_NEW_PRICE and keeps
// its price; the client accepts it, the sandbox buyer approves in PayPal, checkout completes (authorized; the shop is
// paid when it ships, D-098). A real public run against the deployed app, not test-marked (it is footage).
// Prints a terminal transcript and writes it with timings to video/public/clips/cart-agent.json for the edit.
// Usage: node --env-file-if-exists=../../.env --import tsx scripts/video-cart.mts [--store juniper_clay] [--query "green mug"]
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { client, completeCheckout, createCart, getCart, updateCart, type PayPalCart, type PayPalCartWritable } from "@paypal/agentic-commerce-spec";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1]! : d);
const base = arg("--base", "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const store = arg("--store", "juniper_clay");
const query = arg("--query", "green mug");
const t0 = Date.now();
const lines: Array<{ t: number; text: string; tone?: string }> = [];
const out = (text: string, tone?: string) => {
  lines.push({ t: (Date.now() - t0) / 1000, text, tone });
  console.log(text);
};
const issues = (c?: PayPalCart) =>
  (c?.validation_issues ?? []).map((i) => {
    const ctx = (i.context ?? {}) as { specific_issue?: string; original_price?: string; current_price?: string };
    return { what: ctx.specific_issue ?? i.code, fix: (i.resolution_options ?? []).map((o) => o.action).join(" / "), ctx };
  });
async function call<T>(p: Promise<unknown>) {
  const r = (await p) as { status?: number; data?: T; error?: unknown; response?: { status?: number } };
  return { status: r.status ?? r.response?.status ?? 0, data: r.data, error: r.error };
}

out(`$ node scripts/video-cart.mts --store ${store} --query "${query}"`, "cmd");
const mcp = new McpClient({ name: "paypal-cart-api-client-demo", version: "1.0.0" });
await mcp.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
const text = (r: unknown) => JSON.parse((r as { content: Array<{ text: string }> }).content[0]!.text);
const found = text(await mcp.callTool({ name: "search_products", arguments: { query, limit: 10 } })) as { results: Array<{ product_id: string; title: string; seller: { handle: string } }> };
const pick = found.results.find((p) => p.seller.handle === store);
if (!pick) throw new Error(`no ${query} at ${store}`);
const product = text(await mcp.callTool({ name: "get_product", arguments: { product_id: pick.product_id } })) as { variants: Array<{ variant_id: string; available: boolean; price: { value: string } }> };
await mcp.close();
const v = product.variants.find((x) => x.available) ?? product.variants[0]!;
out(`agent  found "${pick.title}" at ${store} ($${v.price.value})`);

const tok = await fetch(`${base}/api/cart-token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ store }) });
if (!tok.ok) throw new Error(`demo token ${tok.status}`);
const token = ((await tok.json()) as { token: string }).token;
client.setConfig({ baseURL: `${base}/api/paypal/v1/stores/${store}`, throwOnError: false });
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const address = { address_line_1: "2211 N First St", admin_area_2: "San Jose", admin_area_1: "CA", postal_code: "95131", country_code: "US" };
const customer = { name: { given_name: "Sandbox", surname: "Buyer" } };

// 1. The agent tries to set the price itself.
const cheap = { variant_id: v.variant_id, quantity: 1, name: pick.title, price: { currency_code: "USD", value: "0.01" } };
const c1 = await call<PayPalCart>(createCart({ body: { items: [cheap], customer, shipping_address: address, payment_method: { type: "paypal" } } as PayPalCartWritable, headers }));
const id = c1.data!.id!;
out(`cart   POST /merchant-cart  (item price $0.01) → ${c1.status} ${c1.data?.validation_status}`);
for (const i of issues(c1.data)) out(`       ${i.what}${i.ctx.current_price ? ` (agent $${i.ctx.original_price}, shop $${i.ctx.current_price})` : ""} → ${i.fix}`, "issue");
out(`       total $${c1.data?.totals?.total.value} · no PayPal order${c1.data?.payment_method?.token ? " (unexpected!)" : ""}`);

// 2. Accept the shop's price: PUT the full cart without a price.
const body: PayPalCartWritable = { items: [{ variant_id: v.variant_id, quantity: 1, name: pick.title }], customer, shipping_address: address, payment_method: { type: "paypal" } };
const c2 = await call<PayPalCart>(updateCart({ path: { cartId: id }, body, headers }));
const pm = c2.data?.payment_method;
out(`cart   PUT /merchant-cart/{id}  (ACCEPT_NEW_PRICE) → ${c2.status} ${c2.data?.validation_status} · total $${c2.data?.totals?.total.value}`);
if (!pm?.token || !pm.approval_url) throw new Error("no PayPal order after accepting the price");
out(`paypal order created by the shop · the buyer approves in PayPal`);

// 3. The buyer approves (an agent never can): the published sandbox buyer, in a browser.
const { chromium } = await import("@playwright/test");
const { loginAndApprove } = await import("./lib/paypal-popup.js");
const browser = await chromium.launch({ headless: false });
let returned = "";
try {
  const page = await browser.newPage();
  await page.goto(pm.approval_url, { waitUntil: "domcontentloaded" });
  await loginAndApprove(page, { email: process.env.SANDBOX_BUYER_EMAIL!, password: process.env.SANDBOX_BUYER_PASSWORD! });
  await page.waitForURL(/\/cart\/approved\?/, { timeout: 90_000 });
  returned = page.url();
} finally {
  await browser.close();
}
const back = new URL(returned);
const payerId = back.searchParams.get("PayerID")!;
out(`buyer  approved in PayPal`);
const c3 = await call<PayPalCart>(getCart({ path: { cartId: id }, headers }));
out(`cart   GET /merchant-cart/{id} → ${c3.data?.status}`);
const done = await call<PayPalCart & { payment_confirmation?: { merchant_order_number?: string } }>(completeCheckout({ path: { cartId: id }, body: { ...body, payment_method: { type: "paypal", token: pm.token, payer_id: payerId } }, headers }));
out(`cart   POST /merchant-cart/{id}/checkout → ${done.status} ${done.data?.status}`, done.data?.status === "COMPLETED" ? "ok" : "issue");
out(`       authorized at the shop's price; captured when it ships`);
writeFileSync(resolve("../../video/public/clips/cart-agent.json"), JSON.stringify({ at: new Date(t0).toISOString(), lines }, null, 2));
console.log("\nwrote video/public/clips/cart-agent.json");
