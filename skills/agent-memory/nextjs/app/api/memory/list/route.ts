import { createMemoryHandlers } from "../../../../../lib/handler";
import { getStore } from "../../../../lib/store";

const handlers = createMemoryHandlers(() => getStore());

export async function POST(request: Request) {
  return handlers.list(request);
}

export async function GET(request: Request) {
  return handlers.list(request);
}
