import { createFileRoute } from "@tanstack/react-router";
import { createMemoryHandlers, getMemoryStore } from "@/lib/memory";

const handlers = createMemoryHandlers(() => getMemoryStore());

export const Route = createFileRoute("/api/memory/forget")({
  server: {
    handlers: {
      POST: ({ request }) => handlers.forget(request),
      DELETE: ({ request }) => handlers.forget(request),
    },
  },
});
