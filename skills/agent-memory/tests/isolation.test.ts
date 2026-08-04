/**
 * Isolation + pricing tests for agent-memory.
 * Run: npm run test:memory
 */

import assert from "node:assert/strict";
import {
  createIsolatedTestStore,
  MemoryService,
  storagePath,
  WALLET_BYTE_QUOTA,
  MAX_VALUE_BYTES,
} from "../lib/storage.ts";
import { priceRemember, priceOp, usdToAtomic, PRICING } from "../lib/pricing.ts";
import { MemoryError } from "../lib/errors.ts";
import { resetRateLimits } from "../lib/rate-limit.ts";

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
  await testIsolation();
  await testMalformed();
  await testQuota();
  console.log("\nAll agent-memory tests passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
