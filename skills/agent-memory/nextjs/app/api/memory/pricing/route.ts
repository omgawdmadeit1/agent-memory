import { pricingTable } from "../../../../../lib/pricing";

/** Free pricing table — no x402 gate. */
export async function GET() {
  return Response.json(
    { ok: true, ...pricingTable() },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
