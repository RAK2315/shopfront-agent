import { recentCheckouts } from "@/server/console";
import { isTestRun } from "@/server/run-context";

export const dynamic = "force-dynamic";

// Recent checkouts for the live console (refetched when the event stream says something changed).
// Public: test and script runs are hidden unless this request is one.
export async function GET() {
  return Response.json({ checkouts: await recentCheckouts(12, await isTestRun()) }, { headers: { "cache-control": "no-store" } });
}
