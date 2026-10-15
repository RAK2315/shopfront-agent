import { recentCheckouts } from "@/server/console";

export const dynamic = "force-dynamic";

// Recent checkouts for the live console (refetched when the event stream says something changed).
export async function GET() {
  return Response.json({ checkouts: await recentCheckouts() }, { headers: { "cache-control": "no-store" } });
}
