import type { Metadata } from "next";
import { StudioSpikeClient } from "@/components/studio/studio-spike-client";
import { recentCheckouts } from "@/server/console";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AG Studio spike", robots: { index: false } };

// Phase 2 spike only (D-043). Not linked from the product; the Phase 5 dashboard replaces it.
export default async function StudioSpikePage() {
  const rows = (await recentCheckouts(50)).map((c) => ({
    checkout: c.id,
    status: c.status,
    total_usd: c.totalCents / 100,
    items: c.items,
    country: c.buyerCountry ?? "—",
    created: c.createdAt,
  }));
  return (
    <main style={{ height: "100dvh" }}>
      <StudioSpikeClient rows={rows} />
    </main>
  );
}
