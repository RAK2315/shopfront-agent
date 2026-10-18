import { MessageCircle } from "lucide-react";

/** The seller copilot's front door in the Studio (Phase 10, D-092): judge mode opens the isolated practice shop. */
export function TelegramCard({ judgeLink }: { judgeLink: string | null }) {
  if (!judgeLink) return null;
  return (
    <section aria-labelledby="tg-h" className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" data-testid="telegram-card">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-clay-soft text-clay-strong" aria-hidden>
          <MessageCircle className="size-5" />
        </span>
        <div className="grid gap-1">
          <h2 id="tg-h" className="text-md font-semibold text-ink">Your seller copilot on Telegram</h2>
          <p className="text-sm text-ink-2">
            Order pings, refund approvals with one tap, a photo becomes a listing, a label photo adds tracking to PayPal. Try it on a practice shop: it can&apos;t touch this one.
          </p>
        </div>
      </div>
      <a href={judgeLink} target="_blank" rel="noopener" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-4 text-base font-medium text-ink hover:border-clay" data-testid="telegram-judge-link">
        Open the practice shop in Telegram
      </a>
    </section>
  );
}
