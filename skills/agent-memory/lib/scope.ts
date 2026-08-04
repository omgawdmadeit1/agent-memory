import { MemoryError } from "./errors.ts";

export type MemoryScope = "private" | "shared" | "public";

const SCOPE_SET = new Set<MemoryScope>(["private", "shared", "public"]);

/** Keys: 1–128 chars, alphanumeric + . _ - / : */
const KEY_RE = /^[a-zA-Z0-9._\-:\/]{1,128}$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

export function parseScope(raw: unknown, fallback: MemoryScope = "private"): MemoryScope {
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw !== "string" || !SCOPE_SET.has(raw as MemoryScope)) {
    throw new MemoryError(
      "INVALID_SCOPE",
      `Invalid scope. Allowed: private | shared | public. Got: ${String(raw)}`,
      400,
      { allowed: ["private", "shared", "public"] },
    );
  }
  return raw as MemoryScope;
}

export function assertKey(key: unknown): string {
  if (typeof key !== "string" || !KEY_RE.test(key)) {
    throw new MemoryError(
      "MALFORMED_KEY",
      "Key must be 1–128 chars: alphanumeric, ., _, -, /, :",
      400,
      { pattern: KEY_RE.source },
    );
  }
  return key;
}

export function assertPrefix(prefix: unknown): string {
  if (prefix === undefined || prefix === null || prefix === "") return "";
  if (typeof prefix !== "string" || prefix.length > 128) {
    throw new MemoryError(
      "MALFORMED_PREFIX",
      "Prefix must be a string of at most 128 characters",
      400,
    );
  }
  // Prefix may be partial; allow empty or valid key-prefix chars
  if (!/^[a-zA-Z0-9._\-:\/]*$/.test(prefix)) {
    throw new MemoryError(
      "MALFORMED_PREFIX",
      "Prefix may only contain alphanumeric, ., _, -, /, :",
      400,
    );
  }
  return prefix;
}

export function assertWallet(wallet: unknown): string {
  if (typeof wallet !== "string" || !WALLET_RE.test(wallet)) {
    throw new MemoryError(
      "INVALID_WALLET",
      "Wallet must be a 0x-prefixed 40-hex address (caller identity)",
      400,
    );
  }
  return wallet.toLowerCase();
}

/**
 * Storage key namespace — isolation guarantee:
 * - private: mem:private:{wallet}:{key}  — only that wallet can read/write/list/delete
 * - shared:  mem:shared:{wallet}:{key}   — only that wallet (owner) for v1; future cross-agent pools flagged in SKILL.md
 * - public:  mem:public:{wallet}:{key}   — anyone may read; only owner wallet may write/delete
 *
 * Wallet is ALWAYS part of the storage path for writes. No tenant can address
 * another wallet's private/shared keys.
 */
export function storagePath(scope: MemoryScope, wallet: string, key: string): string {
  return `mem:${scope}:${wallet.toLowerCase()}:${key}`;
}

export function storagePrefix(scope: MemoryScope, wallet: string, prefix: string): string {
  return `mem:${scope}:${wallet.toLowerCase()}:${prefix}`;
}

/** Public list scans all public keys under optional key prefix (not wallet-bound for reads). */
export function publicListPrefix(prefix: string): string {
  return `mem:public:`;
}

export function parseStoragePath(path: string): {
  scope: MemoryScope;
  wallet: string;
  key: string;
} | null {
  const m = path.match(/^mem:(private|shared|public):(0x[a-f0-9]{40}):(.+)$/);
  if (!m) return null;
  return { scope: m[1] as MemoryScope, wallet: m[2], key: m[3] };
}
