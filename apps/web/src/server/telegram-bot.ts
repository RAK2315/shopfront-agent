import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { centsToValue, injectionFlags, parsePriceInput, STATUS_LABEL, type CheckoutStatus } from "@shopfront/core";
import { and, asc, desc, eq, inArray, schema } from "@shopfront/db";
import { draftFromPhoto } from "./catalog";
import { dbSalesSummary, paypalTransactions } from "./dashboard";
import { appUrl, env } from "./env";
import { imageUrl, storeImage } from "./images";
import { requestRefund } from "./refunds";
import { services } from "./services";
import { shop } from "./shop";
import { chatsFor, esc, send, type Button } from "./telegram-api";
import { createChatAction } from "./telegram";
import { newOrderToken } from "./tokens";
import { readLabel } from "./tracking";

// The seller copilot on Telegram (Phase 10, walkthrough #8, D-092): order pings, refund approvals, photo → listing,
// label photo → tracking, shop questions, and judge mode on the isolated practice shop. Everything that changes the
// catalog or money is a single-use action tap (D-072) running the same server functions as the web studio; menus
// ("m:…") only read. No model ever gets a tool here: vision drafts and label reading are the existing guarded calls.

type Seller = typeof schema.sellers.$inferSelect;
const DAY = 86_400_000;
const usd = (cents: number) => `$${centsToValue(cents)}`;

// Short references for button data (Telegram allows 64 bytes): photo hashes and simulated orders' tokens.
// In memory on purpose: single instance (D-022), and a lost reference only means "send it again".
const refs = new Map<string, { sha: string; chatId: number; at: number }>();
const pendingPrice = new Map<number, { productId: string; at: number }>();
const ref = (sha: string, chatId: number) => {
  const id = randomBytes(5).toString("base64url");
  refs.set(id, { sha, chatId, at: Date.now() });
  for (const [k, v] of refs) if (Date.now() - v.at > DAY) refs.delete(k);
  return id;
};

async function seller(sellerId: string): Promise<Seller | null> {
  const [s] = await services().db.select().from(schema.sellers).where(eq(schema.sellers.id, sellerId));
  return s ?? null;
}
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

const MAIN_MENU = (isDemo: boolean): Button[][] => [
  [
    { text: "🛍️ Orders", data: "m:orders" },
    { text: "↩️ Pending refunds", data: "m:refunds" },
  ],
  [
    { text: "🏪 Shop status", data: "m:status" },
    { text: "📊 Sales this week", data: "m:sales" },
  ],
  ...(isDemo ? [[{ text: "🧪 Simulate a buyer", data: "m:sim" }]] : []),
];

/** The first message after linking: who I am, which shop, what works. */
export async function welcome(chatId: number, sellerId: string) {
  const s = await seller(sellerId);
  if (!s) return;
  const demo = s.testOnly;
  const lines = [
    `🧺 <b>Connected to ${esc(s.displayName)}</b>`,
    `I'm this seller's copilot. I handle the shop's chores here in Telegram; anything that moves money waits for your tap.`,
    "",
    "<b>What I do</b>",
    "• 🛍️ Ping you the moment an order is paid in PayPal",
    "• ↩️ Ask you before any refund outside your policy",
    "• ✨ Turn a product photo into a listing (you set the price)",
    "• 📦 Read a shipping-label photo and add tracking to the PayPal order",
    "• 📊 Answer “how are sales?” with live figures",
    "",
    demo
      ? "🧪 <b>Judge mode</b>: a practice shop, sandbox only. Tap <b>Simulate a buyer</b> to place an order and watch the pings arrive."
      : `Payouts: ${s.payoutStatus === "verified" ? "paid directly to your PayPal" : s.payoutStatus === "platform" ? "the Shopfront sandbox account (demo shop)" : "connect PayPal in the Studio to start selling"}.`,
  ];
  await send(chatId, lines.join("\n"), { buttons: MAIN_MENU(demo), sellerId, kind: "welcome", isTest: demo });
}

