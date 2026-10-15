import { cn } from "@/lib/cn";

const formatters = new Map<string, Intl.NumberFormat>();
function fmt(currency: string) {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 });
    formatters.set(currency, f);
  }
  return f;
}

/** Renders integer cents. Money never passes through floats except for display formatting here. */
export function Money({
  cents,
  currency = "USD",
  showCode = false,
  className,
}: {
  cents: number;
  currency?: string;
  showCode?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("tabular whitespace-nowrap", className)}>
      {fmt(currency).format(cents / 100)}
      {showCode && <span className="ml-1 text-[0.85em] text-muted">{currency}</span>}
    </span>
  );
}
