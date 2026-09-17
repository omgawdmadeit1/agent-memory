export type MemoryDbSource = "neon" | "pglite";

/**
 * In-memory fallback is only for local/preview PGLite. A Neon deploy must
 * fail closed — otherwise a transient SQL error writes to RAM, the next
 * request hits Postgres, and the remember is silently lost.
 */
export function allowInMemoryFallback(source: MemoryDbSource): boolean {
  return source !== "neon";
}