async function ordersFor(s: Seller, limit = 5) {
  const { db } = services();
  return db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, s.id), inArray(schema.checkouts.status, ["paid", "shipped", "partially_refunded", "refunded"]), s.testOnly ? undefined : eq(schema.checkouts.isTest, false)))
    .orderBy(desc(schema.checkouts.createdAt))
    .limit(limit);
}
async function itemsText(checkoutId: string) {
  const items = await services().db.select().from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, checkoutId));
  return items.map((i) => `${i.quantity} × ${i.titleSnapshot}`).join(", ");
}

/** Read-only menus. */
export async function menu(chatId: number, sellerId: string, key: string) {
  const s = await seller(sellerId);
  if (!s) return;
  const demo = s.testOnly;
  const o = { sellerId, isTest: demo };
  if (key === "orders") {
    const rows = await ordersFor(s);
    if (!rows.length) return send(chatId, demo ? "No orders yet. Tap <b>Simulate a buyer</b> to place one." : "No paid orders yet.", { ...o, kind: "orders", buttons: MAIN_MENU(demo) });
    const lines = await Promise.all(rows.map(async (c) => `• <b>${usd(c.totalCents)}</b> · ${esc(await itemsText(c.id))} · ${STATUS_LABEL[c.status as CheckoutStatus] ?? c.status} · ${ago(c.createdAt)}`));
    return send(chatId, `🛍️ <b>Latest orders</b>\n${lines.join("\n")}`, { ...o, kind: "orders", buttons: [[{ text: "Open Orders in the Studio", url: appUrl("/studio/orders") }]] });
  }
  if (key === "refunds") {
    const { db } = services();
    const rows = await db
      .select({ r: schema.refundRequests, c: schema.checkouts })
      .from(schema.refundRequests)
      .innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId))
      .where(and(eq(schema.checkouts.sellerId, s.id), eq(schema.refundRequests.status, "pending")))
      .orderBy(asc(schema.refundRequests.createdAt))
      .limit(3);
    if (!rows.length) return send(chatId, "↩️ Nothing waiting. Refunds inside your policy run automatically.", { ...o, kind: "refunds" });
    for (const { r } of rows) await pingRefundRequest(r.id, chatId);
    return true;
  }
  if (key === "status") {
    const { db } = services();
    const live = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.sellerId, s.id), eq(schema.products.status, "approved")));
    const drafts = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.sellerId, s.id), eq(schema.products.status, "draft")));
    const payout = s.payoutStatus === "verified" ? `✅ Paid directly to your PayPal${s.paypalMerchantId ? ` (${s.paypalMerchantId})` : ""}` : s.payoutStatus === "platform" ? "🏦 Paid into the Shopfront sandbox account (demo shop)" : "⚠️ Not taking payments: connect PayPal in the Studio";
    return send(chatId, [`🏪 <b>${esc(s.displayName)}</b>`, `${live.length} live listing${live.length === 1 ? "" : "s"} · ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`, payout, `Agents buy through ${esc(appUrl("/mcp"))}`].join("\n"), { ...o, kind: "status", buttons: [[{ text: "Open the storefront", url: appUrl(`/s/${s.handle}`) }]] });
  }
  if (key === "sales") {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * DAY);
    const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
    const db = await dbSalesSummary(s.id, iso(from), iso(to));
    const pp = demo ? null : await paypalTransactions(iso(from), iso(to)).catch(() => null);
    const top = db.by_product[0];
    return send(chatId, ["📊 <b>Sales · last 7 days</b>", `<code>${esc(db.summary_line)}</code>`, pp ? `<code>${esc(pp.summary_line)}</code>` : "", top ? `Top seller: ${esc(top.product)} (${top.units} sold, $${top.revenue_usd})` : "", "<i>[db] is live; [paypal] can lag about 3 hours.</i>"].filter(Boolean).join("\n"), { ...o, kind: "sales" });
  }
  if (key === "sim" && demo) {
    const { db } = services();
    const vars = await db
      .select({ id: schema.variants.id, title: schema.products.title, price: schema.variants.priceCents })
      .from(schema.variants)
      .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
      .where(and(eq(schema.products.sellerId, s.id), eq(schema.products.status, "approved"), eq(schema.variants.active, true)))
      .orderBy(asc(schema.variants.priceCents));
    return send(chatId, "🧪 <b>Simulate a buyer</b>\nPick what the buyer's agent orders. You'll get a PayPal link to approve as the sandbox buyer, then the order ping.", {
      ...o,
      kind: "simulate",
      buttons: vars.map((v) => [{ text: `${v.title} · ${usd(v.price)}`, data: `m:simbuy:${v.id}` }]),
    });
  }
  return help(chatId, s);
}

