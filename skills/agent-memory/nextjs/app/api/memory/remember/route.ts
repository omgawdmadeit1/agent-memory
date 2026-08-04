/**
 * Next.js App Router — POST /api/memory/remember
 * Drop-in for lvlltd.com. Wire getStore() to existing KV/R2/Postgres.
 */
import { createMemoryHandlers } from "../../../../../lib/handler";
import { getStore } from "../../../../lib/store";

const handlers = createMemoryHandlers(() => getStore());

export async function POST(request: Request) {
  return handlers.remember(request);
}

export async function GET() {
  return Response.json(
    { ok: false, error_code: "METHOD_NOT_ALLOWED", message: "POST only" },
    { status: 405 },
  );
}
