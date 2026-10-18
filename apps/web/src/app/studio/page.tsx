import type { Metadata } from "next";
import Link from "next/link";
import { SellerNav } from "@/components/studio/seller-nav";
import { SiteNav } from "@/components/site/site-nav";
import { eq, schema } from "@shopfront/db";
import { SellerSignIn } from "@/components/studio/sign-in";
import { Studio } from "@/components/studio/studio";
import { GetPaidCard } from "@/components/studio/get-paid-card";
import { TelegramCard } from "@/components/studio/telegram-card";
import { StoreSyncCard } from "@/components/studio/store-sync-card";
import { botUsername } from "@/server/telegram";
import { payoutCard } from "@/server/paypal-connect";
import { sellerProducts } from "@/server/catalog";
import { appUrl, env } from "@/server/env";
import { currentSeller, DEMO_SELLER_HANDLES } from "@/server/seller-session";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio", robots: { index: false } };

// Seller studio (craft retail register): photos → AI-drafted listings → seller confirms prices → live + PayPal catalog.
export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const seller = await currentSeller();

  if (!seller) {
    const [demo] = await services().db.select().from(schema.sellers).where(eq(schema.sellers.handle, DEMO_SELLER_HANDLES[0]));
    return (
      <>
      <SiteNav tone="bar" />
      <main className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-[44rem] content-center gap-6 px-5 py-16">
        <Link href="/" className="w-fit font-display text-lg font-semibold text-ink-2 hover:text-ink">
          Shopfront
        </Link>
        <h1 className="font-display text-display font-medium tracking-[-0.02em]">Seller studio</h1>
        <p className="prose-width text-md text-ink-2">
          Turn product photos into listings that AI shopping agents can buy, with payment through PayPal. This demo signs you in as{" "}
          <span className="font-medium text-ink">{demo?.displayName ?? "the demo seller"}</span>, a one-person ceramics studio.
        </p>
        {demo && <SellerSignIn handle={demo.handle} displayName={demo.displayName} />}
        <p className="text-sm text-muted">Sandbox only: no real money moves.</p>
      </main>
      </>
    );
  }

  const [drafts, live, card, bot] = await Promise.all([sellerProducts(seller.id, ["draft"]), sellerProducts(seller.id, ["approved"]), payoutCard(seller.id), botUsername().catch(() => null)]);
  const result = (await searchParams).paypal;
  return (
    <>
    <SiteNav tone="bar" />
    <main className="mx-auto grid min-h-dvh max-w-[76rem] content-start gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="grid gap-1">
          <Link href="/" className="w-fit text-sm font-medium text-ink-2 hover:text-ink">
            Shopfront studio
          </Link>
          <h1 className="font-display text-display font-medium tracking-[-0.02em]">{seller.displayName}</h1>
          <p className="max-w-[60ch] text-base text-ink-2">{seller.bio}</p>
        </div>
        <SellerNav handle={seller.handle} current="studio" />
      </header>
      {card && <GetPaidCard card={card} result={typeof result === "string" ? result : undefined} connectEnabled={env().PAYPAL_LIPP_ENABLED === "1"} />}
      <TelegramCard judgeLink={bot ? `https://t.me/${bot}?start=judge` : null} />
      <StoreSyncCard baseUrl={appUrl(`/api/paypal/v1/stores/${seller.handle}`)} />
      <Studio seller={{ handle: seller.handle, displayName: seller.displayName }} initialDrafts={drafts} initialLive={live} mcpUrl={appUrl("/mcp")} />
    </main>
    </>
  );
}
