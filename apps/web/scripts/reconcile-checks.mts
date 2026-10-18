// Reconciliation with PayPal (D-095) on the DEPLOYED app, real PayPal sandbox:
//   R1  a reconciliation run compares PayPal's captures with our orders; mismatches = --expect (0 in the regression)
//   R2  the seller dashboard badge shows the same state ("Reconciled with PayPal ✓" / "N mismatches"), opens to the
//       ids, and fits desktop, 1920×1080 and mobile
// With --refund (once, OWNER-TODO #5): the D-094 stray captures are refunded through the app's refund code, then
//   R3  each order ends "refunded", its capture REFUNDED at PayPal (GET), the refund request executed, the note set
//   R4  a second refund call is a no-op (no second PayPal refund)
//   R5  the next run is clean and the badge turns ✓
// Usage: pnpm --filter web reconcile-checks -- --base https://shopfront-agent.onrender.com [--expect 0] [--refund]
import { createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";
import pg from "pg";

const args = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string, d?: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const base = (arg("--base") ?? "").replace(/\/$/, "");
const out = resolve(arg("--out", "../../docs/screenshots/reconcile")!);
const expect = Number(arg("--expect", "0"));
const refund = args.includes("--refund");
const e = process.env as Record<string, string>;
if (!base.startsWith("http")) throw new Error("Pass --base https://<deployed app>");
mkdirSync(out, { recursive: true });
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const results: Array<{ id: string; ok: boolean; detail: unknown }> = [];
const record = (id: string, ok: boolean, detail: unknown) => {
  results.push({ id, ok, detail });
  log(ok ? "PASS" : "FAIL", id, JSON.stringify(detail));
};

const STRAYS = ["chk_sewtsaj30hts", "chk_0prkr6zvb6y8"];
const NOTE = "Captured after cancel → refunded. Incident D-094 (2026-10-18): a failing restock step cancelled this paid test order after PayPal captured it; refunded in the sandbox through the app's refund code (D-095).";
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
async function adminCall<T>(body: Record<string, unknown>): Promise<{ status: number; json: T }> {
  const r = await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: (await r.json()) as T };
}
type Run = { ok: boolean; matched: number; mismatches: Array<{ checkoutId?: string; captureId?: string; label: string }>; explained: unknown[]; error: string | null };

