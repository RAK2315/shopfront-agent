// Spike M (PLAN Phase 9): can this sandbox app act as a PayPal multiparty platform? Real sandbox calls, no mocks.
//   A  POST /v2/customer/partner-referrals → 201 with an action_url (onboarding link), or an error naming the gate
//   B  POST /v2/checkout/orders with payment_instruction.platform_fees → is a platform fee accepted at all?
//      (payee = our own merchant here, until seller 2 exists; the order is never captured and simply expires)
//   C  with --seller2 <merchant id or email>: the same order with payee = seller 2 (routing), still uncaptured
// Prints statuses, issue names and PayPal-Debug-Ids only: never tokens, never the onboarding link itself.
// Usage: pnpm --filter web spike-m [-- --seller2 <merchant id>]
import { randomUUID } from "node:crypto";
import { PayPalApiError, PayPalClient } from "@shopfront/paypal";

const args = process.argv.slice(2).filter((a) => a !== "--");
const seller2 = args.includes("--seller2") ? args[args.indexOf("--seller2") + 1] : undefined;
const e = process.env as Record<string, string>;
const pp = new PayPalClient({ baseUrl: e.PAYPAL_BASE_URL!, clientId: e.PAYPAL_CLIENT_ID!, clientSecret: e.PAYPAL_CLIENT_SECRET! });
const PARTNER = "DY7U9FZDLKJRE"; // Juniper Clay Studio's sandbox business account = the app owner (HANDOFF)

async function step(id: string, f: () => Promise<{ status: number; debugId?: string; data: unknown }>, show: (d: unknown) => unknown) {
  try {
    const r = await f();
    console.log(id, "OK", r.status, "debug", r.debugId, JSON.stringify(show(r.data)));
  } catch (err) {
    if (err instanceof PayPalApiError) console.log(id, "ERROR", err.status, err.issue, "debug", err.debugId, "|", err.message, JSON.stringify(err.details));
    else console.log(id, "ERROR", String(err));
  }
}

await step(
  "A partner-referrals",
  () =>
    pp.request("POST", "/v2/customer/partner-referrals", {
      requestId: randomUUID(),
      body: {
        tracking_id: `spike-m-${Date.now()}`,
        operations: [
          {
            operation: "API_INTEGRATION",
            api_integration_preference: {
              rest_api_integration: { integration_method: "PAYPAL", integration_type: "THIRD_PARTY", third_party_details: { features: ["PAYMENT", "REFUND", "PARTNER_FEE"] } },
            },
          },
        ],
        products: ["EXPRESS_CHECKOUT"],
        legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
        partner_config_override: { return_url: "https://shopfront-agent.onrender.com/studio" },
      },
    }),
  (d) => ({ links: ((d as { links?: Array<{ rel: string }> }).links ?? []).map((l) => l.rel) }),
);

const order = (payee: Record<string, string>, fee: boolean) => () =>
  pp.request("POST", "/v2/checkout/orders", {
    requestId: randomUUID(),
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: "spike-m",
          amount: { currency_code: "USD", value: "37.00" },
          payee,
          ...(fee ? { payment_instruction: { disbursement_mode: "INSTANT", platform_fees: [{ amount: { currency_code: "USD", value: "1.85" } }] } } : {}),
        },
      ],
    },
  });
const orderView = (d: unknown) => ({ id: (d as { id?: string }).id, status: (d as { status?: string }).status });

await step("B order, payee = partner itself, with platform fee", order({ merchant_id: PARTNER }, true), orderView);
if (seller2) {
  const payee: Record<string, string> = seller2.includes("@") ? { email_address: seller2 } : { merchant_id: seller2 };
  await step("C1 order, payee = seller 2, no fee", order(payee, false), orderView);
  await step("C2 order, payee = seller 2, with platform fee", order(payee, true), orderView);
}
