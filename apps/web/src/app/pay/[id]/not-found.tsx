import Link from "next/link";
import { DeadEnd } from "@/components/ui/dead-end";

// A pay link is only valid with its signed `t=` token (only the checkout's creator holds it). A missing or wrong
// token, an unknown checkout and a bad return link all land here, so the page never says which one it was.
export default function PayLinkInvalid() {
  return (
    <DeadEnd
      eyebrow="Payment link"
      title="This payment link is incomplete or expired"
      actions={
        <>
          <Link href="/shop" className="inline-flex h-11 items-center rounded-md bg-ink px-4 text-base font-medium text-canvas hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
            Ask the shopping agent again
          </Link>
          <Link href="/" className="inline-flex h-11 items-center rounded-md border border-line-strong px-4 text-base font-medium text-ink hover:border-clay focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay">
            What is Shopfront?
          </Link>
        </>
      }
    >
      <p>Open the link exactly as your agent gave it: it ends with a long code after <code className="rounded bg-surface-2 px-1 text-sm">?t=</code>. If you copied part of it, copy it again.</p>
      <p>No money moved. If the order was never approved, ask your agent for a new checkout; the shop sets the price again.</p>
    </DeadEnd>
  );
}
