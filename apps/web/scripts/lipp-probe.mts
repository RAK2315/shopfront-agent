// Does PayPal accept our Log in with PayPal client id + Return URL yet? (D-084, OWNER-TODO #4)
// Prints ACCEPTED (PayPal's sign-in page loads) or REJECTED ("invalid client_id or redirect_uri"). Changes nothing.
// Usage: pnpm --filter web lipp-probe -- --base https://shopfront-agent.onrender.com
import { createHmac } from "node:crypto";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2).filter((a) => a !== "--");
const base = (args[args.indexOf("--base") + 1] ?? "https://shopfront-agent.onrender.com").replace(/\/$/, "");
const e = process.env as Record<string, string>;
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
const { url } = (await (await fetch(`${base}/api/admin/demo`, { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify({ action: "connect_url", handle: "fern_and_loom" }) })).json()) as { url: string };
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);
const body = await p.locator("body").innerText();
console.log(`${new Date().toISOString()} ${/invalid client_id or redirect_uri/i.test(body) ? "REJECTED" : /email|log in|password/i.test(body) ? "ACCEPTED" : `UNKNOWN: ${body.slice(0, 120).replace(/\s+/g, " ")}`}`);
await b.close();
