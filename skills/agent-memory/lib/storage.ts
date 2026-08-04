/**
 * Pluggable KV storage for agent-memory.
 * Default: in-process Map (tests + local).
 * Host adapters: Postgres/Vercel KV/R2 via MemoryStore interface.
 *
 * Isolation is enforced at the path layer (mem:{scope}:{wallet}:{key}).
 */

import { MemoryError } from "./errors.ts";
import {
  assertKey,
  assertPrefix,
  assertWallet,
  parseScope,
  parseStoragePath,
  publicListPrefix,
  storagePath,
  storagePrefix,
  type MemoryScope,
} from "./scope.ts";

export interface MemoryRecord {
  path: string;
  scope: MemoryScope;
  owner: string;
  key: string;
  value: string;
  bytes: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryStore {
  get(path: string): Promise<MemoryRecord | null>;
  set(record: MemoryRecord): Promise<void>;
  delete(path: string): Promise<boolean>;
  listByPrefix(prefix: string, limit: number): Promise<MemoryRecord[]>;
  totalBytesForWallet(wallet: string): Promise<number>;
}

/** Per-wallet soft cap (bytes). Above this → STORAGE_FULL. */
export const WALLET_BYTE_QUOTA = 2 * 1024 * 1024; // 2 MiB
export const MAX_VALUE_BYTES = 64 * 1024; // 64 KiB per value
export const MAX_LIST = 100;

const globalRef = globalThis as typeof globalThis & {
  __agentMemoryKv__?: Map<string, MemoryRecord>;
};

export class InMemoryStore implements MemoryStore {
  private map: Map<string, MemoryRecord>;

  constructor(shared = true) {
    if (shared) {
      if (!globalRef.__agentMemoryKv__) globalRef.__agentMemoryKv__ = new Map();
      this.map = globalRef.__agentMemoryKv__;
    } else {
      this.map = new Map();
    }
  }

  async get(path: string) {
    return this.map.get(path) ?? null;
  }

  async set(record: MemoryRecord) {
    this.map.set(record.path, record);
  }

  async delete(path: string) {
    return this.map.delete(path);
  }

  async listByPrefix(prefix: string, limit: number) {
    const out: MemoryRecord[] = [];
    for (const [k, v] of this.map) {
      if (k.startsWith(prefix)) {
        out.push(v);
        if (out.length >= limit) break;
      }
    }
    out.sort((a, b) => a.key.localeCompare(b.key));
    return out;
  }

  async totalBytesForWallet(wallet: string) {
    const w = wallet.toLowerCase();
    let total = 0;
    for (const v of this.map.values()) {
      if (v.owner === w) total += v.bytes;
    }
    return total;
  }

  clear() {
    this.map.clear();
  }
}

/** Postgres/PGLite adapter using a minimal query surface. */
export type SqlRunner = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

export class SqlMemoryStore implements MemoryStore {
  private sql: SqlRunner;

  constructor(sql: SqlRunner) {
    this.sql = sql;
  }

  async get(path: string) {
    const rows = await this.sql.query<{
      path: string;
      scope: string;
      owner: string;
      key: string;
      value: string;
      bytes: number;
      created_at: string;
      updated_at: string;
    }>("select path, scope, owner, key, value, bytes, created_at, updated_at from agent_memory where path = $1 limit 1", [
      path,
    ]);
    const r = rows[0];
    if (!r) return null;
    return {
      path: r.path,
      scope: r.scope as MemoryScope,
      owner: r.owner,
      key: r.key,
      value: r.value,
      bytes: Number(r.bytes),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    };
  }

  async set(record: MemoryRecord) {
    await this.sql.query(
      `insert into agent_memory (path, scope, owner, key, value, bytes, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (path) do update set
         value = excluded.value,
         bytes = excluded.bytes,
         updated_at = excluded.updated_at`,
      [
        record.path,
        record.scope,
        record.owner,
        record.key,
        record.value,
        record.bytes,
        record.created_at,
        record.updated_at,
      ],
    );
  }

  async delete(path: string) {
    const rows = await this.sql.query<{ path: string }>(
      "delete from agent_memory where path = $1 returning path",
      [path],
    );
    return rows.length > 0;
  }

