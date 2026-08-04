import { createFileRoute } from "@tanstack/react-router";
import outline from "../../../../../skills/agent-memory/outline.json";

export const Route = createFileRoute("/api/skills/agent-memory/outline")({
  server: {
    handlers: {
      GET: () =>
        Response.json(outline, {
          headers: { "Cache-Control": "public, max-age=120" },
        }),
    },
  },
});
