"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

export const REPO_URL = "https://github.com/RAK2315/shopfront-agent";

const LINKS = [
  { href: "/shop", label: "Try the buyer demo" },
  { href: "/live", label: "Live wire" },
  { href: "/studio", label: "Sell with Shopfront" },
  { href: "/llms.txt", label: "Developers" },
  { href: REPO_URL, label: "Docs", external: true },
] as const;

/** The site's top bar (walkthrough #6, #11): wordmark, the four places a judge goes, and a sheet menu on phones. */
export function SiteNav({ className, tone = "plain" }: { className?: string; tone?: "plain" | "bar" }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <nav aria-label="Site" className={cn("relative flex items-center justify-between gap-4", tone === "bar" && "border-b border-line bg-surface px-4 py-2.5 sm:px-6", className)}>
      <Link href="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink" onClick={() => setOpen(false)}>
        <span aria-hidden className="grid size-7 place-items-center rounded-md bg-ink font-display text-base text-canvas">S</span>
        Shopfront
      </Link>
      <ul className="hidden items-center gap-1 md:flex">
        {LINKS.map((l) => {
          const active = !("external" in l) && path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                {...("external" in l ? { target: "_blank", rel: "noopener" } : {})}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink", active && "text-ink underline decoration-clay decoration-2 underline-offset-[6px]")}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <button type="button" className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-2 md:hidden" aria-expanded={open} aria-controls="site-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} data-testid="site-menu-button">
        {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
      </button>
      {open && (
        <ul id="site-menu" className="absolute inset-x-0 top-full z-40 mt-2 grid gap-1 rounded-lg border border-line bg-surface p-2 shadow-float md:hidden">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} {...("external" in l ? { target: "_blank", rel: "noopener" } : {})} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-md px-3 text-base font-medium text-ink hover:bg-surface-2">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
