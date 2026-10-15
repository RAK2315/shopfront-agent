import { z } from "zod";
import { clientKeyOf, withTestHooks } from "@/server/llm";
import { rateLimit } from "@/server/rate-limit";
import { runShopAgent, type ShopAgentEvent } from "@/server/shop-agent";

export const dynamic = "force-dynamic";

const Body = z.strictObject({ sessionId: z.string().regex(/^bys_[a-z0-9]{12}$/).nullable().optional(), message: z.string().trim().min(1).max(800) });

// The hosted buyer agent, streamed as NDJSON (one ShopAgentEvent per line).
export async function POST(req: Request) {
  const limited = rateLimit(req, "shop_chat");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Say something to the agent." } }, { status: 400 });
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ShopAgentEvent) => controller.enqueue(enc.encode(`${JSON.stringify(e)}\n`));
      await withTestHooks(req, () => runShopAgent(parsed.data.sessionId ?? null, parsed.data.message, clientKeyOf(req), emit));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
}
