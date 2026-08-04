import { createFileRoute } from "@tanstack/react-router";
import { getInventoryCounts } from "@/lib/catalog";

export const Route = createFileRoute("/api/inventory")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            ok: true,
            schema: "lvl-inventory-counts-v1",
            ...getInventoryCounts(),
          },
          { headers: { "Cache-Control": "public, max-age=30" } },
        ),
    },
  },
});
