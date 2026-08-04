import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          ok: true,
          service: "agent-memory",
          skill_id: "agent-memory",
          time: new Date().toISOString(),
        }),
    },
  },
});
