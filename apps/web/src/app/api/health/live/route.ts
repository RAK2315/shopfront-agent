export const dynamic = "force-dynamic";

// Keep-warm target (D-030): never touches the database, so pings don't burn Neon compute.
export function GET() {
  return Response.json({ ok: true, at: new Date().toISOString() });
}
