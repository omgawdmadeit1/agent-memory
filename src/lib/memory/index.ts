/**
 * Re-exports skill pack core + SQL-backed store for the live demo host.
 */
export * from "../../../skills/agent-memory/lib/pricing";
export * from "../../../skills/agent-memory/lib/errors";
export * from "../../../skills/agent-memory/lib/scope";
export * from "../../../skills/agent-memory/lib/rate-limit";
export * from "../../../skills/agent-memory/lib/x402";
export * from "../../../skills/agent-memory/lib/storage";
export * from "../../../skills/agent-memory/lib/handler";

import { getSql } from "@/lib/db";
import {
  InMemoryStore,
  SqlMemoryStore,
  type MemoryStore,
} from "../../../skills/agent-memory/lib/storage";

let fallback: InMemoryStore | null = null;

/** Prefer Postgres/PGLite agent_memory table; fall back to process Map. */
export async function getMemoryStore(): Promise<MemoryStore> {
  try {
    const sql = await getSql();
    // Ensure table exists (migration may not have run yet in some boots)
    await sql.query(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        path TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        owner TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        bytes INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return new SqlMemoryStore(sql);
  } catch (err) {
    console.warn("[agent-memory] SQL store unavailable, using in-memory:", err);
    if (!fallback) fallback = new InMemoryStore(true);
    return fallback;
  }
}
