import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX, Lock } from "lucide-react";
import { eq, schema } from "@shopfront/db";
import { SiteNav } from "@/components/site/site-nav";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approved in PayPal", robots: { index: false } };

// Where PayPal returns the buyer after approving a Cart API order (D-097). PayPal appends ?token=<order>&PayerID=<payer>;
// the buyer's agent reads them and calls POST /merchant-cart/{id}/checkout. Nothing is charged here, or at checkout:
// the order is authorized, and captured when the shop ships (D-098).
export default async function CartApproved({ searchParams }: PageProps<"/cart/approved">) {
  const sp = await searchParams;
  const cartId = typeof sp.cart === "string" && /^cart_[a-z0-9]{12}$/.test(sp.cart) ? sp.cart : null;
  const [row] = cartId
    ? await services()
        .db.select({ cart: schema.carts, seller: schema.sellers })
        .from(schema.carts)
        .innerJoin(schema.sellers, eq(schema.sellers.id, schema.carts.sellerId))
        .where(eq(schema.carts.id, cartId))
    : [];
  const cancelled = sp.cancelled === "1";
  return (
    <div className="min-h-dvh bg-canvas">
      <SiteNav tone="bar" />
      <main className="mx-auto grid max-w-xl gap-5 px-4 py-12 sm:py-16" data-testid="cart-approved" data-state={cancelled ? "cancelled" : row ? "approved" : "unknown"}>
        {cancelled ? (
          <>
            <CircleX aria-hidden className="size-9 text-muted" />
            <h1 className="font-display text-display font-medium tracking-[-0.02em]">You left PayPal</h1>
            <p className="text-md text-ink-2">Nothing was charged. Your shopping agent can send you the approval link again.</p>
          </>
        ) : (
          <>
            <CircleCheck aria-hidden className="size-9 text-success" />
            <h1 className="font-display text-display font-medium tracking-[-0.02em]">Approved in PayPal</h1>
            <p className="text-md text-ink-2">
              Your shopping agent finishes the order with {row?.seller.displayName ?? "the shop"} through PayPal&apos;s Cart API. You can close this tab.
            </p>
            <p className="inline-flex items-start gap-2 rounded-md border border-paypal/20 bg-paypal-soft px-3 py-2.5 text-base text-ink">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-paypal" />
              PayPal holds the payment and charges it only when the shop ships your order.
            </p>
          </>
        )}
        <p className="text-sm text-muted">
          Sandbox demo: no real money moves. <Link href="/developers" className="underline decoration-line-strong underline-offset-4 hover:text-ink">How the Cart API works</Link>
        </p>
      </main>
    </div>
  );
}
