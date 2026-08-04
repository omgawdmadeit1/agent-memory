import { createFileRoute } from "@tanstack/react-router";
import { pricingTable } from "@/lib/memory";

export const Route = createFileRoute("/api/memory/pricing")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          { ok: true, ...pricingTable() },
          { headers: { "Cache-Control": "public, max-age=60" } },
        ),
    },
  },
});