export async function help(chatId: number, s: Seller) {
  return send(chatId, ["Send me a <b>product photo</b> for a new listing, or a <b>shipping label</b> photo to add tracking.", "Or tap a button below. Commands: /orders /refunds /status /sales"].join("\n"), { sellerId: s.id, kind: "help", buttons: MAIN_MENU(s.testOnly), isTest: s.testOnly });
}

const SIM_CLIENT = "telegram-judge-sim";

/** The buyer's token for a simulated practice order, re-derived from the checkout row (never stored). Only for orders
 * this bot created on the isolated test_only practice shop. */
async function simToken(sellerId: string, checkoutId: string): Promise<string | null> {
  const [c] = await services()
    .db.select({ sellerId: schema.checkouts.sellerId, client: schema.checkouts.mcpClientName, crid: schema.checkouts.clientRequestId })
    .from(schema.checkouts)
    .where(eq(schema.checkouts.id, checkoutId));
  if (!c || c.sellerId !== sellerId || c.client !== SIM_CLIENT || !c.crid) return null;
  return newOrderToken(checkoutId, c.crid);
}

/** Judge mode: the buyer's agent places a real sandbox order on the practice shop; the judge approves it in PayPal. */
export async function simulateBuy(chatId: number, sellerId: string, variantId: string) {
  const s = await seller(sellerId);
  if (!s?.testOnly) return;
  const { db } = services();
  const [v] = await db.select({ id: schema.variants.id }).from(schema.variants).innerJoin(schema.products, eq(schema.products.id, schema.variants.productId)).where(and(eq(schema.variants.id, variantId), eq(schema.products.sellerId, s.id)));
  if (!v) return;
  await db.update(schema.variants).set({ stock: 50 }).where(eq(schema.variants.id, v.id));
  // A client_request_id makes the order token re-derivable server-side (tokens.ts), so "Simulate a refund" works after
  // a restart (Render free sleeps) without the token ever being stored.
  const ck = await shop.createCheckout({ items: [{ variant_id: v.id, quantity: 1 }], client_request_id: randomUUID() }, { clientName: SIM_CLIENT, requestId: `tg-sim-${Date.now()}` });
  const lines = [`🧾 <b>Order ready · $${ck.totals.total}</b>`, ck.line_items.map((l) => `${l.quantity} × ${esc(l.title)}`).join(", "), "", "Approve it in PayPal as the buyer. Use the <b>sandbox test buyer</b> shown on the page; no real money moves.", "Your order ping arrives here when PayPal confirms the payment."];
  return send(chatId, lines.join("\n"), { sellerId, checkoutId: ck.checkout_id, kind: "simulated_order", isTest: true, buttons: [[{ text: "Approve in PayPal (as the buyer)", url: ck.pay_url }]] });
}

/** Judge mode: the buyer's agent asks for a refund on a simulated order (the real MCP refund path). */
export async function simulateRefund(chatId: number, sellerId: string, checkoutId: string) {
  const s = await seller(sellerId);
  if (!s?.testOnly) return;
  const token = await simToken(s.id, checkoutId);
  if (!token) return send(chatId, "I can only simulate a refund on a practice order made with <b>Simulate a buyer</b>. Simulate a new one.", { sellerId, kind: "simulated_refund", isTest: true });
  const r = await requestRefund({ checkout_id: checkoutId, order_token: token, reason_code: "damaged", details: "It arrived with a chipped rim (practice refund)." });
  // A refund that needs the seller pings itself (pingRefundRequest); an automatic one is reported here.
  if (r.decision === "auto_approve") await send(chatId, `✅ <b>Refunded automatically · ${usd(Math.round(Number(r.amount.value) * 100))}</b>\nInside your policy, so no tap was needed. PayPal sent the money back to the buyer.`, { sellerId, checkoutId, kind: "refund_auto", isTest: true });
  return r;
}

