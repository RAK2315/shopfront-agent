"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Cpu, ShieldAlert, Sparkle, Trash2 } from "lucide-react";
import { lowConfidenceFields } from "@shopfront/core";
import type { DraftView } from "@/server/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfidenceField } from "@/components/ui/confidence-field";
import { cn } from "@/lib/cn";

const SOURCE: Record<string, string> = { gemini: "Read by Gemini", groq: "Read by Groq", cache: "From cache", replay: "Replayed" };

function dollars(cents: number) {
  return cents > 0 ? (cents / 100).toFixed(2) : "";
}
function toCents(v: string): number | null {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 1 ? Math.round(n * 100) : null;
}
function optionsLabel(o: Record<string, string>) {
  const e = Object.entries(o);
  return e.length ? e.map(([k, v]) => `${k}: ${v}`).join(" · ") : "One version";
}

/** One AI-drafted listing under review. Nothing publishes until every price is confirmed by the seller. */
export function DraftCard({
  draft,
  onPublished,
  onDiscarded,
}: {
  draft: DraftView;
  onPublished: (r: { product: DraftView; sync: { ok: boolean; catalogId?: string; debugId?: string } }) => void;
  onDiscarded: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const fc = draft.fieldConfidence;
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [category, setCategory] = useState(draft.category);
  const [attrs, setAttrs] = useState<Record<string, string>>(draft.attributes);
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(draft.variants.map((v) => [v.id, dollars(v.priceCents || draft.priceGuessCents || 0)])),
  );
  const [stock, setStock] = useState<Record<string, number>>(() => Object.fromEntries(draft.variants.map((v) => [v.id, v.stock])));
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"publish" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allConfirmed = draft.variants.every((v) => confirmed[v.id] && toCents(prices[v.id] ?? "") !== null);
  const toCheck = lowConfidenceFields(fc).length;

  const publish = async () => {
    setBusy("publish");
    setError(null);
    const r = await fetch(`/api/seller/products/${draft.productId}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category,
        attributes: attrs,
        variants: draft.variants.map((v) => ({ id: v.id, price_cents: toCents(prices[v.id] ?? "") ?? 0, stock: stock[v.id] ?? 0 })),
        price_confirmed: true,
      }),
    });
    const out = await r.json();
    setBusy(null);
    if (!r.ok) return setError(out.error?.message ?? "Could not publish.");
    onPublished(out);
  };

  const discard = async () => {
    setBusy("discard");
    const r = await fetch(`/api/seller/products/${draft.productId}`, { method: "DELETE" });
    setBusy(null);
    if (r.ok) onDiscarded(draft.productId);
  };

  return (
    <article
      aria-label={`Draft: ${draft.title}`}
      className="grid overflow-clip rounded-lg border border-line bg-surface md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      data-testid="draft-card"
    >
      <div className="relative bg-surface-2">
        {draft.image && (
          <motion.img
            layoutId={reduce ? undefined : `photo-${draft.image.sha256}`}
            src={draft.image.url}
            alt={draft.title}
            className="aspect-[4/5] size-full object-cover md:absolute md:inset-0 md:aspect-auto"
          />
        )}
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {draft.ai ? (
            <Badge tone="neutral" className="bg-surface/90 backdrop-blur-sm">
              <Cpu aria-hidden /> {SOURCE[draft.ai.source] ?? draft.ai.source} · {(draft.ai.ms / 1000).toFixed(1)} s
            </Badge>
          ) : (
            draft.reused && <Badge className="bg-surface/90">Already drafted from this photo</Badge>
          )}
        </div>
      </div>

      <div className="grid content-start gap-4 p-5">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="clay">
              <Sparkle aria-hidden /> Drafted from your photo
            </Badge>
            <span className={cn("text-sm font-medium", toCheck ? "text-warning" : "text-success")} data-testid="fields-to-check">
              {toCheck ? `${toCheck} field${toCheck === 1 ? "" : "s"} to check` : "Everything looks clear"}
            </span>
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="How to read this draft">
            <li className="inline-flex items-center gap-1">
              <span className="rounded-sm bg-clay-soft px-1 text-[10px] font-semibold text-clay-strong">AI</span> filled in from the photo
            </li>
            <li className="inline-flex items-center gap-1">
              <span className="size-2 rounded-pill bg-warning" aria-hidden /> unsure: check it
            </li>
            <li className="inline-flex items-center gap-1">
              <span className="size-2 rounded-pill bg-ink" aria-hidden /> only you set the price
            </li>
          </ul>
        </div>

        {draft.flags.length > 0 && (
          <p className="flex items-start gap-2 rounded-md border border-warning/35 bg-warning-soft px-3 py-2 text-sm text-ink" role="note" data-testid="injection-flag">
            <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              <span className="font-medium">Flagged:</span> {draft.flags[0]} Prices are set only by you.
            </span>
          </p>
        )}

        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">The basics</h3>
        <ConfidenceField label="Title" value={title} onChange={setTitle} confidence={fc.title ?? 0} />
        <ConfidenceField label="Description" value={description} onChange={setDescription} confidence={fc.description ?? 0} multiline />
        <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConfidenceField label="Category" value={category} onChange={setCategory} confidence={fc.category ?? 0} />
          {Object.entries(attrs).map(([k, v]) => (
            <ConfidenceField
              key={k}
              label={k[0]!.toUpperCase() + k.slice(1)}
              value={v}
              onChange={(nv) => setAttrs((a) => ({ ...a, [k]: nv }))}
              confidence={fc[`attr:${k}`] ?? 0.6}
            />
          ))}
        </div>

        <fieldset className={cn("grid gap-3 rounded-lg border-2 p-4 transition-colors", allConfirmed ? "border-success/40 bg-success-soft/40" : "border-ink/80 bg-surface")} data-testid="price-block">
          <legend className="px-1 text-sm font-semibold text-ink">Your price {allConfirmed ? "· confirmed" : "· you decide"}</legend>
          {draft.priceGuessCents ? (
            <p className="text-sm text-ink-2">
              The AI guessed <span className="font-medium tabular text-ink">${(draft.priceGuessCents / 100).toFixed(2)}</span> from the photo. It&apos;s only a starting point: agents always pay the price you confirm here.
            </p>
          ) : (
            <p className="text-sm text-ink-2">Agents always pay the price you confirm here; the AI never sets it.</p>
          )}
          {draft.variants.map((v) => (
            <div key={v.id} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_6rem]">
              <ConfidenceField
                label={draft.variants.length > 1 ? `Price · ${optionsLabel(v.options)}` : "Price"}
                kind="price"
                value={prices[v.id] ?? ""}
                onChange={(nv) => {
                  setPrices((p) => ({ ...p, [v.id]: nv }));
                  setConfirmed((c) => ({ ...c, [v.id]: false }));
                }}
                confidence={fc.price ?? 0}
                confirmed={Boolean(confirmed[v.id])}
                onConfirm={() => toCents(prices[v.id] ?? "") !== null && setConfirmed((c) => ({ ...c, [v.id]: true }))}
              />
              <label className="grid gap-1.5 text-sm font-medium">
                In stock
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={stock[v.id] ?? 0}
                  onChange={(e) => setStock((s) => ({ ...s, [v.id]: Math.max(0, Math.min(999, Number(e.target.value) || 0)) }))}
                  className="h-[2.4rem] rounded-md border border-line-strong bg-surface px-3 text-base tabular outline-none focus:border-clay"
                />
              </label>
            </div>
          ))}
        </fieldset>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="sticky bottom-0 z-[1] -mx-5 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur-sm md:static md:mx-0 md:mb-0 md:bg-transparent md:px-0 md:pt-4 md:pb-0 md:backdrop-blur-none">
          <Button variant="ghost" size="sm" onClick={discard} loading={busy === "discard"}>
            <Trash2 aria-hidden className="size-4" /> Discard
          </Button>
          <div className="flex items-center gap-3">
            <span className={cn("text-sm", allConfirmed ? "text-ink-2" : "text-muted")}>
              {allConfirmed ? "Publishes to your shop and PayPal's catalog" : "Confirm the price to publish"}
            </span>
            <Button onClick={publish} disabled={!allConfirmed} loading={busy === "publish"} data-testid="publish">
              Publish listing
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
