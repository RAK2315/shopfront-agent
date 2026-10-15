import "server-only";
import { centsToValue, CustomerMessageDraft, newId } from "@shopfront/core";
import { and, eq, schema } from "@shopfront/db";
import { recordEvent } from "./events";
import { llm } from "./llm";
import { services } from "./services";

// The seller agent's notes to the buyer (D-008): published on the order page and in get_checkout_status, never
// emailed. The model writes the wording only; every fact (amounts, tracking) is appended by code from the database,
// so a message can never misstate money.

type Kind = "thank_you" | "shipped" | "refund";
export interface MessageFacts {
  reason?: string;
  amountCents?: number;
  outcome?: "refunded" | "review" | "declined";
  carrier?: string;
  trackingNumber?: string;
}

const BRIEF: Record<Kind, string> = {
  thank_you: "Thank the buyer for their order. Mention it was made by hand and that you'll share tracking when it ships.",
  shipped: "Tell the buyer their order is on its way.",
  refund: "Update the buyer on their refund request.",
};

function facts(kind: Kind, f: MessageFacts): string {
  if (kind === "shipped") return `Carrier: ${f.carrier} · Tracking number: ${f.trackingNumber}`;
  if (kind === "refund") {
    const amt = f.amountCents !== undefined ? `$${centsToValue(f.amountCents)}` : "";
    if (f.outcome === "refunded") return `Refund of ${amt} sent to your PayPal account.`;
    if (f.outcome === "declined") return `Refund request for ${amt} was declined by the seller.`;
    return `Refund request for ${amt} is waiting for the seller's review.`;
  }
  return "";
}

function template(kind: Kind, shop: string, f: MessageFacts) {
  if (kind === "thank_you") return { subject: `Thank you from ${shop}`, body: `Thank you for your order. It's made by hand here at ${shop}, and I'll share tracking as soon as it ships.` };
  if (kind === "shipped") return { subject: "Your order is on its way", body: "Your order is packed and on its way to you. I hope you love it." };
  const body =
    f.outcome === "refunded" ? "I'm sorry it didn't work out. Your refund has been sent." : f.outcome === "declined" ? "I've looked at your request and can't offer a refund this time. Please reply if you'd like to talk it over." : "Thanks for letting me know. I'll look at your request shortly.";
  return { subject: "About your refund", body };
}

/** Draft (model, with template fallback) and publish one note. Each kind is published at most once per order, except refund updates. */
export async function publishMessage(checkoutId: string, kind: Kind, f: MessageFacts = {}) {
  const { db } = services();
  try {
    if (kind !== "refund") {
      const [exists] = await db.select({ id: schema.messages.id }).from(schema.messages).where(and(eq(schema.messages.checkoutId, checkoutId), eq(schema.messages.kind, kind)));
      if (exists) return;
    }
    const [c] = await db
      .select({ shop: schema.sellers.displayName, sellerId: schema.sellers.id })
      .from(schema.checkouts)
      .innerJoin(schema.sellers, eq(schema.sellers.id, schema.checkouts.sellerId))
      .where(eq(schema.checkouts.id, checkoutId));
    if (!c) return;
    const items = await db.select({ t: schema.checkoutItems.titleSnapshot }).from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, checkoutId));

    let draft = template(kind, c.shop, f);
    let source = "template";
    try {
      const r = await llm().agent.object({
        route: "message",
        promptVersion: "message-v1",
        system: `You write short, warm notes from a one-person shop (${c.shop}) to a buyer. 2–3 sentences, first person, no emojis. Do not mention any prices, amounts, numbers, dates or tracking details: those are added separately. Never promise anything not stated.`,
        prompt: `${BRIEF[kind]}\nItems: ${items.map((i) => i.t).join(", ")}${f.reason ? `\nRefund reason: ${f.reason.replace(/_/g, " ")}` : ""}${f.outcome ? `\nOutcome: ${f.outcome}` : ""}`,
        schema: CustomerMessageDraft,
        schemaName: "CustomerMessageDraft",
      });
      // Guard: a draft that slips in a number is replaced by the template rather than published.
      if (!/\d/.test(r.value.body)) {
        draft = r.value;
        source = r.source;
      }
    } catch {
      /* template */
    }
    const line = facts(kind, f);
    const body = line ? `${draft.body.trim()}\n\n${line}` : draft.body.trim();
    await db.insert(schema.messages).values({ id: newId("message"), checkoutId, kind, subject: draft.subject.slice(0, 120), body, status: "published" });
    await recordEvent(db, {
      actor: "ops_agent",
      kind: "message_published",
      checkoutId,
      sellerId: c.sellerId,
      summary: `${kind === "thank_you" ? "Thank-you note" : kind === "shipped" ? "Shipping note" : "Refund update"} published to the buyer's order page`,
      data: { source },
    });
  } catch (e) {
    console.error("message failed", checkoutId, kind, e);
  }
}
