/**
 * agent-memory — exact per-call USDC pricing (Base, 6 decimals).
 * These are the live rates returned by the API. Not estimates.
 */

export const USDC_DECIMALS = 6;
export const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const PAY_TO = "0xa00876513bAA433ce2B58A5341Fd06d2b6f9A6ED";
export const NETWORK = "base";
export const NETWORK_CAIP2 = "eip155:8453";
export const CHAIN_ID = 8453;

/** Free tier payload size included in the base remember fee (bytes). */
export const REMEMBER_INCLUDED_BYTES = 1024;

/** Exact prices in USD (for display). Atomic = USD * 10^6. */
export const PRICING = {
  remember_base_usd: 0.002,
  remember_overage_per_kb_usd: 0.001,
  recall_usd: 0.001,
  list_usd: 0.0005,
  forget_usd: 0.0005,
} as const;

export type MemoryOp = "remember" | "recall" | "list" | "forget";

export function usdToAtomic(usd: number): string {
  // USDC 6 decimals; round half-up to nearest atomic unit
  const atomic = Math.round(usd * 10 ** USDC_DECIMALS);
  return String(atomic);
}

export function atomicToUsd(atomic: string | number): number {
  const n = typeof atomic === "string" ? Number(atomic) : atomic;
  return n / 10 ** USDC_DECIMALS;
}

/** Bytes of UTF-8 payload for a string value. */
export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Compute exact remember price for a value size.
 * Base covers first REMEMBER_INCLUDED_BYTES; each additional full or partial KB
 * costs remember_overage_per_kb_usd.
 */
export function priceRemember(valueBytes: number): {
  amount_usd: number;
  amount_atomic: string;
  base_usd: number;
  overage_kb: number;
  overage_usd: number;
  value_bytes: number;
  included_bytes: number;
} {
  const overBytes = Math.max(0, valueBytes - REMEMBER_INCLUDED_BYTES);
  const overageKb = overBytes === 0 ? 0 : Math.ceil(overBytes / 1024);
  const overageUsd = overageKb * PRICING.remember_overage_per_kb_usd;
  const amountUsd = PRICING.remember_base_usd + overageUsd;
  return {
    amount_usd: amountUsd,
    amount_atomic: usdToAtomic(amountUsd),
    base_usd: PRICING.remember_base_usd,
    overage_kb: overageKb,
    overage_usd: overageUsd,
    value_bytes: valueBytes,
    included_bytes: REMEMBER_INCLUDED_BYTES,
  };
}

export function priceOp(
  op: MemoryOp,
  opts?: { valueBytes?: number },
): { amount_usd: number; amount_atomic: string; op: MemoryOp; breakdown?: ReturnType<typeof priceRemember> } {
  switch (op) {
    case "remember": {
      const b = priceRemember(opts?.valueBytes ?? 0);
      return { amount_usd: b.amount_usd, amount_atomic: b.amount_atomic, op, breakdown: b };
    }
    case "recall":
      return {
        amount_usd: PRICING.recall_usd,
        amount_atomic: usdToAtomic(PRICING.recall_usd),
        op,
      };
    case "list":
      return {
        amount_usd: PRICING.list_usd,
        amount_atomic: usdToAtomic(PRICING.list_usd),
        op,
      };
    case "forget":
      return {
        amount_usd: PRICING.forget_usd,
        amount_atomic: usdToAtomic(PRICING.forget_usd),
        op,
      };
  }
}

export function pricingTable() {
  return {
    skill_id: "agent-memory",
    currency: "USDC",
    network: NETWORK,
    network_caip2: NETWORK_CAIP2,
    chain_id: CHAIN_ID,
    asset_contract: USDC_CONTRACT,
    pay_to: PAY_TO,
    decimals: USDC_DECIMALS,
    model: "per_call",
    note: "Exact on-chain amounts. No subscription. No averages or 'starting at' pricing.",
    operations: {
      remember: {
        base_usd: PRICING.remember_base_usd,
        base_atomic: usdToAtomic(PRICING.remember_base_usd),
        included_bytes: REMEMBER_INCLUDED_BYTES,
        overage_per_kb_usd: PRICING.remember_overage_per_kb_usd,
        overage_per_kb_atomic: usdToAtomic(PRICING.remember_overage_per_kb_usd),
        description:
          "Write a key. First 1KB included in base fee; each additional KB (ceil) billed at overage rate.",
      },
      recall: {
        flat_usd: PRICING.recall_usd,
        flat_atomic: usdToAtomic(PRICING.recall_usd),
        description: "Read a key. Flat fee per call.",
      },
      list: {
        flat_usd: PRICING.list_usd,
        flat_atomic: usdToAtomic(PRICING.list_usd),
        description: "List keys under a prefix. Flat fee per call.",
      },
      forget: {
        flat_usd: PRICING.forget_usd,
        flat_atomic: usdToAtomic(PRICING.forget_usd),
        description: "Delete a key. Flat fee per call.",
      },
    },
  };
}
