// The Cart API funnel on the AG Studio report (Phase AG): carts agents built → valid → approved by the buyer →
// authorized at checkout → captured on ship. Each stage is a subset of the one before.
export type FunnelCart = { cart: string; agent: string; status: string; validation: string; issue: string; order: string };
export type FunnelOrder = { order: string; captured_usd: number };

export function cartFunnel(carts: FunnelCart[], orders: FunnelOrder[]) {
  const captured = new Set(orders.filter((o) => o.captured_usd > 0).map((o) => o.order));
  const valid = carts.filter((c) => c.validation === "VALID");
  const approved = valid.filter((c) => c.status === "READY" || c.status === "COMPLETED");
  const authorized = approved.filter((c) => c.status === "COMPLETED");
  const paid = authorized.filter((c) => c.order && captured.has(c.order));
  const stages = [
    { id: "built", label: "Carts built by agents", n: carts.length },
    { id: "valid", label: "Valid (stock, price, address)", n: valid.length },
    { id: "approved", label: "Approved by the buyer", n: approved.length },
    { id: "authorized", label: "Authorized at checkout", n: authorized.length },
    { id: "captured", label: "Captured on ship", n: paid.length },
  ];
  const issues = new Map<string, number>();
  for (const c of carts) if (c.validation !== "VALID" && c.issue) issues.set(c.issue, (issues.get(c.issue) ?? 0) + 1);
  return { stages, issues: [...issues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4), agents: new Set(carts.map((c) => c.agent)).size };
}
