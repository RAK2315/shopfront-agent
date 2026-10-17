// Spike T setup and checks (PLAN Phase 10). Real Telegram and Render calls; prints no secrets.
//   setup  generate TELEGRAM_WEBHOOK_SECRET into .env if missing → put both Telegram vars on Render → redeploy and
//          wait for live → getMe → setWebhook (secret_token, allowed_updates message + callback_query) → getWebhookInfo
//   info   getWebhookInfo (pending updates, last error) and the 401 check: a POST without the secret is refused
// Usage: pnpm --filter web spike-t -- setup | info
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const cmd = process.argv.slice(2).filter((a) => a !== "--")[0] ?? "info";
const envPath = resolve("../../.env");
const SERVICE = "srv-db8e76dg1s2s739vvv0g";
const APP = "https://shopfront-agent.onrender.com";
const readEnv = () =>
  Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
      .filter((m): m is RegExpMatchArray => Boolean(m))
      .map((m) => [m[1]!, m[2]!.trim()]),
  );
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

let env = readEnv();
if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is missing from .env (SETUP §13)");
const tg = async <T,>(method: string, body?: Record<string, unknown>) => {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = (await r.json()) as { ok: boolean; result?: T; description?: string };
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description}`);
  return j.result as T;
};
const render = async (method: string, path: string, body?: unknown) => {
  const r = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${env.RENDER_API_KEY}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`render ${method} ${path}: ${r.status}`);
  return r.json() as Promise<unknown>;
};

async function info() {
  const w = await tg<{ url: string; pending_update_count: number; last_error_date?: number; last_error_message?: string; allowed_updates?: string[] }>("getWebhookInfo");
  log("webhook", { url: w.url, pending: w.pending_update_count, allowed: w.allowed_updates, lastError: w.last_error_message ?? null, lastErrorAt: w.last_error_date ? new Date(w.last_error_date * 1000).toISOString() : null });
  const noSecret = await fetch(`${APP}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ update_id: 1 }) });
  const wrongSecret = await fetch(`${APP}/telegram/webhook`, { method: "POST", headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "wrong" }, body: JSON.stringify({ update_id: 1 }) });
  log("forged updates", { noSecret: noSecret.status, wrongSecret: wrongSecret.status });
}

if (cmd === "setup") {
  if (!env.TELEGRAM_WEBHOOK_SECRET) {
    appendFileSync(envPath, `\nTELEGRAM_WEBHOOK_SECRET=${randomBytes(32).toString("base64url")}\n`);
    env = readEnv();
    log("generated TELEGRAM_WEBHOOK_SECRET into .env");
  }
  for (const key of ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"]) {
    await render("PUT", `/services/${SERVICE}/env-vars/${key}`, { value: env[key] });
    log("render env set", key);
  }
  const deploy = (await render("POST", `/services/${SERVICE}/deploys`, {})) as { id: string };
  log("redeploy", deploy.id);
  for (;;) {
    await new Promise((r) => setTimeout(r, 15_000));
    const [d] = (await render("GET", `/services/${SERVICE}/deploys?limit=1`)) as Array<{ deploy: { id: string; status: string } }>;
    if (d!.deploy.status === "live") break;
    if (/failed|canceled/.test(d!.deploy.status)) throw new Error(`deploy ${d!.deploy.status}`);
  }
  log("deploy live");
  const me = await tg<{ username: string }>("getMe");
  log("bot", `@${me.username}`);
  await tg("setWebhook", { url: `${APP}/telegram/webhook`, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
  log("setWebhook ok");
}
await info();