/** An order was paid: tell every chat linked to the seller. */
export async function pingOrderPaid(checkoutId: string) {
  const { db } = services();
  const [c] = await db.select().from(schema.checkouts).where(eq(schema.checkouts.id, checkoutId));
  if (!c) return;
  const chats = await chatsFor(c.sellerId);
  if (!chats.length) return;
  const s = await seller(c.sellerId);
  const items = await itemsText(c.id);
  const [img] = await db
    .select({ sha: schema.productImages.imageSha256 })
    .from(schema.checkoutItems)
    .innerJoin(schema.variants, eq(schema.variants.id, schema.checkoutItems.variantId))
    .innerJoin(schema.productImages, eq(schema.productImages.productId, schema.variants.productId))
    .where(eq(schema.checkoutItems.checkoutId, c.id))
    .limit(1);
  const paidTo = c.payeeMerchantId || c.payeeEmail ? "straight to your PayPal" : "to the Shopfront sandbox account";
  const html = [`🛍️ <b>New order · ${usd(c.totalCents)}</b>`, esc(items), `Paid in PayPal ${paidTo}. ✅ Payment confirmed.`, "", "📦 When it's packed, send me a photo of the shipping label and I'll add tracking to the PayPal order."].join("\n");
  const buttons: Button[][] = [[{ text: "Open the order", url: appUrl("/studio/orders") }]];
  if (s?.testOnly && c.mcpClientName === SIM_CLIENT) buttons.push([{ text: "🧪 Simulate a refund request", data: `m:simrefund:${c.id}` }]);
  for (const chatId of chats) await send(chatId, html, { sellerId: c.sellerId, checkoutId: c.id, kind: "order_ping", buttons, photoUrl: img ? imageUrl(img.sha) : undefined, isTest: c.isTest });
}

/** A refund needs the seller: Approve / Decline buttons (single-use action rows, D-072). */
export async function pingRefundRequest(refundRequestId: string, onlyChat?: number) {
  const { db } = services();
  const [row] = await db.select({ r: schema.refundRequests, c: schema.checkouts }).from(schema.refundRequests).innerJoin(schema.checkouts, eq(schema.checkouts.id, schema.refundRequests.checkoutId)).where(eq(schema.refundRequests.id, refundRequestId));
  if (!row || row.r.status !== "pending") return;
  const chats = onlyChat ? [onlyChat] : await chatsFor(row.c.sellerId);
  const items = await itemsText(row.c.id);
  const trace = (row.r.decisionTrace as Array<{ rule: string; passed: boolean }>).find((t) => !t.passed);
  const why: Record<string, string> = { under_auto_cap: "It's above your automatic refund limit", buyer_auto_refund_limit: "This buyer already had automatic refunds this month", within_window: "It's outside your refund window", reason_auto_eligible: "That reason always needs you", reason_not_always_review: "That reason always needs you" };
  for (const chatId of chats) {
    const approve = await createChatAction({ sellerId: row.c.sellerId, chatId, kind: "approve_refund", payload: { refundRequestId } });
    const decline = await createChatAction({ sellerId: row.c.sellerId, chatId, kind: "decline_refund", payload: { refundRequestId } });
    const html = [`↩️ <b>Refund request · ${usd(row.r.amountCents)}</b>`, esc(items), `Reason: ${row.r.reasonCode.replace(/_/g, " ")}${row.r.details ? ` · “${esc(row.r.details.slice(0, 120))}”` : ""}`, `${trace ? why[trace.rule] ?? "Your policy asks you to decide" : "Your policy asks you to decide"}, so it's your call. The amount was computed by the server.`].join("\n");
    await send(chatId, html, { sellerId: row.c.sellerId, checkoutId: row.c.id, kind: "refund_request", isTest: row.c.isTest, buttons: [[{ text: `✅ Refund ${usd(row.r.amountCents)}`, data: approve.id }, { text: "Decline", data: decline.id }]] });
  }
}

