import { createFileRoute } from "@tanstack/react-router";
import { getInventoryCounts, PROOF, SKILLS, toSlim } from "@/lib/catalog";

export const Route = createFileRoute("/api/shop")({
  server: {
    handlers: {
      GET: () => {
        const inventory = getInventoryCounts();
        const featured = SKILLS.filter((s) => s.featured).map(toSlim);
        const top = SKILLS.filter((s) => s.depth !== "outline_only")
          .slice(0, 8)
          .map(toSlim);

        return Response.json(
          {
            ok: true,
            schema: "lvl-agent-shop-v1",
            name: "LVL LTD Agent Skill Market",
            site: "demo-host",
            next_action: {
              for_agents: {
                step: 1,
                do: "Prefer canary or confirmed commerce skill; free outline before pay",
                outline: "/api/skills/agent-memory/outline",
                catalog_slim: "/api/catalog",
                catalog_full: "/api/catalog?full=1",
                runtime: "/api/memory/pricing",
                then: "Transfer exact atomic USDC on Base when using production rails",
              },
              for_humans: {
                marketplace: "/marketplace",
                canary: "/listings/agent-x402-first-buy",
                memory: "/listings/agent-memory",
              },
            },
            inventory,
            proof: {
              confirmed_unlocks: PROOF.confirmed_unlocks,
              confirmed_volume_usd: PROOF.confirmed_volume_usd,
            },
            featured,
            top_by_depth: top,
            surfaces: {
              catalog: "/api/catalog",
              inventory: "/api/inventory",
              proof: "/api/proof",
              health: "/api/health",
            },
          },
          { headers: { "Cache-Control": "public, max-age=30" } },
        );
      },
    },
  },
});
