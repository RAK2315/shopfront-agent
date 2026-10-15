"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, CircleCheck, ImagePlus, LoaderCircle, TriangleAlert } from "lucide-react";
import type { DraftView } from "@/server/catalog";
import { DraftCard } from "@/components/studio/draft-card";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";

interface Pending {
  key: string;
  preview: string;
  sha256?: string;
  state: "uploading" | "reading" | "failed" | "ai_unavailable";
  message?: string;
  startedAt: number;
}

interface Toast {
  id: number;
  title: string;
  catalogId?: string;
  ok: boolean;
}

export function Studio({
  seller,
  initialDrafts,
  initialLive,
  mcpUrl,
}: {
  seller: { handle: string; displayName: string };
  initialDrafts: DraftView[];
  initialLive: DraftView[];
  mcpUrl: string;
}) {
  const reduce = useReducedMotion();
  const [drafts, setDrafts] = useState(initialDrafts);
  const [live, setLive] = useState(initialLive);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [now, setNow] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pending.some((p) => p.state === "uploading" || p.state === "reading")) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [pending]);

  const patch = (key: string, p: Partial<Pending>) => setPending((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const readPhoto = useCallback(async (key: string, sha256: string, manual = false) => {
    patch(key, { state: "reading", startedAt: Date.now(), message: undefined });
    const r = await fetch("/api/seller/drafts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sha256, manual }) });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return patch(key, { state: out.error?.code === "AI_UNAVAILABLE" ? "ai_unavailable" : "failed", message: out.error?.message ?? "Could not read this photo." });
    const d = out.draft as DraftView;
    setPending((all) => all.filter((x) => x.key !== key));
    if (d.status === "approved") return;
    setDrafts((all) => [d, ...all.filter((x) => x.productId !== d.productId)]);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name)).slice(0, 12);
      if (!imgs.length) return;
      const batch: Pending[] = imgs.map((f, i) => ({ key: `${Date.now()}-${i}`, preview: URL.createObjectURL(f), state: "uploading", startedAt: Date.now() }));
      setPending((all) => [...batch, ...all]);
      const form = new FormData();
      for (const f of imgs) form.append("photos", f);
      const r = await fetch("/api/seller/photos", { method: "POST", body: form });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) {
        for (const b of batch) patch(b.key, { state: "failed", message: out.error?.message ?? "Upload failed." });
        return;
      }
      const photos = out.photos as Array<{ sha256?: string; error?: string }>;
      // All photos are read in parallel: the vision call is the slow part (~10 s each on the free tier).
      await Promise.all(
        photos.map((p, i) => {
          const b = batch[i]!;
          if (!p.sha256) return patch(b.key, { state: "failed", message: p.error });
          patch(b.key, { sha256: p.sha256 });
          return readPhoto(b.key, p.sha256);
        }),
      );
    },
    [readPhoto],
  );

  const toast = (t: Omit<Toast, "id">) => {
    const id = Date.now();
    setToasts((all) => [...all, { ...t, id }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 6000);
  };

  return (
    <LayoutGroup>
      <div className="grid gap-10">
        <section
          aria-label="Add product photos"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles([...e.dataTransfer.files]);
          }}
          className={cn(
            "grid place-items-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors duration-200",
            dragging ? "border-clay bg-clay-soft" : "border-line-strong bg-surface",
          )}
        >
          <ImagePlus aria-hidden className={cn("size-8", dragging ? "text-clay" : "text-ink-2")} />
          <div className="grid gap-1">
            <p className="font-display text-xl font-medium">Drop photos of your pieces</p>
            <p className="prose-width text-base text-ink-2">
              Shopfront drafts a listing from each photo. You check the details and confirm every price; nothing goes live on an AI guess.
            </p>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            data-testid="photo-input"
            onChange={(e) => {
              void addFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => input.current?.click()}>
            Choose photos
          </Button>
          <p className="text-xs text-muted">Up to 12 at a time · JPEG, PNG, WebP or HEIC</p>
        </section>

        {(pending.length > 0 || drafts.length > 0) && (
          <section aria-labelledby="review-h" className="grid gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="review-h" className="font-display text-2xl font-medium">
                To review
              </h2>
              <span className="text-sm text-muted tabular">
                {drafts.length} draft{drafts.length === 1 ? "" : "s"}
                {pending.length ? ` · ${pending.length} reading` : ""}
              </span>
            </div>
            <div className="grid gap-5">
              <AnimatePresence initial={false} mode="popLayout">
                {pending.map((p) => (
                  <motion.div
                    key={p.key}
                    layout={!reduce}
                    initial={{ opacity: 0, y: reduce ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                    data-testid="pending-card"
                  >
                    <div className="relative bg-surface-2">
                      <motion.img
                        layoutId={reduce || !p.sha256 ? undefined : `photo-${p.sha256}`}
                        src={p.preview}
                        alt=""
                        className="aspect-[4/5] size-full object-cover md:aspect-[4/3]"
                      />
                      {(p.state === "uploading" || p.state === "reading") && (
                        <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-transparent via-surface/30 to-transparent motion-reduce:animate-none" />
                      )}
                    </div>
                    <div className="grid content-center gap-3 p-6" role="status">
                      {p.state === "uploading" || p.state === "reading" ? (
                        <>
                          <p className="inline-flex items-center gap-2 text-md font-medium">
                            <LoaderCircle aria-hidden className="size-4 animate-spin text-clay" />
                            {p.state === "uploading" ? "Uploading…" : "Reading the photo…"}
                          </p>
                          <p className="text-sm text-ink-2 tabular">
                            {p.state === "reading" ? "Title, description, materials and a price guess" : "Resizing and fingerprinting"}
                            {now > 0 && ` · ${Math.max(0, (now - p.startedAt) / 1000).toFixed(1)} s`}
                          </p>
                          <div className="grid gap-2" aria-hidden>
                            {[80, 100, 60].map((w) => (
                              <span key={w} className="h-2.5 animate-pulse rounded-pill bg-surface-2 motion-reduce:animate-none" style={{ width: `${w}%` }} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="inline-flex items-center gap-2 text-md font-medium text-ink">
                            <TriangleAlert aria-hidden className="size-4 text-warning" /> {p.message}
                          </p>
                          <div className="flex gap-2">
                            {p.sha256 && (
                              <Button size="sm" variant="secondary" onClick={() => void readPhoto(p.key, p.sha256!, p.state === "ai_unavailable")}>
                                {p.state === "ai_unavailable" ? "Enter details yourself" : "Try again"}
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setPending((all) => all.filter((x) => x.key !== p.key))}>
                              Dismiss
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
                {drafts.map((d) => (
                  <motion.div key={d.productId} layout={!reduce} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}>
                    <DraftCard
                      draft={d}
                      onDiscarded={(id) => setDrafts((all) => all.filter((x) => x.productId !== id))}
                      onPublished={({ product, sync }) => {
                        setDrafts((all) => all.filter((x) => x.productId !== product.productId));
                        setLive((all) => [product, ...all.filter((x) => x.productId !== product.productId)]);
                        toast(sync.ok ? { title: `“${product.title}” is live and mirrored to PayPal`, catalogId: sync.catalogId, ok: true } : { title: `“${product.title}” is live; PayPal catalog sync failed`, ok: false });
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        <section aria-labelledby="live-h" className="grid gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="live-h" className="font-display text-2xl font-medium">
              Live in your shop
            </h2>
            <a href={`/s/${seller.handle}`} className="inline-flex items-center gap-1 text-base font-medium text-clay-strong underline-offset-4 hover:underline">
              View storefront <ArrowUpRight aria-hidden className="size-4" />
            </a>
          </div>
          {live.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-5 py-6 text-base text-ink-2">Nothing published yet. Your first approved listing appears here.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((p) => {
                const min = Math.min(...p.variants.map((v) => v.priceCents));
                return (
                  <li key={p.productId} className="overflow-hidden rounded-lg border border-line bg-surface" data-testid="live-card">
                    {p.image ? (
                      <motion.img layoutId={reduce ? undefined : `photo-${p.image.sha256}`} src={p.image.url} alt={p.title} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="aspect-[4/3] bg-surface-2" aria-hidden />
                    )}
                    <div className="grid gap-2 p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <a href={`/s/${seller.handle}/${p.productId}`} className="font-display text-lg font-medium hover:underline">
                          {p.title}
                        </a>
                        <Money cents={min} className="text-base font-medium" />
                      </div>
                      {p.paypalCatalogId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CircleCheck aria-hidden className="size-3.5" /> In PayPal catalog
                          </span>
                          <RequestId label="Catalog" value={p.paypalCatalogId} tone="paypal" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Not mirrored to PayPal yet</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-sm text-ink-2">
            Any AI shopping agent can buy these through one MCP endpoint: <RequestId label="MCP" value={mcpUrl} max={44} />
          </p>
        </section>
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[var(--z-toast)] grid justify-items-end gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-auto grid max-w-sm gap-2 rounded-md border border-line bg-surface px-4 py-3 shadow-[var(--shadow-float)]"
              role="status"
            >
              <p className="inline-flex items-start gap-2 text-base font-medium">
                {t.ok ? <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />}
                {t.title}
              </p>
              {t.catalogId && <RequestId label="PayPal catalog" value={t.catalogId} tone="paypal" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}
