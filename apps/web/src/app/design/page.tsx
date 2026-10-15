import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Ruler, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { RequestId } from "@/components/ui/request-id";
import { StatusPill } from "@/components/ui/status-pill";
import { ReviewDemo } from "@/components/design/review-demo";
import { ConsoleDemo } from "@/components/design/console-demo";

export const metadata: Metadata = { title: "Design system" };

const SWATCHES: Array<{ name: string; token: string; value: string; role: string; dark?: boolean }> = [
  { name: "Canvas", token: "canvas", value: "oklch(0.985 0 0)", role: "Page background" },
  { name: "Surface", token: "surface", value: "oklch(1 0 0)", role: "Raised content" },
  { name: "Surface 2", token: "surface-2", value: "oklch(0.962 0.006 45)", role: "Toolbars, grid headers" },
  { name: "Ink", token: "ink", value: "oklch(0.22 0.012 45)", role: "Primary text", dark: true },
  { name: "Ink 2", token: "ink-2", value: "oklch(0.42 0.012 45)", role: "Secondary text", dark: true },
  { name: "Clay", token: "clay", value: "oklch(0.56 0.14 40)", role: "The one accent", dark: true },
  { name: "Success", token: "success", value: "oklch(0.5 0.11 150)", role: "Paid, verified", dark: true },
  { name: "Warning", token: "warning", value: "oklch(0.5 0.11 70)", role: "Low AI confidence", dark: true },
  { name: "Danger", token: "danger", value: "oklch(0.53 0.17 27)", role: "Declined, conflict", dark: true },
  { name: "PayPal", token: "paypal", value: "oklch(0.33 0.13 262)", role: "PayPal elements only", dark: true },
  { name: "Ink panel", token: "ink-panel", value: "oklch(0.19 0.01 45)", role: "Live timeline", dark: true },
];

const LEDGER = [
  { group: "Speckled stoneware cup", rows: [
    { id: "chk_k3j9x0a1b2c3", buyer: "US · R. Okafor", qty: 1, cents: 3900, status: "shipped" as const, order: "5O190127TN364715T", ai: { text: "Gift, ship fast", conf: 0.91 } },
    { id: "chk_p8w2m4n6q1r5", buyer: "GB · A. Lindqvist", qty: 2, cents: 7300, status: "paid" as const, order: "8XK21655RH993022C", ai: { text: "Wrong size?", conf: 0.54 } },
  ] },
  { group: "Ash-glaze serving bowl", rows: [
    { id: "chk_t5v7b9c2d4e6", buyer: "US · M. Reyes", qty: 1, cents: 9500, status: "partially_refunded" as const, order: "2GG27985PD455861L", ai: { text: "Chipped rim", conf: 0.88 } },
  ] },
];

