#!/usr/bin/env node
// Owner-only admin calls to the deployed app (D-011): node --env-file=.env scripts/admin.mjs '<json body>' [...]
// The bearer token is derived from SESSION_SECRET and never printed. Calls are marked as a test run.
import { createHmac } from 'node:crypto';
const base = process.env.ADMIN_BASE ?? 'https://shopfront-agent.onrender.com';
const s = process.env.SESSION_SECRET;
if (!s) throw new Error('SESSION_SECRET missing (run with --env-file=.env)');
const token = createHmac('sha256', s).update('admin:demo-reset').digest('base64url');
const testRun = createHmac('sha256', s).update('test-run').digest('base64url');
for (const body of process.argv.slice(2)) {
  const r = await fetch(`${base}/api/admin/demo`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-shopfront-test-run': testRun }, body });
  console.log(body, r.status, await r.text());
}
