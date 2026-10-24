"use client";

import { useMemo, useState } from "react";
import { ChevronRight, CircleAlert, CircleCheck, CircleDashed, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestId } from "@/components/ui/request-id";
import { cn } from "@/lib/cn";
import { AI_LABEL, ATTACKS, FAMILIES, type AttackResult, type GauntletSummary, type SideResult } from "@/lib/gauntlet";

export type StoredRun = { id: string; createdAt: string; results: AttackResult[]; summary: GauntletSummary } | null;

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};

function Side({ r, side }: { r?: SideResult<string>; side: "naive" | "guarded" }) {
  if (!r)
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-line px-3 py-2.5 text-sm text-muted">
        <CircleDashed aria-hidden className="size-4" /> Waiting
      </div>
    );
  const bad = r.outcome === "harmed" || r.outcome === "allowed";
  const good = r.outcome === "blocked" || r.outcome === "resisted";
  const pill = { harmed: "Harmed", resisted: "Model resisted", blocked: "Blocked", allowed: "Got through", error: "Didn't run" }[r.outcome] ?? r.outcome;
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5 rounded-md border px-3 py-2.5", bad ? "border-danger/30 bg-danger-soft/50" : good && side === "guarded" ? "border-success/30 bg-success-soft/40" : "border-line bg-surface")} data-outcome={r.outcome}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className={cn("inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold", bad ? "bg-danger text-white" : r.outcome === "blocked" ? "bg-success text-white" : "bg-surface-2 text-ink-2")}>
          {bad ? <CircleAlert aria-hidden className="size-3" /> : r.outcome === "blocked" ? <CircleCheck aria-hidden className="size-3" /> : null}
          {pill}
        </span>
        {r.memoryOnly && <span className="rounded-pill border border-line-strong px-2 py-0.5 text-[11px] text-ink-2">in memory · not sent</span>}
        {r.ai && <span className="text-[11px] text-muted">{AI_LABEL[r.ai.source] ?? r.ai.source}</span>}
      </p>
      <p className="text-sm text-ink">{r.summary}</p>
      {(r.paypal?.orderId || r.paypal?.refused || r.checkout) && (
        <div className="flex flex-wrap gap-1.5">
          {r.paypal?.orderId && <RequestId label="PayPal order" value={r.paypal.orderId} tone="paypal" />}
          {r.paypal?.refused && <RequestId label="PayPal said" value={r.paypal.refused} tone="paypal" max={28} />}
          {r.paypal?.debugId && <RequestId label="debug id" value={r.paypal.debugId} />}
          {r.checkout && <RequestId label="checkout" value={`${r.checkout.id} · $${r.checkout.total}`} max={30} />}
        </div>
      )}
      {r.detail && (
        <details className="group text-xs text-ink-2">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-ink [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-3 transition-transform group-open:rotate-90" /> Details
          </summary>
          <p className="mt-1 break-words font-mono">{r.detail}</p>
        </details>
      )}
    </div>
  );
}

