// Mints a PayPal SANDBOX access token from .env and stores it in ~/.claude/settings.json
// as env.PAYPAL_SANDBOX_ACCESS_TOKEN (the variable the PayPal AI Toolkit plugin reads).
// Tokens last ~8-9 h. Re-run when the toolkit returns 401, then fully restart Claude Code.
// Usage: node scripts/refresh-paypal-ai-toolkit-token.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
if (!/sandbox/.test(env.PAYPAL_BASE_URL ?? '')) throw new Error('Refusing: PAYPAL_BASE_URL is not the sandbox.');

const res = await fetch(`${env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
});
if (!res.ok) throw new Error(`Token request failed: ${res.status} ${res.headers.get('paypal-debug-id') ?? ''}`);
const { access_token, expires_in } = await res.json();

const settingsPath = join(homedir(), '.claude', 'settings.json');
const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
if (existsSync(settingsPath)) copyFileSync(settingsPath, `${settingsPath}.bak`);
settings.env = { ...(settings.env ?? {}), PAYPAL_SANDBOX_ACCESS_TOKEN: access_token };
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

const expires = new Date(Date.now() + expires_in * 1000);
console.log(`Token written to ${settingsPath} (env.PAYPAL_SANDBOX_ACCESS_TOKEN).`);
console.log(`Expires ~${expires.toLocaleString()}. Fully quit and reopen Claude Code to load it.`);
