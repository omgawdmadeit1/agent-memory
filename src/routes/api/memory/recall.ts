import { createFileRoute } from "@tanstack/react-router";
import { createMemoryHandlers, getMemoryStore } from "@/lib/memory";

const handlers = createMemoryHandlers(() => getMemoryStore());

export const Route = createFileRoute("/api/memory/recall")({
  server: {
    handlers: {
      GET: ({ request }) => handlers.recall(request),
      POST: ({ request }) => handlers.recall(request),
    },
  },
});
