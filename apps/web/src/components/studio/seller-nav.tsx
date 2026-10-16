import Link from "next/link";
import { cn } from "@/lib/cn";

type Current = "studio" | "orders" | "dashboard";

/** One navigation for every seller surface, with the current page marked (studio, orders, dashboard). */
export function SellerNav({ handle, current, className }: { handle: string; current: Current; className?: string }) {
  const items: Array<{ key: Current | "storefront" | "live"; href: string; label: string }> = [
    { key: "studio", href: "/studio", label: "Listings" },
    { key: "orders", href: "/studio/orders", label: "Orders" },
    { key: "dashboard", href: "/studio/dashboard", label: "Dashboard" },
    { key: "storefront", href: `/s/${handle}`, label: "Storefront" },
    { key: "live", href: "/live", label: "Live wire" },
  ];
  return (
    <nav aria-label="Seller" className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium", className)}>
      {items.map((it) => {
        const active = it.key === current;
        return (
          <Link
            key={it.key}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-sm py-1 underline-offset-[6px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay",
              active ? "text-ink underline decoration-clay decoration-2" : "text-ink-2 hover:text-ink hover:underline",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
