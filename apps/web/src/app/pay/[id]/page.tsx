import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bot } from "lucide-react";
import { centsToValue, optionsLabel, type CheckoutStatus } from "@shopfront/core";
import { eq, schema } from "@shopfront/db";
import { Money } from "@/components/ui/money";
import { PayPalApprove } from "@/components/pay/paypal-approve";
import { env } from "@/server/env";
import { services } from "@/server/services";
import { verifyOrderToken } from "@/server/tokens";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approve your order", robots: { index: false } };

export default async function PayPage({ params, searchParams }: PageProps<"/pay/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const t = typeof sp.t === "string" ? sp.t : "";
  if (!/^chk_[a-z0-9]{12}$/.test(id) || !verifyOrderToken(id, t)) notFound();

  const { db } = services();
  const [c] = await db
    .select({ checkout: schema.checkouts, seller: schema.sellers })
    .from(schema.checkouts)
    .innerJoin(schema.sellers, eq(schema.sellers.id, schema.checkouts.sellerId))
    .where(eq(schema.checkouts.id, id));
  if (!c?.checkout.paypalOrderId) notFound();
  const items = await db.select().from(schema.checkoutItems).where(eq(schema.checkoutItems.checkoutId, id));
  const ck = c.checkout;
  const expired = ck.status === "created" && ck.expiresAt < new Date();

  return (
    <main className="mx-auto grid min-h-dvh max-w-[64rem] grid-cols-[minmax(0,1fr)] content-start gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:py-16">
      <section aria-labelledby="order" className="grid content-start gap-6">
        <p className="font-display text-lg font-semibold">{c.seller.displayName}</p>
        <div className="grid gap-2">
          <h1 id="order" className="font-display text-display font-medium tracking-[-0.02em]">
            Your order
          </h1>
          <p className="inline-flex items-center gap-2 text-base text-ink-2">
            <Bot aria-hidden className="size-4 text-clay" />
            Prepared by {ck.mcpClientName ? <span className="font-medium text-ink">{ck.mcpClientName}</span> : "your shopping agent"} through
            Shopfront
          </p>
        </div>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((i) => (
            <li key={i.variantId} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-medium">{i.titleSnapshot}</p>
                <p className="text-sm text-ink-2">
                  {optionsLabel(i.optionsSnapshot)}
                  {i.quantity > 1 && ` · ${i.quantity} × $${centsToValue(i.unitPriceCents)}`}
                </p>
              </div>
              <Money cents={i.lineTotalCents} className="text-base font-medium" />
            </li>
          ))}
        </ul>
        <dl className="grid gap-1.5 text-base">
          <div className="flex justify-between text-ink-2">
            <dt>Items</dt>
            <dd><Money cents={ck.itemTotalCents} /></dd>
          </div>
          <div className="flex justify-between text-ink-2">
            <dt>Shipping</dt>
            <dd><Money cents={ck.shippingCents} /></dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-2.5 text-lg font-semibold">
            <dt>Total</dt>
            <dd><Money cents={ck.totalCents} showCode /></dd>
          </div>
        </dl>
        <p className="text-sm text-muted">Totals are set by the shop, not by the agent. Sandbox demo: no real money moves.</p>
      </section>

      <aside aria-label="Approve payment" className="grid content-start gap-4 lg:sticky lg:top-16">
        <div className="grid gap-4 rounded-lg border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">Approve in PayPal</h2>
          {expired || ck.status === "cancelled" ? (
            <p className="text-base text-ink-2">This checkout has expired. Ask your agent to create a new one.</p>
          ) : (
            <PayPalApprove
              checkoutId={ck.id}
              token={t}
              orderId={ck.paypalOrderId!}
              clientId={env().PAYPAL_CLIENT_ID}
              amount={centsToValue(ck.totalCents)}
              initialStatus={ck.status as CheckoutStatus}
            />
          )}
        </div>
      </aside>
    </main>
  );
}
