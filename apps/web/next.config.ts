import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

// Local runs keep one .env at the repo root (README). Next only reads apps/web/.env*, so load the root file for
// `pnpm build` / `pnpm start` too. Render has no file and sets real env vars, which a file never overrides.
const rootEnv = resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const nextConfig: NextConfig = {
  // Payment, MCP and webhook routes are request-time by nature; classic dynamic rendering keeps them simple.
  cacheComponents: false,
  // `pg` uses optional native bindings; keep it out of the bundle.
  serverExternalPackages: ["pg"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [
      {
        // PayPal JS SDK v6 opens a popup; this mirrors PayPal's official v6 sample integration.
        source: "/pay/:path*",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