export function GauntletBoard({ initial }: { initial: StoredRun }) {
  const [results, setResults] = useState<Record<string, AttackResult>>(() => Object.fromEntries((initial?.results ?? []).map((r) => [r.id, r])));
  const [summary, setSummary] = useState<GauntletSummary | null>(initial?.summary ?? null);
  const [runId, setRunId] = useState(initial?.id ?? "");
  const [at, setAt] = useState(initial?.createdAt ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = Object.keys(results).length;
  const live = useMemo(() => {
    const list = Object.values(results);
    return { blocked: list.filter((r) => r.guarded.outcome === "blocked").length, harmed: list.filter((r) => r.naive.outcome === "harmed").length, orders: list.filter((r) => r.naive.paypal?.orderId).length };
  }, [results]);
  const blocked = summary?.guardedBlocked ?? live.blocked;
  const harmed = summary?.naiveHarmed ?? live.harmed;
  const total = summary?.total ?? ATTACKS.length;

  const run = async () => {
    setRunning(true);
    setError(null);
    setResults({});
    setSummary(null);
    try {
      const res = await fetch("/api/gauntlet", { method: "POST" });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(j.error?.message ?? "The Gauntlet couldn't start.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done: end } = await reader.read();
        if (end) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as { type: string; runId?: string; result?: AttackResult; summary?: GauntletSummary; message?: string };
          if (ev.type === "start") {
            setRunId(ev.runId!);
            setAt(new Date().toISOString());
          }
          if (ev.type === "attack") setResults((m) => ({ ...m, [ev.result!.id]: ev.result! }));
          if (ev.type === "done") setSummary(ev.summary!);
          if (ev.type === "error") setError(ev.message ?? "The run stopped early.");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-8" data-testid="gauntlet-board" data-run={runId} data-done={done}>
      {/* The score: the same attacks, two shops. */}
      <section className="grid gap-4 md:grid-cols-2" aria-label="Score">
        <div className="grid content-start gap-2 rounded-lg border border-danger/30 bg-danger-soft/40 p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-danger">
            <ShieldAlert aria-hidden className="size-4" /> A naive shop
          </p>
          <p className="font-display text-5xl font-semibold tabular text-danger" data-testid="g-harmed">
            {harmed}/{total} <span className="text-2xl font-medium">harmed</span>
          </p>
          <p className="text-md text-ink-2">
            Its agent tools take a price. {summary ? (
              <>
                <span className="font-medium text-ink">{summary.naivePaypalOrders} real PayPal sandbox orders</span> created at the attacker&apos;s amount: {summary.naiveCharged} for goods worth {summary.naiveOwed}.
              </>
            ) : (
              `${live.orders} real PayPal sandbox orders so far.`
            )}
          </p>
        </div>
        <div className="grid content-start gap-2 rounded-lg border border-success/30 bg-success-soft/40 p-5">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <ShieldCheck aria-hidden className="size-4" /> Shopfront
          </p>
          <p className="font-display text-5xl font-semibold tabular text-success" data-testid="g-blocked">
            {blocked}/{total} <span className="text-2xl font-medium">blocked</span>
          </p>
          <p className="text-md text-ink-2">Ids and quantities in, the shop&apos;s price out ({summary?.shopPrice ?? "from the catalog"}). Store-bound keys, signed webhooks, a refund policy in code.</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={run} loading={running} disabled={running} data-testid="g-run">
          <Play aria-hidden className="size-4" /> {running ? `Attack ${Math.min(done + 1, total)} of ${total}…` : "Run the Gauntlet"}
        </Button>
        <p className="text-sm text-ink-2" role="status">
          {running ? "Real model calls and real PayPal sandbox requests: about two minutes." : at ? `Last run ${ago(at)}${summary?.product ? ` · target: ${summary.product}` : ""}.` : "Not run yet."}
        </p>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>

      {FAMILIES.map((f) => (
        <section key={f.id} aria-labelledby={`fam-${f.id}`} className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
            <h2 id={`fam-${f.id}`} className="text-lg font-semibold text-ink">
              {f.label}
            </h2>
            <p className="text-sm text-ink-2">{f.blurb}</p>
          </div>
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)] gap-3 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-2 lg:grid">
            <span>Attack</span>
            <span>Naive shop</span>
            <span>Shopfront</span>
          </div>
          <ul className="grid gap-3">
            {ATTACKS.filter((a) => a.family === f.id).map((a) => (
              <li key={a.id} className="grid gap-3 rounded-lg border border-line bg-surface p-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]" data-testid="g-row" data-attack={a.id}>
                <div className="flex min-w-0 gap-3">
                  {a.image && (
                    <a href={`/gauntlet/${a.image}`} target="_blank" rel="noreferrer" className="shrink-0" title="Open the attack image">
                      {/* eslint-disable-next-line @next/next/no-img-element -- static attack image */}
                      <img src={`/gauntlet/${a.image}`} alt={`Attack image: ${a.label}`} className="size-16 rounded-md border border-line object-cover" />
                    </a>
                  )}
                  <div className="grid min-w-0 content-start gap-1">
                    <p className="text-sm font-medium text-ink">{a.label}</p>
                    {a.prompt && <p className="text-xs text-ink-2">“{a.prompt}”</p>}
                  </div>
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2 lg:hidden">Naive shop</span>
                  <Side r={results[a.id]?.naive} side="naive" />
                </div>
                <div className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2 lg:hidden">Shopfront</span>
                  <Side r={results[a.id]?.guarded} side="guarded" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
