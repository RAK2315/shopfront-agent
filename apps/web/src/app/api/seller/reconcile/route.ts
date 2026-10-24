import { errorResponse } from "@/server/http";
import { reconciliationFor, runReconciliation } from "@/server/ledger";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// The reconcile widget on the AG Studio report (Phase AG): the latest check with PayPal, scoped to this seller (D-095).
export async function GET() {
  try {
    const seller = await requireSeller();
    return Response.json(await reconciliationFor(seller), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}

// "Check again": runs a reconciliation unless the last one is under 5 minutes old (it reads PayPal, so it is
// rate-limited; a run already in flight is shared). Read-only against PayPal: it never moves money.
export async function POST() {
  try {
    const seller = await requireSeller();
    const before = await reconciliationFor(seller);
    const fresh = before.checkedAt && Date.now() - new Date(before.checkedAt).getTime() < 5 * 60_000;
    if (!fresh) await runReconciliation("dashboard");
    return Response.json({ ...(await reconciliationFor(seller)), reran: !fresh }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
