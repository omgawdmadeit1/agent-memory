/**
 * Isolation + pricing tests for agent-memory.
 * Run: npm run test:memory
 */

import assert from "node:assert/strict";
import {
  createIsolatedTestStore,
  MemoryService,
  SqlMemoryStore,
  storagePath,
  toIsoTimestamp,
  normalizeListLimit,
  WALLET_BYTE_QUOTA,
  MAX_VALUE_BYTES,
  MAX_LIST,
  DEFAULT_LIST_LIMIT,
  type MemoryRecord,
  type SqlRunner,
} from "../lib/storage.ts";
import { priceRemember, priceOp, usdToAtomic, PRICING } from "../lib/pricing.ts";
import { MemoryError } from "../lib/errors.ts";
import { resetRateLimits } from "../lib/rate-limit.ts";
import { createMemoryHandlers } from "../lib/handler.ts";

const W1 = "0x1111111111111111111111111111111111111111";
const W2 = "0x2222222222222222222222222222222222222222";

async function testIsolation() {
  const store = createIsolatedTestStore();
  const svc = new MemoryService(store);

  await svc.remember({ wallet: W1, key: "secret", value: "alpha-only", scope: "private" });
  await svc.remember({ wallet: W2, key: "secret", value: "beta-only", scope: "private" });

  const a = await svc.recall({ wallet: W1, key: "secret", scope: "private" });
  const b = await svc.recall({ wallet: W2, key: "secret", scope: "private" });
  assert.equal(a.value, "alpha-only");
  assert.equal(b.value, "beta-only");
  assert.notEqual(a.path, b.path);
  assert.equal(a.path, storagePath("private", W1, "secret"));

  const list2 = await svc.list({ wallet: W2, prefix: "", scope: "private" });
  assert.equal(list2.keys.every((k) => k.owner === W2.toLowerCase()), true);
  assert.equal(
    list2.keys.some((k) => k.key === "secret" && k.owner === W1.toLowerCase()),
    false,
  );

  const forgetMiss = await svc.forget({ wallet: W2, key: "secret", scope: "private" });
  assert.equal(forgetMiss.deleted, true);
  const stillThere = await svc.recall({ wallet: W1, key: "secret", scope: "private" });
  assert.equal(stillThere.value, "alpha-only");

  const list1 = await svc.list({ wallet: W1, scope: "private" });
  assert.equal(list1.count, 1);
  assert.equal(list1.keys[0]?.key, "secret");

  console.log("ok isolation");
}

async function testMalformed() {
  const store = createIsolatedTestStore();
  const svc = new MemoryService(store);

  await assert.rejects(
    () => svc.remember({ wallet: "not-a-wallet", key: "k", value: "v" }),
    (e: unknown) => e instanceof MemoryError && e.code === "INVALID_WALLET",
  );
  await assert.rejects(
    () => svc.remember({ wallet: W1, key: "bad key!!", value: "v" }),
    (e: unknown) => e instanceof MemoryError && e.code === "MALFORMED_KEY",
  );
  await assert.rejects(
    () => svc.remember({ wallet: W1, key: "k", value: "v", scope: "galaxy" }),
    (e: unknown) => e instanceof MemoryError && e.code === "INVALID_SCOPE",
  );
  await assert.rejects(
    () => svc.recall({ wallet: W1, key: "missing" }),
    (e: unknown) => e instanceof MemoryError && e.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => svc.remember({ wallet: W1, key: "huge", value: "x".repeat(MAX_VALUE_BYTES + 1) }),
    (e: unknown) => e instanceof MemoryError && e.code === "MALFORMED_VALUE",
  );

  console.log("ok malformed");
}

async function testQuota() {
  const store = createIsolatedTestStore();
  const svc = new MemoryService(store);
  const chunk = "x".repeat(MAX_VALUE_BYTES); // 64 KiB per value
  let wrote = 0;
  let hitFull = false;
  for (let i = 0; i < Math.ceil(WALLET_BYTE_QUOTA / MAX_VALUE_BYTES) + 2; i++) {
    try {
      await svc.remember({ wallet: W1, key: `bulk/${i}`, value: chunk });
      wrote++;
    } catch (e) {
      assert.ok(e instanceof MemoryError && e.code === "STORAGE_FULL", String(e));
      hitFull = true;
      break;
    }
  }
  assert.ok(wrote > 0);
  assert.ok(hitFull, "expected STORAGE_FULL before writing past wallet quota");
  console.log("ok quota (wrote", wrote, "chunks before full; quota", WALLET_BYTE_QUOTA, "bytes)");
}

function testToIsoTimestamp() {
  const d = new Date("2026-08-23T11:10:46.517Z");
  assert.equal(toIsoTimestamp(d), "2026-08-23T11:10:46.517Z");
  assert.equal(
    toIsoTimestamp("Sun Aug 23 2026 11:10:46 GMT+0000 (Coordinated Universal Time)"),
    "2026-08-23T11:10:46.000Z",
  );
  assert.equal(toIsoTimestamp("2026-08-23T11:10:46.517Z"), "2026-08-23T11:10:46.517Z");
  console.log("ok toIsoTimestamp");
}

/**
 * pg / PGLite return timestamptz as Date. The old mapper used String(date),
 * which Postgres rejects on the next upsert — updates of existing keys 500'd.
 */
