"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const STORES = [
  { handle: "juniper_clay", label: "Juniper Clay · paid to the platform account" },
  { handle: "fern_and_loom", label: "Fern & Loom · paid straight to the seller's PayPal" },
] as const;

type Issued = { token: string; expires_at: string; base_url: string; store: string };

function CopyBlock({ label, text, testId }: { label: string; text: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* clipboard blocked: the text is selectable */
            }
          }}
          className="inline-flex min-h-8 items-center gap-1 rounded-sm px-2 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {copied ? <Check aria-hidden className="size-3.5 text-success" /> : <Copy aria-hidden className="size-3.5" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-ink-panel p-3 font-mono text-xs leading-relaxed text-ink-panel-text" data-testid={testId}>
        {text}
      </pre>
    </div>
  );
}

/** A one-hour, store-bound Cart API token for a demo shop, with ready-to-run curl commands (D-097). */
export function DemoToken({ variantId }: { variantId: Record<string, string> }) {
  const [store, setStore] = useState<string>(STORES[0].handle);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [error, setError] = useState<string | null>(null);
  const get = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/cart-token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ store }) });
      if (!r.ok) throw new Error(r.status === 429 ? "Too many tokens this minute. Try again shortly." : "Couldn't issue a token.");
      setIssued((await r.json()) as Issued);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't issue a token.");
    } finally {
      setBusy(false);
    }
  };
  const v = issued ? variantId[issued.store] : undefined;
  const create = issued
    ? `curl -X POST ${issued.base_url}/merchant-cart \\\n  -H "Authorization: Bearer ${issued.token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"items":[{"variant_id":"${v}","quantity":1}],"payment_method":{"type":"paypal"}}'`
    : "";
  const put = issued
    ? `curl -X PUT ${issued.base_url}/merchant-cart/<cart id> \\\n  -H "Authorization: Bearer ${issued.token}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"items":[{"variant_id":"${v}","quantity":1}],"shipping_address":{"address_line_1":"2211 N First St","admin_area_2":"San Jose","admin_area_1":"CA","postal_code":"95131","country_code":"US"},"payment_method":{"type":"paypal"}}'`
    : "";
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5" data-testid="demo-token">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium text-ink">
          Demo shop
          <select value={store} onChange={(e) => setStore(e.target.value)} className="h-11 min-w-0 rounded-md border border-line-strong bg-surface px-3 text-base font-normal">
            {STORES.map((s) => (
              <option key={s.handle} value={s.handle}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <Button size="lg" onClick={get} disabled={busy} data-testid="get-token">
          {busy ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <KeyRound aria-hidden className="size-4" />} Get a 1-hour token
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {issued && (
        <div className={cn("grid gap-4")}>
          <p className="text-sm text-ink-2">
            Bound to <span className="font-medium text-ink">{issued.store}</span> until {new Date(issued.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. It works for this store only.
          </p>
          <CopyBlock label="1 · Create a cart (no address yet: the shop says what's missing)" text={create} testId="curl-create" />
          <CopyBlock label="2 · Replace it with an address: the reply carries PayPal's approval_url" text={put} />
          <p className="text-sm text-ink-2">Open the approval_url, approve with the sandbox test buyer, then POST /merchant-cart/&lt;cart id&gt;/checkout with the token and PayerID PayPal returns. Nothing is charged until the shop ships.</p>
        </div>
      )}
    </div>
  );
}
