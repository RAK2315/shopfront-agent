import "server-only";
import { z } from "zod";

// Server env, validated once. Secrets never leave the server (CLAUDE.md).
const Env = z.object({
  PAYPAL_BASE_URL: z.url().refine((u) => u.includes("sandbox"), "Sandbox only"),
  PAYPAL_CLIENT_ID: z.string().min(10),
  PAYPAL_CLIENT_SECRET: z.string().min(10),
  PAYPAL_WEBHOOK_ID: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  LLM_MODE: z.enum(["live", "replay"]).default("live"),
  LLM_AGENT_PROVIDERS: z.string().default("groq,gemini"),
  LLM_VISION_PROVIDERS: z.string().default("gemini"),
  LLM_MAX_CALLS_PER_DAY: z.coerce.number().int().default(400),
  LLM_MAX_CALLS_PER_IP_PER_HOUR: z.coerce.number().int().default(30),
  DATABASE_URL: z.string().min(10),
  APP_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  DEV_ALLOW_UNVERIFIED_WEBHOOKS: z.stringbool().default(false),
  // The published sandbox buyer for judges (owner-approved, supersedes D-034). Sandbox only; shown on /pay when set.
  SANDBOX_BUYER_EMAIL: z.string().optional().default(""),
  SANDBOX_BUYER_PASSWORD: z.string().optional().default(""),
  // Telegram seller copilot (Phase 10; Spike T first). Server-only; the webhook route is inert while unset.
  TELEGRAM_BOT_TOKEN: z.string().optional().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{0,256}$/).optional().default(""),
});

export type ServerEnv = z.infer<typeof Env>;

let cached: ServerEnv | undefined;
export function env(): ServerEnv {
  if (!cached) cached = Env.parse(process.env);
  return cached;
}

export function appUrl(path = ""): string {
  return new URL(path, env().APP_URL).toString();
}
