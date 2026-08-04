import { createMemoryHandlers } from "../../../../../lib/handler";
import { getStore } from "../../../../lib/store";

const handlers = createMemoryHandlers(() => getStore());

export async function POST(request: Request) {
  return handlers.forget(request);
}

export async function DELETE(request: Request) {
  return handlers.forget(request);
}
