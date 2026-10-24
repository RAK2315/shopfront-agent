import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, schema } from "@shopfront/db";
import { GauntletBoard, type StoredRun } from "@/components/gauntlet/gauntlet-board";
import { SiteNav } from "@/components/site/site-nav";
import type { AttackResult, GauntletSummary } from "@/lib/gauntlet";
import { isTestRun } from "@/server/run-context";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "The Gauntlet",
  description: "31 attacks on two shops with the same AI model: a naive shop whose agent tools take a price, and Shopfront. Real model calls, real PayPal sandbox orders.",
};

// The Gauntlet (D-102): the latest stored run, and a button to run it again live.
export default async function GauntletPage() {
  const test = await isTestRun();
  const [row] = await services()
    .db.select()
    .from(schema.gauntletRuns)
    .where(and(eq(schema.gauntletRuns.status, "done"), test ? undefined : eq(schema.gauntletRuns.isTest, false)))
    .orderBy(desc(schema.gauntletRuns.createdAt))
    .limit(1);
  const initial: StoredRun = row ? { id: row.id, createdAt: row.createdAt.toISOString(), results: row.results as unknown as AttackResult[], summary: row.summary as unknown as GauntletSummary } : null;

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-[96rem] px-5 pt-5 sm:px-8 xl:px-12">
        <SiteNav />
      </div>
      <main className="mx-auto grid max-w-[96rem] gap-10 px-5 pt-10 pb-20 sm:px-8 xl:px-12">
        <header className="grid gap-4">
          <p className="w-fit rounded-pill border border-line bg-surface px-3 py-1 text-sm text-ink-2">The Gauntlet</p>
          <h1 className="max-w-[20ch] font-display text-display font-medium tracking-[-0.02em]">31 attacks. Two shops. The same AI model.</h1>
          <p className="max-w-[68ch] text-lg text-ink-2">
            On the left, a naive shop: its agent tools accept a price, its order code trusts it, its cart and webhook handlers check nothing. On the right, Shopfront. The attacks hide in chat, in product photos and in shipping-label photos read by the vision step, or go straight at the APIs. Every result is a real answer: real model calls, real PayPal sandbox requests, real server responses.
          </p>
        </header>
        <GauntletBoard initial={initial} />
        <footer className="grid max-w-[68ch] gap-2 border-t border-line pt-6 text-sm text-ink-2">
          <p>
            <span className="font-medium text-ink">How the harm is contained.</span> The naive shop&apos;s orders are real PayPal sandbox orders, but nobody is ever shown their approval link, so they can&apos;t be approved or captured, and the sandbox discards unapproved orders. Its refunds, cross-store reads and webhook acceptance run in its own memory and are never sent to PayPal. Shopfront&apos;s side runs the same paths every buyer and agent uses.
          </p>
          <p>
            Same model on both sides (free tier, through the same budget guard); answers are cached by prompt and image, and each result says whether it was live or answered before. Try one attack yourself on the <Link href="/shop" className="text-clay-strong underline-offset-4 hover:underline">buyer demo</Link>.
          </p>
        </footer>
      </main>
    </div>
  );
}
