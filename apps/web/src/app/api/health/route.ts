import { sql } from "@shopfront/db";
import { services } from "@/server/services";

export const dynamic = "force-dynamic";

// When this server process started: lets a restart test prove a fresh process answered (no in-memory state).
const g = globalThis as unknown as { __bootedAt?: string };
g.__bootedAt ??= new Date().toISOString();

// Deep health check (deploy verification only — not for the pinger): DB + PayPal token, no secrets returned.
export async function GET() {
  const { db, client } = services();
  const out: Record<string, boolean | string> = { ok: true };
  try {
    await db.execute(sql`select 1`);
    out.db = true;
  } catch {
    out.db = false;
    out.ok = false;
  }
  try {
    await client.accessToken();
    out.paypal_token = true;
  } catch {
    out.paypal_token = false;
    out.ok = false;
  }
  out.webhook_configured = Boolean(process.env.PAYPAL_WEBHOOK_ID);
  out.commit = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? "local";
  out.booted_at = g.__bootedAt!;
  return Response.json(out, { status: out.ok ? 200 : 503 });
}
