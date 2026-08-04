import { createFileRoute } from "@tanstack/react-router";
import catalogEntry from "../../../skills/agent-memory/catalog-entry.json";

export const Route = createFileRoute("/api/catalog")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            site: "agent-memory live host",
            product: "LVL LTD agent-memory skill (demo host)",
            version: "1.0.0",
            skills: [catalogEntry],
          },
          { headers: { "Cache-Control": "public, max-age=60" } },
        ),
    },
  },
});
