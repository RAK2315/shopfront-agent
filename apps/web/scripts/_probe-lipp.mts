// Temporary probe (deleted after use): does PayPal's /connect page accept our client_id + redirect_uri now?
import { createHmac } from "node:crypto";
import { chromium } from "@playwright/test";
const e = process.env as Record<string, string>;
const admin = createHmac("sha256", e.SESSION_SECRET).update("admin:demo-reset").digest("base64url");
const { url } = (await (await fetch("https://shopfront-agent.onrender.com/api/admin/demo", { method: "POST", headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" }, body: JSON.stringify({ action: "connect_url", handle: "fern_and_loom" }) })).json()) as { url: string };
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(url, { waitUntil: "domcontentloaded" });
await p.waitForTimeout(6000);
const body = await p.locator("body").innerText();
console.log(/invalid client_id or redirect_uri/i.test(body) ? "STILL REJECTED" : /email|log in|password/i.test(body) ? "LOGIN PAGE OK" : `OTHER: ${body.slice(0, 120).replace(/\s+/g, " ")}`);
await b.close();