export default function DesignPage() {
  return (
    <main className="mx-auto grid max-w-[76rem] grid-cols-[minmax(0,1fr)] gap-20 px-5 pt-10 pb-24 sm:px-8">
      <header className="grid gap-5">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
          Shopfront
        </Link>
        <h1 className="max-w-[18ch] font-display text-display font-medium tracking-[-0.02em]">
          One system for the shop counter and the control room.
        </h1>
        <p className="prose-width text-md text-ink-2">
          Seller-facing pages feel like craft retail: photo-led, warm serif headings. The dashboard, timeline and
          agent split screen feel like a live operations console: dense, precise, visibly working. They share one
          palette, one type scale and one radius set. Blue appears only on real PayPal elements.
        </p>
      </header>

      {/* ------------------------------------------------------------------ craft retail */}
      <section aria-labelledby="storefront" className="grid grid-cols-[minmax(0,1fr)] gap-8">
        <div className="grid gap-1">
          <h2 id="storefront" className="font-display text-2xl font-medium">Storefront and onboarding</h2>
          <p className="text-base text-ink-2">Craft retail. The product photo leads; the interface recedes.</p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <article className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] sm:items-end">
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-2">
              <Image
                src="https://images.unsplash.com/photo-1536936812504-0e77dc3f0b40?auto=format&fit=crop&w=1200&q=80"
                alt="Hand-thrown stoneware cups on a pale wooden shelf: a speckled cream cup with a raw clay foot beside a cup painted with soft triangles"
                fill
                sizes="(min-width: 1024px) 34vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
            <div className="grid gap-4 pb-2">
              <p className="text-sm text-ink-2">Juniper Clay Studio</p>
              <h3 className="font-display text-[2rem] leading-tight font-medium">Speckled stoneware cup</h3>
              <p className="text-md text-ink-2">
                Wheel-thrown, raw clay foot, food-safe satin glaze. Each one is a little different. Holds about 10 oz.
              </p>
              <div className="flex items-baseline gap-3">
                <Money cents={3400} className="text-xl font-medium" />
                <span className="text-sm text-muted">+ <Money cents={500} /> shipping</span>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Glaze">
                {["Oat speckle", "Sea glass", "Clay"].map((g, i) => (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={i === 0}
                    className="rounded-pill border border-line-strong px-3 py-1.5 text-sm text-ink transition-colors hover:border-ink-2/50 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-canvas"
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="text-sm text-ink-2">Buyable by AI shopping agents through Shopfront. You approve every payment in PayPal.</p>
            </div>
          </article>
          <ReviewDemo />
        </div>
      </section>

      {/* ------------------------------------------------------------------ live ops console */}
      <section aria-labelledby="console" className="grid grid-cols-[minmax(0,1fr)] gap-8">
        <div className="grid gap-1">
          <h2 id="console" className="font-display text-2xl font-medium">Console</h2>
          <p className="text-base text-ink-2">
            Live operations. Every step shows who acted, the real request IDs, and where the AI answer came from.
            Sample data.
          </p>
        </div>
        <ConsoleDemo />
      </section>

      {/* ------------------------------------------------------------------ ledger density */}
      <section aria-labelledby="ledger" className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <div className="grid gap-1">
          <h2 id="ledger" className="font-display text-2xl font-medium">Ledger density</h2>
          <p className="text-base text-ink-2">
            Precision inside the console look. The AG Grid ledger (Phase 5) gets these tokens through its theme API.
          </p>
        </div>
        <div className="relative overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[52rem] border-collapse text-base [&_td]:whitespace-nowrap">
            <thead className="bg-surface-2 text-left text-xs text-ink-2">
              <tr className="[&>th]:h-8 [&>th]:border-b [&>th]:border-line [&>th]:px-3 [&>th]:font-medium">
                <th>Checkout</th>
                <th>Buyer</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>PayPal order</th>
                <th>AI note</th>
              </tr>
            </thead>
            <tbody>
              {LEDGER.map((g) => (
                <GroupRows key={g.group} group={g} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ tokens */}
      <section aria-labelledby="tokens" className="grid gap-10">
        <h2 id="tokens" className="font-display text-2xl font-medium">Tokens</h2>

        <div className="grid gap-3">
          <h3 className="text-sm font-medium text-ink-2">Colour</h3>
          <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr))]">
            {SWATCHES.map((s) => (
              <li key={s.token} className="overflow-hidden rounded-md border border-line bg-surface">
                <div className="h-16 border-b border-line" style={{ background: `var(--color-${s.token})` }} />
                <div className="grid gap-0.5 p-2.5">
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="font-mono text-xs text-ink-2">{s.value}</span>
                  <span className="text-xs text-muted">{s.role}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3">
          <h3 className="text-sm font-medium text-ink-2">Type</h3>
          <div className="grid gap-4 rounded-lg border border-line bg-surface p-5">
            <p className="font-display text-display font-medium tracking-[-0.02em]">Alegreya for storefront voice</p>
            <p className="text-2xl font-semibold tracking-tight">Geist 2xl · page titles in the console</p>
            <p className="text-lg font-medium">Geist lg · panel headings</p>
            <p className="text-base">Geist base 14px · the UI default, with tabular figures: <span className="tabular">$1,234.50 · 98.6%</span></p>
            <p className="text-sm text-ink-2">Geist sm · secondary labels and helper text</p>
            <p className="font-mono text-sm">Geist Mono · 5O190127TN364715T · PayPal-Request-Id</p>
          </div>
        </div>

        <div className="grid gap-3">
          <h3 className="text-sm font-medium text-ink-2">Actions and labels</h3>
          <div className="grid gap-5 rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Approve listing</Button>
              <Button variant="secondary">Edit</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger">Reject refund</Button>
              <Button loading>Capturing</Button>
              <Button disabled>Disabled</Button>
              <Button variant="paypal">PayPal only</Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="clay">Agent</Badge>
              <Badge tone="success">Verified</Badge>
              <Badge tone="warning">
                <TriangleAlert aria-hidden />
                Check this
              </Badge>
              <Badge tone="danger">Conflict</Badge>
              <Badge tone="paypal">PayPal</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["created", "approved", "capture_pending", "paid", "shipped", "partially_refunded", "refunded", "capture_denied", "reversed", "cancelled"] as const).map((s) => (
                <StatusPill key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RequestId label="Order" value="5O190127TN364715T" tone="paypal" />
              <RequestId label="Request-Id" value="capture-chk_k3j9x0a1b2c3" />
              <RequestId label="Checkout" value="chk_k3j9x0a1b2c3" />
            </div>
            <p className="inline-flex items-center gap-2 text-sm text-muted">
              <Ruler aria-hidden className="size-4" />
              Radius 6 / 10 / 16 / pill · motion 150 / 220 / 420 ms, ease-out-quart and expo · reduced motion respected
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function GroupRows({ group }: { group: (typeof LEDGER)[number] }) {
  const total = group.rows.reduce((s, r) => s + r.cents, 0);
  return (
    <>
      <tr className="bg-surface-2/60">
        <th colSpan={3} scope="rowgroup" className="h-8 border-b border-line px-3 text-left text-sm font-medium">
          {group.group} <span className="font-normal text-muted">· {group.rows.length} orders</span>
        </th>
        <td className="h-8 border-b border-line px-3 text-right text-sm font-medium">
          <Money cents={total} />
        </td>
        <td colSpan={3} className="border-b border-line" />
      </tr>
      {group.rows.map((r) => {
        const low = r.ai.conf < 0.75;
        return (
          <tr key={r.id} className="transition-colors hover:bg-clay-soft/50 [&>td]:h-9 [&>td]:border-b [&>td]:border-line [&>td]:px-3">
            <td className="font-mono text-sm">{r.id}</td>
            <td>{r.buyer}</td>
            <td className="text-right tabular">{r.qty}</td>
            <td className="text-right">
              <Money cents={r.cents} />
            </td>
            <td>
              <StatusPill status={r.status} />
            </td>
            <td>
              <RequestId label="Order" value={r.order} tone="paypal" max={14} />
            </td>
            <td className={low ? "bg-warning-soft/70" : undefined}>
              <span className="inline-flex items-center gap-1.5">
                {low && <TriangleAlert aria-label="Low confidence" className="size-3.5 text-warning" />}
                <span className={low ? "text-ink" : "text-ink-2"}>{r.ai.text}</span>
                <span className="text-xs text-muted tabular">{Math.round(r.ai.conf * 100)}%</span>
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
