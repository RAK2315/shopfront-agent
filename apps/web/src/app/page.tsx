import Link from "next/link";

// Placeholder home until Phase 3 builds the seller onboarding. Keeps the brand voice; links to the style guide.
export default function Home() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-[60rem] content-center gap-6 px-6 py-16">
      <p className="font-display text-xl font-semibold">Shopfront</p>
      <h1 className="max-w-[16ch] font-display text-hero font-medium tracking-[-0.025em]">
        Your shop, buyable by AI agents.
      </h1>
      <p className="prose-width text-md text-ink-2">
        Turn product photos into a PayPal-backed store that shopping agents can find, order from and pay through.
        The agent shops; the human approves in PayPal.
      </p>
      <Link href="/design" className="text-base font-medium text-clay-strong underline-offset-4 hover:underline">
        View the design system →
      </Link>
    </main>
  );
}
