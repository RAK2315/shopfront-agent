// Reconciliation with PayPal (D-095), run on the deployed server: every PayPal capture in the last 30 days against our
// orders. Prints the result and exits 1 on any mismatch or an incomplete run, so the regression suites fail on it.
// Usage: pnpm --filter web reconcile -- --base https://shopfront-agent.onrender.com
import { createHmac } from "node:crypto";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = (args.includes("--base") ? args[args.indexOf("--base") + 1]! : "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const admin = createHmac("sha256", process.env.SESSION_SECRET!).update("admin:demo-reset").digest("base64url");
const res = await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify({ action: "reconcile" }) });
const run = (await res.json()) as {
  ok: boolean;
  matched: number;
  mismatches: Array<{ label: string; detail: string; checkoutId?: string; captureId?: string; isTest?: boolean }>;
  explained: Array<{ captureId: string; reason: string }>;
  sources: Record<string, unknown>;
  error: string | null;
  durationMs: number;
};
if (!res.ok) {
  console.log(`FAIL reconcile: HTTP ${res.status} ${JSON.stringify(run).slice(0, 200)}`);
  process.exit(1);
}
const sources = { ...run.sources };
delete sources.matchedBySeller;
console.log(`reconcile: ${run.matched} matched, ${run.mismatches.length} mismatch(es), ${run.explained.length} explained, ${run.durationMs} ms ${JSON.stringify(sources)}`);
for (const m of run.mismatches) console.log(`  MISMATCH ${m.label}: ${m.detail} · order ${m.checkoutId ?? "-"} · capture ${m.captureId ?? "-"}${m.isTest ? " · test run" : ""}`);
for (const x of run.explained) console.log(`  explained ${x.captureId}: ${x.reason}`);
if (run.error) console.log(`  incomplete: ${run.error}`);
const pass = run.ok && run.mismatches.length === 0;
console.log(pass ? "PASS reconciled with PayPal" : "FAIL reconciliation");
process.exitCode = pass ? 0 : 1;
