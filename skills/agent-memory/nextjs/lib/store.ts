/**
 * Shared store singleton for Next.js App Router memory routes.
 * Replace InMemoryStore with host Vercel KV / Postgres adapter in production.
 */
import { InMemoryStore, type MemoryStore } from "../../lib/storage";

const g = globalThis as typeof globalThis & { __lvlAgentMemoryStore__?: MemoryStore };

export function getStore(): MemoryStore {
  if (!g.__lvlAgentMemoryStore__) {
    g.__lvlAgentMemoryStore__ = new InMemoryStore(true);
  }
  return g.__lvlAgentMemoryStore__;
}