/** A photo arrived: a product photo (→ listing) or a shipping label (→ tracking). The caption decides, else ask. */
export async function onPhoto(chatId: number, sellerId: string, bytes: Buffer, caption: string | undefined) {
  const s = await seller(sellerId);
  if (!s) return;
  const img = await storeImage(bytes);
  const r = ref(img.sha256, chatId);
  if (/label|tracking|ship/i.test(caption ?? "")) return photoAsLabel(chatId, sellerId, r);
  if (/list|sell|product|new/i.test(caption ?? "")) return photoAsListing(chatId, sellerId, r);
  return send(chatId, "📸 Got it. What is this photo?", { sellerId, kind: "photo_question", isTest: s.testOnly, buttons: [[{ text: "✨ A new listing", data: `m:pl:${r}` }, { text: "📦 A shipping label", data: `m:pt:${r}` }]] });
}

function draftCard(d: { title: string; description: string; priceCents: number; flags: string[] }) {
  return [
    `✨ <b>Draft: ${esc(d.title)}</b>`,
    esc(d.description.slice(0, 220)) + (d.description.length > 220 ? "…" : ""),
    "",
    d.priceCents >= 100 ? `💲 Price: <b>${usd(d.priceCents)}</b> · the AI's guess until you publish. You decide.` : "💲 No price yet: tap <b>Set my price</b>.",
    ...(d.flags.length ? [`⚠️ ${esc(d.flags[0]!)}`] : []),
    "Nothing is live until you tap Publish.",
  ].join("\n");
}

async function sendDraft(chatId: number, s: Seller, productId: string) {
  const { db } = services();
  const [p] = await db.select().from(schema.products).where(and(eq(schema.products.id, productId), eq(schema.products.sellerId, s.id)));
  if (!p) return;
  const vars = await db.select().from(schema.variants).where(eq(schema.variants.productId, p.id));
  const [img] = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, p.id)).limit(1);
  const price = Math.min(...vars.map((v) => v.priceCents));
  const buttons: Button[][] = [];
  if (price >= 100) {
    const publish = await createChatAction({ sellerId: s.id, chatId, kind: "publish", payload: { productId: p.id } });
    buttons.push([{ text: `✅ Publish at ${usd(price)}`, data: publish.id }]);
  }
  buttons.push([{ text: "✏️ Set my price", data: `m:price:${p.id}` }, { text: "Edit in the Studio", url: appUrl("/studio") }]);
  return send(chatId, draftCard({ title: p.title, description: p.description, priceCents: price, flags: injectionFlags(p.title, p.description) }), { sellerId: s.id, kind: "draft", isTest: s.testOnly, buttons, photoUrl: img ? imageUrl(img.imageSha256) : undefined });
}

export async function photoAsListing(chatId: number, sellerId: string, r: string) {
  const s = await seller(sellerId);
  const p = refs.get(r);
  if (!s || !p || p.chatId !== chatId) return send(chatId, "That photo expired. Send it again.", { sellerId, kind: "photo_expired" });
  await send(chatId, "✨ Reading your photo… (about 10 seconds)", { sellerId, kind: "reading", isTest: s.testOnly });
  try {
    const d = await draftFromPhoto(s, p.sha, `tg:${chatId}`);
    return sendDraft(chatId, s, d.productId);
  } catch (e) {
    return send(chatId, `I couldn't read that photo (${esc(e instanceof Error ? e.message.slice(0, 80) : "error")}). Try another, or add it in the Studio.`, { sellerId, kind: "draft_failed", isTest: s.testOnly });
  }
}

