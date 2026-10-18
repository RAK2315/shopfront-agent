import Link from "next/link";
import type { ReactNode } from "react";

/** A branded dead end (bad link, expired page, 404): what happened, and the one next step. */
export function DeadEnd({ eyebrow, title, children, actions }: { eyebrow: string; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 px-5 py-16 sm:px-8">
      <Link href="/" className="w-fit font-display text-lg font-semibold text-ink-2 hover:text-ink">
        Shopfront
      </Link>
      <div className="grid gap-3">
        <p className="text-sm font-medium uppercase tracking-[0.08em] text-clay">{eyebrow}</p>
        <h1 className="font-display text-display font-medium tracking-[-0.02em]">{title}</h1>
        <div className="grid gap-3 text-base text-ink-2">{children}</div>
      </div>
      <div className="flex flex-wrap gap-3">
        {actions ?? (
          <Link href="/shop" className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-base font-medium text-canvas hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
            Go to the shop
          </Link>
        )}
      </div>
    </main>
  );
}
