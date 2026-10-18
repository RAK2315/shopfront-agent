"use client";

import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, CircleAlert, CircleCheck, ShieldAlert, ShieldCheck } from "lucide-react";
import { hackReason } from "@/lib/hack-reason";
import { cn } from "@/lib/cn";

export type HackAttack = { id?: string; label: string; family?: string; blocked: boolean; answer: string };
export type HackResult = { product: string; serverPrice: string; shipping: string; attempts: HackAttack[]; checkoutsCreated: number };

const FAMILY: Record<string, string> = { price: "Price tampering", quantity: "Quantity tricks", ids: "Fake ids", tokens: "Stolen tokens", webhook: "Forged PayPal webhook", size: "Oversized request" };

function why(a: HackAttack) {
  const r = hackReason(a.answer);
  if (r.fields.length) return r.fieldFirst ? `${r.fields.join(", ")} ${r.text}` : `${r.text}: ${r.fields.join(", ")}`;
  if (/FORBIDDEN|token/i.test(a.answer)) return "the order token doesn't match";
  if (/NOT_FOUND|not found/i.test(a.answer)) return "no such listing";
  if (/signature/i.test(a.answer)) return a.answer;
  if (/max|too big|<=/i.test(a.answer)) return "over the limit";
  return r.text;
}

/** Phase 13 lite (walkthrough #5, D-091): the proof first (three numbers), then one chip per real attack. */
export function HackCard({ result }: { result: HackResult }) {
  const reduce = useReducedMotion();
  const { attempts } = result;
  const blocked = attempts.filter((a) => a.blocked).length;
  const safe = blocked === attempts.length && result.checkoutsCreated === 0;
  const families = [...new Set(attempts.map((a) => a.family ?? "price"))];
  return (
    <div className={cn("grid max-w-2xl gap-4 rounded-lg border p-4", safe ? "border-success/35 bg-success-soft/40" : "border-danger/35 bg-danger-soft/50")} data-testid="hack-result" data-blocked={blocked} data-total={attempts.length}>
      <p className="inline-flex items-center gap-2 text-base font-semibold text-ink">
        {safe ? <ShieldCheck aria-hidden className="size-5 text-success" /> : <ShieldAlert aria-hidden className="size-5 text-danger" />}
        {safe ? "Every attack was blocked by the server" : `${attempts.length - blocked} attack${attempts.length - blocked === 1 ? "" : "s"} got through`}
      </p>
      <dl className="grid grid-cols-3 gap-2" data-testid="hack-proof">
        <div className="grid gap-0.5 rounded-md bg-surface p-3">
          <dt className="text-xs text-ink-2">Attacks blocked</dt>
          <dd className={cn("font-display text-2xl font-semibold tabular", safe ? "text-success" : "text-danger")} data-testid="hack-blocked">
            {blocked}/{attempts.length}
          </dd>
        </div>
        <div className="grid gap-0.5 rounded-md bg-surface p-3">
          <dt className="text-xs text-ink-2">Price, unchanged</dt>
          <dd className="font-display text-2xl font-semibold tabular text-ink">${result.serverPrice}</dd>
        </div>
        <div className="grid gap-0.5 rounded-md bg-surface p-3">
          <dt className="text-xs text-ink-2">Checkouts created</dt>
          <dd className={cn("font-display text-2xl font-semibold tabular", result.checkoutsCreated ? "text-danger" : "text-ink")} data-testid="hack-checkouts">
            {result.checkoutsCreated}
          </dd>
        </div>
      </dl>
      <div className="grid gap-2.5">
        {families.map((f) => (
          <div key={f} className="grid gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-2">{FAMILY[f] ?? f}</p>
            <ul className="flex flex-wrap gap-1.5">
              {attempts
                .filter((a) => (a.family ?? "price") === f)
                .map((a, i) => (
                  <motion.li
                    key={a.label}
                    initial={reduce ? false : { backgroundColor: "oklch(0.955 0.03 27)", borderColor: "oklch(0.53 0.17 27 / 0.4)" }}
                    animate={a.blocked ? { backgroundColor: "oklch(1 0 0)", borderColor: "oklch(0.5 0.11 150 / 0.35)" } : { backgroundColor: "oklch(0.955 0.03 27)", borderColor: "oklch(0.53 0.17 27 / 0.6)" }}
                    transition={{ delay: reduce ? 0 : 0.12 + i * 0.09, duration: 0.35 }}
                    className="inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-sm text-ink"
                    title={`${a.blocked ? "Blocked" : "Accepted"} · ${why(a)}`}
                    data-testid="hack-chip"
                    data-blocked={a.blocked}
                  >
                    {a.blocked ? <CircleCheck aria-hidden className="size-3.5 text-success" /> : <CircleAlert aria-hidden className="size-3.5 text-danger" />}
                    {a.label}
                  </motion.li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <details className="group text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-medium text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight aria-hidden className="size-3.5 transition-transform group-open:rotate-90" /> What the server answered
        </summary>
        <ul className="mt-2 grid gap-1.5">
          {attempts.map((a) => (
            <li key={a.label} className="grid gap-0.5 rounded-md bg-surface px-3 py-2">
              <span className="font-medium text-ink">{a.label}</span>
              <span className="font-mono text-xs break-words text-ink-2">{why(a)}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="text-xs text-muted">
        Real requests to the public MCP endpoint and webhook, answered by the server. Real price of {result.product}: ${result.serverPrice} + ${result.shipping} shipping, from the seller&apos;s catalog. Next: the same trick as a prompt to the agent.
      </p>
    </div>
  );
}