export async function photoAsLabel(chatId: number, sellerId: string, r: string) {
  const s = await seller(sellerId);
  const p = refs.get(r);
  if (!s || !p || p.chatId !== chatId) return send(chatId, "That photo expired. Send it again.", { sellerId, kind: "photo_expired" });
  await send(chatId, "📦 Reading the label…", { sellerId, kind: "reading", isTest: s.testOnly });
  const label = await readLabel(p.sha, `tg:${chatId}`).catch(() => null);
  if (!label?.trackingNumber) return send(chatId, "I couldn't read a tracking number on that label. Try a sharper, straight-on photo.", { sellerId, kind: "label_unreadable", isTest: s.testOnly });
  // The oldest paid order that has no shipment yet is the one this label is for (the seller can still pick another
  // in the Studio).
  const { db } = services();
  const paid = await db
    .select()
    .from(schema.checkouts)
    .where(and(eq(schema.checkouts.sellerId, s.id), eq(schema.checkouts.status, "paid"), s.testOnly ? undefined : eq(schema.checkouts.isTest, false)))
    .orderBy(asc(schema.checkouts.createdAt))
    .limit(30);
  const shipped = paid.length ? new Set((await db.select({ id: schema.shipments.checkoutId }).from(schema.shipments).where(inArray(schema.shipments.checkoutId, paid.map((c) => c.id)))).map((r) => r.id)) : new Set<string>();
  const candidates = paid.filter((c) => !shipped.has(c.id));
  const target = candidates[0];
  if (!target) return send(chatId, `Read <b>${esc(label.carrier)} ${esc(label.trackingNumber)}</b>, but there's no paid order waiting to ship.`, { sellerId, kind: "label_no_order", isTest: s.testOnly });
  const action = await createChatAction({ sellerId: s.id, chatId, kind: "add_tracking", payload: { checkoutId: target.id, shipmentDraftId: p.sha } });
  return send(chatId, [`📦 <b>${esc(label.carrier)} ${esc(label.trackingNumber)}</b>`, `Add it to the order for ${esc(await itemsText(target.id))} (${usd(target.totalCents)})?`, "I'll put the tracking on the PayPal order and tell the buyer."].join("\n"), { sellerId, checkoutId: target.id, kind: "label_read", isTest: target.isTest, buttons: [[{ text: "✅ Add tracking", data: action.id }]] });
}

/** Free text: a price the seller was asked for, a command, a sales question, or help. */
export async function onText(chatId: number, sellerId: string, text: string) {
  const s = await seller(sellerId);
  if (!s) return;
  const pend = pendingPrice.get(chatId);
  if (pend && Date.now() - pend.at < 15 * 60_000) {
    const price = parsePriceInput(text);
    if (!price.ok) return send(chatId, "Send just the price, like <b>38</b> or <b>38.50</b>.", { sellerId, kind: "price_prompt", isTest: s.testOnly });
    pendingPrice.delete(chatId);
    const { db } = services();
    const [p] = await db.select().from(schema.products).where(and(eq(schema.products.id, pend.productId), eq(schema.products.sellerId, s.id), eq(schema.products.status, "draft")));
    if (!p) return send(chatId, "That draft is no longer waiting. Send the photo again.", { sellerId, kind: "price_prompt", isTest: s.testOnly });
    await db.update(schema.variants).set({ priceCents: price.cents }).where(eq(schema.variants.productId, p.id));
    return sendDraft(chatId, s, p.id);
  }
  const t = text.trim().toLowerCase();
  if (t.startsWith("/orders")) return menu(chatId, sellerId, "orders");
  if (t.startsWith("/refunds")) return menu(chatId, sellerId, "refunds");
  if (t.startsWith("/status")) return menu(chatId, sellerId, "status");
  if (t.startsWith("/sales") || /\b(sales|sold|revenue|how much|earn)/.test(t)) return menu(chatId, sellerId, "sales");
  if (t.startsWith("/start") || t.startsWith("/menu")) return welcome(chatId, sellerId);
  return help(chatId, s);
}

/** Read-only button taps ("m:…"). */
export async function onMenuTap(chatId: number, sellerId: string, data: string) {
  const [, key, arg] = data.split(":");
  if (key === "pl" && arg) return photoAsListing(chatId, sellerId, arg);
  if (key === "pt" && arg) return photoAsLabel(chatId, sellerId, arg);
  if (key === "simbuy" && arg) return simulateBuy(chatId, sellerId, arg);
  if (key === "simrefund" && arg) return simulateRefund(chatId, sellerId, arg);
  if (key === "price" && arg) {
    pendingPrice.set(chatId, { productId: arg, at: Date.now() });
    const s = await seller(sellerId);
    return send(chatId, "✏️ What price? Reply with just the number, like <b>38</b>.", { sellerId, kind: "price_prompt", isTest: s?.testOnly });
  }
  return menu(chatId, sellerId, key ?? "help");
}

export const TELEGRAM_CONFIGURED = () => Boolean(env().TELEGRAM_BOT_TOKEN);
