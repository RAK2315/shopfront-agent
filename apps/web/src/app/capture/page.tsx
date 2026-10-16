import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Split screen", robots: { index: false } };

// Phase 8 capture surface (D-057, D-058): two real app routes side by side, 16:9 at 1920×1080 (two 960 px panes).
// The live wire starts empty so a take shows only its own events. Only these same-origin routes may be framed; `/pay` is excluded because its URL carries the order token.
const PANES: Record<string, { role: "Buyer" | "Seller"; caption: string }> = {
  "/shop": { role: "Buyer", caption: "A shopper's AI agent" },
  "/live": { role: "Seller", caption: "Live wire: every agent call, PayPal request and webhook" },
  "/studio": { role: "Seller", caption: "Studio: photos to listings" },
  "/studio/orders": { role: "Seller", caption: "Orders, shipping and refunds" },
  "/studio/dashboard": { role: "Seller", caption: "Dashboard on AG Studio" },
  "/s/juniper_clay": { role: "Buyer", caption: "The public storefront" },
};

function pane(value: string | string[] | undefined, fallback: string) {
  const path = typeof value === "string" ? value : fallback;
  return path in PANES ? path : fallback;
}

export default async function CapturePage({ searchParams }: PageProps<"/capture">) {
  const sp = await searchParams;
  const panes = [pane(sp.left, "/shop"), pane(sp.right, "/live")];
  return (
    <main className="grid h-dvh grid-cols-[minmax(0,1fr)] grid-rows-2 bg-canvas md:grid-cols-2 md:grid-rows-1">
      {panes.map((path, i) => {
        const { role, caption } = PANES[path]!;
        return (
          <section key={i} className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] border-line first:border-b md:first:border-r md:first:border-b-0">
            <header className="flex items-center gap-2.5 border-b border-line bg-surface-2 px-4 py-2">
              <Badge>{role}</Badge>
              <h2 className="min-w-0 truncate text-sm font-medium text-ink-2">{caption}</h2>
            </header>
            <iframe src={path === "/live" ? "/live?from=now" : path} title={`${role}: ${caption}`} className="size-full border-0 bg-canvas" />
          </section>
        );
      })}
    </main>
  );
}
