import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="18 October 2026">
      <p>Shopfront is a demo built for the &ldquo;Build What&apos;s Next with PayPal and AI&rdquo; hackathon. By using it you agree to these short terms.</p>
      <ul>
        <li>
          <b className="text-ink">Sandbox only.</b> Every payment, refund and payout uses PayPal&apos;s sandbox with test accounts. Nothing is real: no goods ship, and no real money moves.
        </li>
        <li>
          <b className="text-ink">Demo shops.</b> The shops, listings and prices are sample data. Their photos are public-domain museum pieces standing in for the sellers&apos; work.
        </li>
        <li>
          <b className="text-ink">AI.</b> AI drafts listings, notes and answers. Prices, totals and refunds are always set by the shop&apos;s rules, never by the AI.
        </li>
        <li>
          <b className="text-ink">Fair use.</b> Please don&apos;t overload the free hosting. Trying to trick the agent into a wrong price is welcome; that&apos;s what the hack button is for.
        </li>
        <li>
          <b className="text-ink">No warranty.</b> The demo is provided as is and may change, reset or go offline at any time.
        </li>
      </ul>
      <p>Questions: open an issue on the project&apos;s GitHub repository.</p>
    </LegalPage>
  );
}
