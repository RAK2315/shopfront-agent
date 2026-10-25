// Preloaded by every acceptance and recording script (package.json: --import ./scripts/lib/test-run.ts).
// It marks every request to our own app as a test run (signed `x-shopfront-test-run` header), so test checkouts and
// events are flagged `is_test` and never appear on the public /live, the landing hero or /api/events (D-070).
// It covers Node's fetch (plain calls and the MCP SDK transport) and every Playwright browser context. Requests to
// PayPal or anywhere else are left untouched. A request may opt out with `x-shopfront-public-view: 1` (to check what
// the public sees, or to act as a real visitor).
import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext } from "@playwright/test";

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("test-run preload: SESSION_SECRET missing (run with --env-file)");
const HEADER = "x-shopfront-test-run";
const SIG = createHmac("sha256", secret).update("test-run").digest("base64url");
// For clients that bypass fetch (the PayPal Cart API SDK uses axios): they add this header themselves (D-104).
(globalThis as { __shopfrontTestRunHeaders?: Record<string, string> }).__shopfrontTestRunHeaders = { [HEADER]: SIG };

const ours = (u: string | URL) => {
  try {
    const { hostname } = new URL(String(u));
    return hostname === "shopfront-agent.onrender.com" || hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const realFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input instanceof Request ? input.url : input;
  if (!ours(url)) return realFetch(input, init);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (headers.get("x-shopfront-public-view") === "1") headers.delete("x-shopfront-public-view");
  else headers.set(HEADER, SIG);
  return realFetch(input, { ...init, headers });
};

async function mark(ctx: BrowserContext) {
  await ctx.route(
    (url) => ours(url),
    (route) => route.continue({ headers: { ...route.request().headers(), [HEADER]: SIG } }),
  );
  return ctx;
}

const realLaunch = chromium.launch.bind(chromium);
chromium.launch = (async (...a: Parameters<typeof chromium.launch>) => {
  // AT_HEADLESS=1: run every suite on the headless shell (when this machine has no interactive desktop, a headed or
  // channel:"chromium" launch fails with "spawn UNKNOWN"). PayPal's sandbox login works headless as of 2026-10-18.
  if (process.env.AT_HEADLESS === "1") a = [{ ...(a[0] ?? {}), headless: true, channel: undefined }] as Parameters<typeof chromium.launch>;
  const browser: Browser = await realLaunch(...a);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (...o: Parameters<Browser["newContext"]>) => mark(await newContext(...o));
  browser.newPage = async (...o: Parameters<Browser["newPage"]>) => {
    const ctx = await browser.newContext(...(o as Parameters<Browser["newContext"]>));
    return ctx.newPage();
  };
  return browser;
}) as typeof chromium.launch;

// D-095: every suite ends with a reconciliation with PayPal against the same --base, so a capture with no paid order
// (or a paid order with no capture) fails the run that caused it. Synchronous on purpose: suites end with
// process.exit(), which skips beforeExit, and an exit listener may only block. A mismatch is re-checked once after
// 90 s (a payment can still be settling). AT_RECONCILE=0 skips it.
if (process.env.AT_RECONCILE !== "0") {
  process.once("exit", (code) => {
    const argv = process.argv.slice(2).filter((x) => x !== "--");
    const base = argv.includes("--base") ? argv[argv.indexOf("--base") + 1] : undefined;
    if (!base?.startsWith("http")) return;
    const script = fileURLToPath(new URL("../reconcile.mts", import.meta.url));
    const r = spawnSync(process.execPath, ["--import", "tsx", script, "--base", base, "--settle"], { stdio: "inherit", env: process.env });
    if (r.status !== 0 && !code) process.exitCode = 1;
  });
}