async function paypalCapture(id: string) {
  const tok = (await (
    await fetch(`${e.PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: "POST",
      headers: { authorization: "Basic " + Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    })
  ).json()) as { access_token: string };
  return (await (await fetch(`${e.PAYPAL_BASE_URL}/v2/payments/captures/${id}`, { headers: { authorization: `Bearer ${tok.access_token}` } })).json()) as { status: string };
}

async function sellerContext(b: Browser) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.goto(`${base}/studio`, { waitUntil: "load", timeout: 180_000 });
  const cont = p.getByRole("button", { name: /^continue as/i });
  if (await cont.isVisible().catch(() => false)) {
    await cont.click();
    await p.waitForTimeout(2500);
  }
  await p.close();
  return ctx;
}

async function badgeCheck(id: string, ctx: BrowserContext, want: number, tag: string) {
  const sizes = [
    { s: "desktop", width: 1440, height: 900 },
    { s: "1920", width: 1920, height: 1080 },
    { s: "mobile", width: 390, height: 844 },
  ];
  const seen: Record<string, unknown> = {};
  let ok = true;
  for (const z of sizes) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: z.width, height: z.height });
    await p.goto(`${base}/studio/dashboard`, { waitUntil: "load", timeout: 120_000 });
    const badge = p.getByTestId("reconcile-badge");
    await badge.waitFor({ timeout: 30_000 });
    const state = await badge.getAttribute("data-state");
    const n = Number(await badge.getAttribute("data-mismatches"));
    const text = (await badge.locator("summary").innerText()).trim();
    await badge.locator("summary").click();
    const panel = p.getByTestId("reconcile-details");
    await panel.waitFor();
    const rows = await p.getByTestId("reconcile-mismatch").count();
    const box = await panel.boundingBox();
    const fits = !!box && box.x >= 0 && box.x + box.width <= z.width + 1;
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: join(out, `${tag}-${z.s}.png`), fullPage: false });
    const good = (want === 0 ? state === "ok" && /reconciled with paypal/i.test(text) : state === "mismatch" && n === want && rows === want) && fits && overflow <= 0;
    ok &&= good;
    seen[z.s] = { state, n, text, rows, fits, overflow };
    await p.close();
  }
  record(id, ok, seen);
}

const browser = await chromium.launch(e.AT_HEADLESS === "1" ? { headless: true } : {});
const db = new pg.Client({ connectionString: e.DATABASE_URL });
await db.connect();
try {
  const r1 = await adminCall<Run>({ action: "reconcile" });
  record("R1 reconciliation run against PayPal", r1.status === 200 && r1.json.ok && r1.json.mismatches.length === expect, {
    matched: r1.json.matched,
    mismatches: r1.json.mismatches.map((m) => `${m.label}: ${m.checkoutId ?? "-"} / ${m.captureId ?? "-"}`),
    explained: r1.json.explained.length,
    error: r1.json.error,
    expect,
  });
  const ctx = await sellerContext(browser);
  await badgeCheck("R2 dashboard badge matches the run", ctx, r1.json.mismatches.length, expect ? "badge-mismatch" : "badge-ok");

  if (refund) {
    const outs = [];
    for (const id of STRAYS) outs.push((await adminCall<{ status: string; refund: { status: string; paypalRefundId: string | null }; already: boolean; error?: unknown }>({ action: "refund_stray", checkout_id: id, note: NOTE })).json);
    const rows = (
      await db.query(
        `select k.id, k.status, k.internal_note, cp.paypal_capture_id, cp.status cs, cp.refunded_cents, cp.amount_cents, r.status rs, r.paypal_refund_id
         from checkouts k join captures cp on cp.checkout_id = k.id left join refund_requests r on r.checkout_id = k.id and r.source = 'reconciliation'
         where k.id = any($1)`,
        [STRAYS],
      )
    ).rows;
    const atPayPal = await Promise.all(rows.map((r) => paypalCapture(r.paypal_capture_id).then((c) => c.status)));
    record(
      "R3 stray captures refunded through the app's refund code",
      rows.length === 2 && rows.every((r, i) => r.status === "refunded" && r.cs === "REFUNDED" && r.refunded_cents === r.amount_cents && r.rs === "executed" && r.paypal_refund_id && r.internal_note === NOTE && atPayPal[i] === "REFUNDED"),
      { calls: outs.map((o) => ({ status: o.status, refund: o.refund?.status, already: o.already, error: o.error })), db: rows.map((r) => ({ id: r.id, status: r.status, capture: `${r.paypal_capture_id} ${r.cs}`, refund: r.paypal_refund_id })), atPayPal },
    );
    const again = (await adminCall<{ already: boolean; refund: { paypalRefundId: string } }>({ action: "refund_stray", checkout_id: STRAYS[0]!, note: NOTE })).json;
    const n = (await db.query(`select count(*)::int n from refund_requests where checkout_id = $1`, [STRAYS[0]])).rows[0].n;
    record("R4 a second refund call is a no-op", again.already === true && n === 1, { already: again.already, refundRequests: n });
    const r5 = await adminCall<Run>({ action: "reconcile" });
    record("R5 the next run is clean", r5.json.ok && r5.json.mismatches.length === 0, { matched: r5.json.matched, mismatches: r5.json.mismatches.length, explained: r5.json.explained.length });
    await badgeCheck("R5b dashboard badge turns ✓", ctx, 0, "badge-ok");
  }
  await ctx.close();
} finally {
  await browser.close();
  await db.end();
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(out, `results-${stamp}.json`), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;