  async listByPrefix(prefix: string, limit: number) {
    const rows = await this.sql.query<{
      path: string;
      scope: string;
      owner: string;
      key: string;
      value: string;
      bytes: number;
      created_at: string;
      updated_at: string;
    }>(
      `select path, scope, owner, key, value, bytes, created_at, updated_at
       from agent_memory
       where path like $1
       order by key asc
       limit $2`,
      [`${prefix}%`, limit],
    );
    return rows.map((r) => ({
      path: r.path,
      scope: r.scope as MemoryScope,
      owner: r.owner,
      key: r.key,
      value: r.value,
      bytes: Number(r.bytes),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));
  }

  async totalBytesForWallet(wallet: string) {
    const rows = await this.sql.query<{ sum: string | number | null }>(
      "select coalesce(sum(bytes), 0) as sum from agent_memory where owner = $1",
      [wallet.toLowerCase()],
    );
    return Number(rows[0]?.sum ?? 0);
  }
}

function valueBytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export class MemoryService {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  async remember(input: {
    wallet: string;
    key: unknown;
    value: unknown;
    scope?: unknown;
  }): Promise<MemoryRecord> {
    const wallet = assertWallet(input.wallet);
    const key = assertKey(input.key);
    const scope = parseScope(input.scope, "private");

    if (typeof input.value !== "string") {
      throw new MemoryError("MALFORMED_VALUE", "value must be a string", 400);
    }
    const bytes = valueBytes(input.value);
    if (bytes > MAX_VALUE_BYTES) {
      throw new MemoryError(
        "MALFORMED_VALUE",
        `value exceeds max size of ${MAX_VALUE_BYTES} bytes`,
        400,
        { max_bytes: MAX_VALUE_BYTES, value_bytes: bytes },
      );
    }

    const path = storagePath(scope, wallet, key);
    const existing = await this.store.get(path);
    const used = await this.store.totalBytesForWallet(wallet);
    const nextTotal = used - (existing?.bytes ?? 0) + bytes;
    if (nextTotal > WALLET_BYTE_QUOTA) {
      throw new MemoryError(
        "STORAGE_FULL",
        `Wallet storage quota exceeded (${WALLET_BYTE_QUOTA} bytes)`,
        507,
        {
          quota_bytes: WALLET_BYTE_QUOTA,
          used_bytes: used,
          would_use_bytes: nextTotal,
        },
      );
    }

    const now = new Date().toISOString();
    const record: MemoryRecord = {
      path,
      scope,
      owner: wallet,
      key,
      value: input.value,
      bytes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await this.store.set(record);
    return record;
  }

  async recall(input: {
    wallet: string;
    key: unknown;
    scope?: unknown;
  }): Promise<MemoryRecord> {
    const wallet = assertWallet(input.wallet);
    const key = assertKey(input.key);
    const scope = parseScope(input.scope, "private");

    if (scope === "public") {
      const path = storagePath("public", wallet, key);
      const own = await this.store.get(path);
      if (own) return own;
      throw new MemoryError("NOT_FOUND", `No public memory key for this wallet: ${key}`, 404);
    }

    const path = storagePath(scope, wallet, key);
    const rec = await this.store.get(path);
    if (!rec) {
      throw new MemoryError("NOT_FOUND", `Key not found: ${key}`, 404, { scope });
    }
    if (rec.owner !== wallet) {
      throw new MemoryError("FORBIDDEN", "Cross-tenant access denied", 403);
    }
    return rec;
  }

  async recallPublic(owner: string, key: unknown): Promise<MemoryRecord> {
    const o = assertWallet(owner);
    const k = assertKey(key);
    const path = storagePath("public", o, k);
    const rec = await this.store.get(path);
    if (!rec) throw new MemoryError("NOT_FOUND", `Public key not found: ${k}`, 404);
    return rec;
  }

  async list(input: {
    wallet: string;
    prefix?: unknown;
    scope?: unknown;
    limit?: number;
  }): Promise<{ keys: Array<Pick<MemoryRecord, "key" | "scope" | "bytes" | "updated_at" | "owner">>; count: number }> {
    const wallet = assertWallet(input.wallet);
    const prefix = assertPrefix(input.prefix);
    const scope = parseScope(input.scope, "private");
    const limit = Math.min(Math.max(1, input.limit ?? 50), MAX_LIST);

    let pathPrefix: string;
    if (scope === "public") {
      pathPrefix = storagePrefix("public", wallet, prefix);
    } else {
      pathPrefix = storagePrefix(scope, wallet, prefix);
    }

    const rows = await this.store.listByPrefix(pathPrefix, limit);
    const filtered = rows.filter((r) => r.owner === wallet && r.scope === scope);
    return {
      keys: filtered.map((r) => ({
        key: r.key,
        scope: r.scope,
        bytes: r.bytes,
        updated_at: r.updated_at,
        owner: r.owner,
      })),
      count: filtered.length,
    };
  }

  async forget(input: {
    wallet: string;
    key: unknown;
    scope?: unknown;
  }): Promise<{ deleted: boolean; key: string; scope: MemoryScope }> {
    const wallet = assertWallet(input.wallet);
    const key = assertKey(input.key);
    const scope = parseScope(input.scope, "private");
    const path = storagePath(scope, wallet, key);
    const existing = await this.store.get(path);
    if (!existing) {
      return { deleted: false, key, scope };
    }
    if (existing.owner !== wallet) {
      throw new MemoryError("FORBIDDEN", "Cross-tenant delete denied", 403);
    }
    await this.store.delete(path);
    return { deleted: true, key, scope };
  }
}

export function createIsolatedTestStore(): InMemoryStore {
  return new InMemoryStore(false);
}

export { parseStoragePath, publicListPrefix, storagePath };
