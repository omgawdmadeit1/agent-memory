import { createFileRoute } from "@tanstack/react-router";
import { createMemoryHandlers, getMemoryStore } from "@/lib/memory";

const handlers = createMemoryHandlers(() => getMemoryStore());

export const Route = createFileRoute("/api/memory/list")({
  server: {
    handlers: {
      GET: ({ request }) => handlers.list(request),
      POST: ({ request }) => handlers.list(request),
    },
  },
});
