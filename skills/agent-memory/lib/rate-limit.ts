/**
 * In-process per-wallet rate limiter (sliding window).
 * Production: swap for Redis/Upstash using the same interface.
 */

export interface RateLimitConfig {
  /** Max calls per window */
  limit: number;
  /** Window length in ms */
  windowMs: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  remember: { limit: 60, windowMs: 60_000 },
  recall: { limit: 120, windowMs: 60_000 },
  list: { limit: 60, windowMs: 60_000 },
  forget: { limit: 60, windowMs: 60_000 },
};

type Bucket = { timestamps: number[] };

const globalRef = globalThis as typeof globalThis & {
  __agentMemoryRateLimit__?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalRef.__agentMemoryRateLimit__) {
    globalRef.__agentMemoryRateLimit__ = new Map();
  }
  return globalRef.__agentMemoryRateLimit__;
}

export function checkRateLimit(
  wallet: string,
  op: string,
  config: RateLimitConfig = DEFAULTS[op] ?? { limit: 60, windowMs: 60_000 },
): { ok: true } | { ok: false; retryAfterSec: number; limit: number } {
  const key = `${wallet.toLowerCase()}:${op}`;
  const now = Date.now();
  const map = store();
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    map.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < config.windowMs);
  if (bucket.timestamps.length >= config.limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec, limit: config.limit };
  }
  bucket.timestamps.push(now);
  return { ok: true };
}

export function resetRateLimits(): void {
  store().clear();
}

export { DEFAULTS as RATE_LIMIT_DEFAULTS };
