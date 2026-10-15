import type { NextConfig } from "next";

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
