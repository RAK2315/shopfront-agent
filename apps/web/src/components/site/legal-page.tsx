import type { ReactNode } from "react";
import { SiteNav } from "@/components/site/site-nav";

/** Short, plain legal pages for the sandbox demo (linked from PayPal's Log in with PayPal consent screen). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <SiteNav tone="bar" />
      <main className="mx-auto grid max-w-[44rem] gap-6 px-5 py-12 sm:px-8">
        <div className="grid gap-2">
          <h1 className="font-display text-display font-medium tracking-[-0.02em]">{title}</h1>
          <p className="text-sm text-muted">Last updated {updated} · Shopfront is a hackathon demo running on the PayPal sandbox. No real money moves.</p>
        </div>
        <div className="grid gap-5 text-md text-ink-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-medium [&_h2]:text-ink [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1 [&_ul]:pl-5">{children}</div>
      </main>
    </div>
  );
}
