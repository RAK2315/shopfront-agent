import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="18 October 2026">
      <p>Shopfront is a demo built for a hackathon. It runs only on PayPal&apos;s sandbox, with test accounts. Please don&apos;t enter real personal or payment details.</p>
      <h2>What we keep</h2>
      <ul>
        <li>Demo orders: the items, totals and the PayPal order, capture and refund ids. The shipping address PayPal returns is kept on the order; only its country is shown in the demo.</li>
        <li>For a seller who connects with Log in with PayPal: the PayPal account id, email and verification status PayPal shares, to make sure payments go to the right account. We never see or store a PayPal password, and the sign-in token is used once and thrown away.</li>
        <li>Product photos you upload, and what the AI read from them.</li>
        <li>For the Telegram copilot: which chat is linked to which shop, and the messages the bot sent (with the chat id stored as a one-way hash).</li>
        <li>Technical logs: request ids and PayPal debug ids, to show and debug what happened.</li>
      </ul>
      <h2>Who else sees it</h2>
      <ul>
        <li>PayPal (sandbox), which processes the demo payments.</li>
        <li>Google Gemini and Groq, which read product photos and labels and draft text. Photos and chat text you send are passed to them for that.</li>
        <li>Telegram, if you use the copilot.</li>
        <li>Render and Neon, which host the app and its database.</li>
      </ul>
      <p>Events on the public live wire show what an agent or PayPal did, never a buyer&apos;s name, email or address.</p>
      <h2>Your choices</h2>
      <p>Everything here is sandbox demo data. To have something removed, open an issue on the project&apos;s GitHub repository.</p>
    </LegalPage>
  );
}
