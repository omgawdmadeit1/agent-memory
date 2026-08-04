import { createFileRoute } from "@tanstack/react-router";
import { createMemoryHandlers, getMemoryStore } from "@/lib/memory";

const handlers = createMemoryHandlers(() => getMemoryStore());

export const Route = createFileRoute("/api/memory/remember")({
  server: {
    handlers: {
      POST: ({ request }) => handlers.remember(request),
    },
  },
});
