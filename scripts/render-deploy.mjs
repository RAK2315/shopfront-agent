// Deploy to Render (free web service) + register the PayPal sandbox webhook, using only local .env.
// Usage: node scripts/render-deploy.mjs            (create or update service, deploy, wait)
//        node scripts/render-deploy.mjs --webhook  (also create/reuse the PayPal webhook and redeploy with its id)
// Secrets are read from .env and sent only to Render's API / PayPal's API. Nothing is printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const envText = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
const NAME = 'shopfront-agent';
const REPO = 'https://github.com/RAK2315/shopfront-agent';
const R = 'https://api.render.com/v1';
if (!env.RENDER_API_KEY) throw new Error('RENDER_API_KEY is empty in .env');

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
async function render(method, path, body) {
  const res = await fetch(`${R}${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.RENDER_API_KEY}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Render ${method} ${path} → ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

// Only these keys go to Render (never RENDER_API_KEY, sandbox buyer logins or dev flags).
const SHIP = ['PAYPAL_BASE_URL', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'LLM_MODE', 'LLM_AGENT_PROVIDERS', 'LLM_VISION_PROVIDERS', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_MODEL_STRONG', 'GROQ_API_KEY', 'GROQ_MODEL', 'LLM_MAX_CALLS_PER_DAY', 'LLM_MAX_CALLS_PER_IP_PER_HOUR', 'DATABASE_URL', 'SESSION_SECRET', 'NEXT_PUBLIC_AG_LICENSE_KEY'];
const envVars = (appUrl, extra = {}) => [
  ...SHIP.filter((k) => (extra[k] ?? env[k])).map((k) => ({ key: k, value: extra[k] ?? env[k] })),
  { key: 'APP_URL', value: appUrl },
  { key: 'NODE_VERSION', value: '22' },
  { key: 'NODE_ENV', value: 'production' },
];

async function waitForDeploy(serviceId) {
  const t0 = Date.now();
  let last = '';
  for (;;) {
    const [d] = (await render('GET', `/services/${serviceId}/deploys?limit=1`)).map((x) => x.deploy ?? x);
    if (d?.status !== last) log(`deploy ${d?.id} → ${d?.status}`), (last = d?.status);
    if (['live'].includes(d?.status)) return d;
    if (['build_failed', 'update_failed', 'canceled', 'deactivated', 'pre_deploy_failed'].includes(d?.status)) throw new Error(`Deploy ${d.status}`);
    if (Date.now() - t0 > 20 * 60_000) throw new Error('Deploy timed out (20 min)');
    await new Promise((r) => setTimeout(r, 15_000));
  }
}

async function paypalToken() {
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  return (await res.json()).access_token;
}

async function ensureWebhook(url) {
  const token = await paypalToken();
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const list = await (await fetch(`${env.PAYPAL_BASE_URL}/v1/notifications/webhooks`, { headers: h })).json();
  const existing = (list.webhooks ?? []).find((w) => w.url === url);
  if (existing) return { id: existing.id, created: false };
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/notifications/webhooks`, {
    method: 'POST',
    headers: { ...h, 'PayPal-Request-Id': `webhook-${randomUUID()}` },
    body: JSON.stringify({ url, event_types: [{ name: '*' }] }), // all events, filtered in code (D-041)
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`PayPal webhook create failed ${res.status} ${j.name ?? ''} debug_id=${res.headers.get('paypal-debug-id')}`);
  return { id: j.id, created: true };
}

const owners = await render('GET', '/owners?limit=20');
const owner = (owners[0]?.owner ?? owners[0]);
log('workspace', owner.name ?? owner.id);

const services = await render('GET', `/services?name=${NAME}&limit=20`);
let svc = services.map((s) => s.service ?? s).find((s) => s.name === NAME);
if (!svc) {
  log('creating free web service…');
  const guessUrl = `https://${NAME}.onrender.com`;
  const created = await render('POST', '/services', {
    type: 'web_service',
    name: NAME,
    ownerId: owner.id,
    repo: REPO,
    branch: 'main',
    autoDeployTrigger: 'commit',
    envVars: envVars(guessUrl),
    serviceDetails: {
      runtime: 'node',
      plan: 'free',
      region: 'ohio',
      healthCheckPath: '/api/health/live',
      envSpecificDetails: {
        buildCommand: 'corepack enable && pnpm install --frozen-lockfile && pnpm --filter web build',
        startCommand: 'pnpm --filter web start',
      },
    },
  });
  svc = created.service;
}
const appUrl = svc.serviceDetails?.url ?? `https://${NAME}.onrender.com`;
log('service', svc.id, appUrl);

let webhookId = env.PAYPAL_WEBHOOK_ID;
if (process.argv.includes('--webhook')) {
  const wh = await ensureWebhook(`${appUrl}/webhooks/paypal`);
  webhookId = wh.id;
  log(`PayPal webhook ${wh.created ? 'created' : 'reused'}: ${wh.id}`);
  if (env.PAYPAL_WEBHOOK_ID !== wh.id) {
    writeFileSync(envPath, envText.replace(/^PAYPAL_WEBHOOK_ID=.*$/m, `PAYPAL_WEBHOOK_ID=${wh.id}`));
    log('PAYPAL_WEBHOOK_ID written to .env');
  }
}

// Always sync env (APP_URL must be the real URL), then deploy the latest commit.
await render('PUT', `/services/${svc.id}/env-vars`, envVars(appUrl, { PAYPAL_WEBHOOK_ID: webhookId }));
log('env vars synced (' + envVars(appUrl).length + ' keys)');
await render('POST', `/services/${svc.id}/deploys`, { clearCache: 'do_not_clear' });
const d = await waitForDeploy(svc.id);
log('LIVE', appUrl, 'commit', d.commit?.id?.slice(0, 7));
const health = await (await fetch(`${appUrl}/api/health`)).json().catch(() => null);
log('health', JSON.stringify(health));