async function testSqlTimestampUpsert() {
  const rows = new Map<string, MemoryRecord>();
  const sql: SqlRunner = {
    async query<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
      if (text.startsWith("select") && text.includes("where path = $1")) {
        const rec = rows.get(String(params[0]));
        if (!rec) return [] as T[];
        // Driver shape: Date objects, not ISO strings.
        return [
          {
            ...rec,
            created_at: new Date(rec.created_at),
            updated_at: new Date(rec.updated_at),
          },
        ] as T[];
      }
      if (text.includes("sum(bytes)")) {
        return [{ sum: 0 }] as T[];
      }
      if (text.startsWith("insert")) {
        const [path, scope, owner, key, value, bytes, created_at, updated_at] = params as [
          string,
          MemoryRecord["scope"],
          string,
          string,
          string,
          number,
          string,
          string,
        ];
        for (const ts of [created_at, updated_at]) {
          if (typeof ts === "string" && (ts.includes("GMT") || !ts.includes("T"))) {
            throw new Error(`invalid input syntax for type timestamp with time zone: "${ts}"`);
          }
        }
        rows.set(path, {
          path,
          scope,
          owner,
          key,
          value,
          bytes,
          created_at,
          updated_at,
        });
        return [] as T[];
      }
      return [] as T[];
    },
  };

  const svc = new MemoryService(new SqlMemoryStore(sql));
  const first = await svc.remember({ wallet: W1, key: "prefs", value: "v1" });
  assert.equal(first.value, "v1");
  assert.match(first.created_at, /^\d{4}-\d{2}-\d{2}T/);

  const updated = await svc.remember({ wallet: W1, key: "prefs", value: "v2" });
  assert.equal(updated.value, "v2");
  assert.equal(updated.created_at, first.created_at);
  assert.match(updated.updated_at, /^\d{4}-\d{2}-\d{2}T/);

  const recalled = await svc.recall({ wallet: W1, key: "prefs" });
  assert.equal(recalled.value, "v2");
  console.log("ok sql timestamp upsert");
}

function testNormalizeListLimit() {
  assert.equal(normalizeListLimit(undefined), DEFAULT_LIST_LIMIT);
  assert.equal(normalizeListLimit("abc"), DEFAULT_LIST_LIMIT);
  assert.equal(normalizeListLimit(Number.NaN), DEFAULT_LIST_LIMIT);
  assert.equal(normalizeListLimit("25"), 25);
  assert.equal(normalizeListLimit(0), 1);
  assert.equal(normalizeListLimit(999), MAX_LIST);
  console.log("ok normalizeListLimit");
}

async function testListNaNDoesNotHitSql() {
  const store = createIsolatedTestStore();
  const svc = new MemoryService(store);
  await svc.remember({ wallet: W1, key: "a", value: "one" });

  const listed = await svc.list({ wallet: W1, prefix: "", scope: "private", limit: Number("abc") });
  assert.equal(listed.count, 1);
  assert.equal(listed.keys[0]?.key, "a");
  console.log("ok list NaN limit");
}

function memoryRequest(
  path: string,
  opts: { method?: string; wallet?: string; payment?: unknown; body?: unknown },
): Request {
  const headers = new Headers();
  if (opts.wallet) headers.set("x-wallet", opts.wallet);
  if (opts.payment !== undefined) headers.set("x-payment", JSON.stringify(opts.payment));
  if (opts.body !== undefined) headers.set("content-type", "application/json");
  return new Request(`http://memory.test${path}`, {
    method: opts.method ?? "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function testValidateBeforePayment() {
  resetRateLimits();
  const handlers = createMemoryHandlers(() => createIsolatedTestStore());

  const badKey = await handlers.remember(
    memoryRequest("/api/memory/remember", {
      wallet: W1,
      body: { key: "bad key!!", value: "v" },
    }),
  );
  assert.equal(badKey.status, 400);
  const badKeyBody = (await badKey.json()) as { error_code: string };
  assert.equal(badKeyBody.error_code, "MALFORMED_KEY");

  const badScope = await handlers.recall(
    memoryRequest("/api/memory/recall", {
      wallet: W1,
      body: { key: "ok", scope: "galaxy" },
    }),
  );
  assert.equal(badScope.status, 400);
  const badScopeBody = (await badScope.json()) as { error_code: string };
  assert.equal(badScopeBody.error_code, "INVALID_SCOPE");

  const missingPay = await handlers.remember(
    memoryRequest("/api/memory/remember", {
      wallet: W1,
      body: { key: "ok", value: "v" },
    }),
  );
  assert.equal(missingPay.status, 402);

  const listed = await handlers.list(
    memoryRequest("/api/memory/list", {
      wallet: W1,
      payment: { dev: true, op: "list" },
      body: { prefix: "", scope: "private", limit: "abc" },
    }),
  );
  assert.equal(listed.status, 200);
  const listedBody = (await listed.json()) as { ok: boolean };
  assert.equal(listedBody.ok, true);
  console.log("ok validate-before-payment");
}

function testPricing() {
  const small = priceRemember(500);
  assert.equal(small.amount_usd, 0.002);
  assert.equal(small.amount_atomic, "2000");
  assert.equal(small.overage_kb, 0);

  const mid = priceRemember(1024 + 1);
  assert.equal(mid.overage_kb, 1);
  assert.equal(mid.amount_usd, 0.003);
  assert.equal(mid.amount_atomic, "3000");

  const big = priceRemember(1024 + 2048);
  assert.equal(big.overage_kb, 2);
  assert.equal(big.amount_usd, 0.004);

  assert.equal(priceOp("recall").amount_atomic, usdToAtomic(PRICING.recall_usd));
  assert.equal(priceOp("list").amount_atomic, "500");
  assert.equal(priceOp("forget").amount_atomic, "500");

  console.log("ok pricing");
}

async function main() {
  resetRateLimits();
  testPricing();
  testToIsoTimestamp();
  testNormalizeListLimit();
  await testIsolation();
  await testMalformed();
  await testQuota();
  await testSqlTimestampUpsert();
  await testListNaNDoesNotHitSql();
  await testValidateBeforePayment();
  console.log("\nAll agent-memory tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
