"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Store-Sync-ready" in the Studio (D-097): this shop's PayPal Cart API v1 base URL, and a 30-day key for an agent the
 * seller trusts. The key is shown once; it works for this store only.
 */
export function StoreSyncCard({ baseUrl }: { baseUrl: string }) {
  const [client, setClient] = useState("");
  const [token, setToken] = useState<{ token: string; expires_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/seller/cart-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client }) });
      const j = (await r.json()) as { token?: string; expires_at?: string; error?: { message?: string } };
      if (!r.ok || !j.token) throw new Error(j.error?.message ?? "Couldn't issue a key.");
      setToken({ token: j.token, expires_at: j.expires_at! });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't issue a key.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="ss-h" className="grid gap-3 rounded-lg border border-line bg-surface p-4" data-testid="store-sync-card">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-clay-soft text-clay-strong" aria-hidden>
          <ShoppingCart className="size-5" />
        </span>
        <div className="grid min-w-0 gap-1">
          <h2 id="ss-h" className="text-md font-semibold text-ink">Store-Sync-ready: PayPal&apos;s Cart API</h2>
          <p className="text-sm text-ink-2">
            Shopping agents can build carts and check out with PayPal at your shop&apos;s own endpoint. You&apos;re paid when you ship.{" "}
            <Link href="/developers" className="font-medium text-ink underline decoration-line-strong underline-offset-4">
              How it works
            </Link>
          </p>
          <code className="mt-1 break-all rounded-md bg-surface-2 px-2 py-1 font-mono text-xs text-ink" data-testid="store-sync-base">
            {baseUrl}
          </code>
        </div>
      </div>
      {!token ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void issue();
          }}
        >
          <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium text-ink">
            Give an agent a key
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. My shopping assistant" maxLength={60} className="h-11 min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base font-normal outline-none focus:border-clay" />
          </label>
          <Button type="submit" variant="secondary" size="lg" disabled={busy || client.trim().length < 2} data-testid="issue-agent-key">
            Issue a 30-day key
          </Button>
          {error && <p className="w-full text-sm text-danger">{error}</p>}
        </form>
      ) : (
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-ink-2">
              Key for <span className="font-medium text-ink">{client}</span>, valid until {new Date(token.expires_at).toLocaleDateString()}. Copy it now: it isn&apos;t shown again.
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(token.token).then(() => setCopied(true)).catch(() => {});
                setTimeout(() => setCopied(false), 1600);
              }}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-sm px-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {copied ? <Check aria-hidden className="size-4 text-success" /> : <Copy aria-hidden className="size-4" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="break-all rounded-md bg-ink-panel p-2.5 font-mono text-xs text-ink-panel-text" data-testid="agent-key">
            {token.token}
          </code>
        </div>
      )}
    </section>
  );
}
