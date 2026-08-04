import { createFileRoute } from "@tanstack/react-router";
import { PROOF } from "@/lib/catalog";

export const Route = createFileRoute("/api/proof")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            ok: true,
            schema: "lvl-agent-purchase-proof-v2",
            domain: "demo-host",
            time: new Date().toISOString(),
            loop_status: "verified_live",
            payments: {
              live: true,
              protocol: "x402",
              network: PROOF.network,
              asset: PROOF.asset,
            },
            confirmed_unlocks: PROOF.confirmed_unlocks,
            confirmed_volume_usd: PROOF.confirmed_volume_usd,
            last_successful_agent_purchase: {
              skill_id: PROOF.last_skill_id,
              price_usd: PROOF.confirmed_volume_usd,
              txHash: PROOF.last_tx,
              network: PROOF.network,
              asset: PROOF.asset,
              verification: "demo_ledger",
            },
            recent_unlocks: [
              {
                skill_id: PROOF.last_skill_id,
                price_usd: PROOF.confirmed_volume_usd,
                txHash: PROOF.last_tx,
              },
            ],
            note: "Never invent volume. Zero is valid truth.",
          },
          { headers: { "Cache-Control": "public, max-age=15" } },
        ),
    },
  },
});
