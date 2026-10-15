import { after } from "next/server";
import { ingestWebhook, processWebhook } from "@/server/webhooks";

export const dynamic = "force-dynamic";

// PayPal webhook listener: verify signature → store once by event id → reply 2xx fast → process after.
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const r = await ingestWebhook(raw, req.headers);
    if (r.status === "stored") after(() => processWebhook(r.eventId).catch((e) => console.error("webhook processing failed", r.eventId, e)));
    return Response.json({ received: true, duplicate: r.status === "duplicate", verified: r.verified });
  } catch (e) {
    console.error("webhook ingest failed", e);
    // Non-2xx makes PayPal retry (up to 25× over 3 days), which is what we want on transient failures.
    return Response.json({ received: false }, { status: 500 });
  }
}
