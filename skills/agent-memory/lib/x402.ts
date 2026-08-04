/**
 * x402 payment gating for agent-memory per-call ops.
 * Shape mirrors lvlltd.com /api/pay challenges (x402 v2, Base USDC).
 */

import {
  CHAIN_ID,
  NETWORK,
  NETWORK_CAIP2,
  PAY_TO,
  USDC_CONTRACT,
  USDC_DECIMALS,
  priceOp,
  type MemoryOp,
} from "./pricing.ts";
import { MemoryError } from "./errors.ts";

export interface PaymentProof {
  txHash?: string;
  skill?: string;
  op?: string;
  /** Demo-only path — never treated as mainnet settlement */
  dev?: boolean;
  scheme?: string;
}

export interface ChallengeBody {
  ok: false;
  error: "payment_required";
  error_code: "PAYMENT_REQUIRED";
  message: string;
  x402Version: 2;
  x402_version: "2";
  protocol: "x402";
  skill_id: "agent-memory";
  op: MemoryOp;
  amount: string;
  amount_usd: number;
  maxAmountRequired: string;
  payTo: string;
  network: string;
  network_caip2: string;
  chain_id: number;
  asset: "USDC";
  assetContract: string;
  decimals: number;
  accepts: Array<Record<string, unknown>>;
  resource: { url: string; description: string; mimeType: string };
  agent_flow: string[];
  note: string;
  breakdown?: Record<string, unknown>;
}

export function buildChallenge(
  op: MemoryOp,
  resourceUrl: string,
  opts?: { valueBytes?: number },
): ChallengeBody {
  const priced = priceOp(op, opts);
  const description = `agent-memory ${op} — per-call USDC on Base via x402`;
  return {
    ok: false,
    error: "payment_required",
    error_code: "PAYMENT_REQUIRED",
    message: `USDC payment on Base required for agent-memory.${op}`,
    x402Version: 2,
    x402_version: "2",
    protocol: "x402",
    skill_id: "agent-memory",
    op,
    amount: priced.amount_atomic,
    amount_usd: priced.amount_usd,
    maxAmountRequired: priced.amount_atomic,
    payTo: PAY_TO,
    network: NETWORK,
    network_caip2: NETWORK_CAIP2,
    chain_id: CHAIN_ID,
    asset: "USDC",
    assetContract: USDC_CONTRACT,
    decimals: USDC_DECIMALS,
    accepts: [
      {
        scheme: "exact",
        network: NETWORK_CAIP2,
        amount: priced.amount_atomic,
        maxAmountRequired: priced.amount_atomic,
        asset: USDC_CONTRACT,
        payTo: PAY_TO,
        maxTimeoutSeconds: 600,
        extra: {
          name: "USD Coin",
          version: "2",
          skill_id: "agent-memory",
          op,
          price_usd: priced.amount_usd,
          decimals: USDC_DECIMALS,
          standards: ["x402", "ERC-7857"],
        },
      },
    ],
    resource: {
      url: resourceUrl,
      description,
      mimeType: "application/json",
    },
    agent_flow: [
      `POST ${resourceUrl} without X-PAYMENT → HTTP 402 challenge`,
      `Transfer maxAmountRequired USDC (${priced.amount_atomic} atomic) to payTo on Base`,
      `Retry POST with X-PAYMENT: {"txHash":"0x…","skill":"agent-memory","op":"${op}"}`,
    ],
    note: "Best-effort storage service. Payment settles the call; durability is not SLA-backed in this tier.",
    ...(priced.breakdown
      ? {
          breakdown: {
            base_usd: priced.breakdown.base_usd,
            overage_kb: priced.breakdown.overage_kb,
            overage_usd: priced.breakdown.overage_usd,
            value_bytes: priced.breakdown.value_bytes,
            included_bytes: priced.breakdown.included_bytes,
          },
        }
      : {}),
  };
}

function parsePaymentHeader(raw: string | null): PaymentProof | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PaymentProof;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // bare tx hash fallback
    if (/^0x[a-fA-F0-9]{64}$/.test(raw)) return { txHash: raw, skill: "agent-memory" };
  }
  return null;
}

/**
 * Verify payment for an operation.
 *
 * Production path: caller supplies a Base tx hash; we require shape + optional
 * on-chain check via MEMORY_REQUIRE_ONCHAIN=1 (wired at the host).
 *
 * Demo path: X-PAYMENT {"dev":true,"op":"..."} when MEMORY_DEV_PAY is not "0".
 * Demo payments are labeled and never claimed as mainnet settlement.
 */
export async function requirePayment(
  request: Request,
  op: MemoryOp,
  resourceUrl: string,
  opts?: { valueBytes?: number },
): Promise<{ mode: "onchain" | "dev"; txHash?: string; amount_atomic: string; amount_usd: number }> {
  const priced = priceOp(op, opts);
  const proof = parsePaymentHeader(request.headers.get("x-payment"));

  if (!proof) {
    throw Object.assign(new MemoryError("PAYMENT_REQUIRED", "Payment required", 402), {
      challenge: buildChallenge(op, resourceUrl, opts),
    });
  }

  const devAllowed = process.env.MEMORY_DEV_PAY !== "0";
  if (proof.dev === true || proof.scheme === "dev") {
    if (!devAllowed) {
      throw new MemoryError(
        "PAYMENT_FAILURE",
        "Dev payment scheme is disabled in this environment",
        402,
      );
    }
    if (proof.op && proof.op !== op) {
      throw new MemoryError(
        "PAYMENT_FAILURE",
        `Dev payment op mismatch: expected ${op}, got ${proof.op}`,
        402,
      );
    }
    return {
      mode: "dev",
      amount_atomic: priced.amount_atomic,
      amount_usd: priced.amount_usd,
    };
  }

  if (!proof.txHash || !/^0x[a-fA-F0-9]{64}$/.test(proof.txHash)) {
    throw new MemoryError(
      "PAYMENT_FAILURE",
      "X-PAYMENT must include a valid 0x txHash (64 hex) or {dev:true} in demo mode",
      402,
    );
  }

  if (proof.skill && proof.skill !== "agent-memory") {
    throw new MemoryError(
      "PAYMENT_FAILURE",
      `Payment skill mismatch: expected agent-memory, got ${proof.skill}`,
      402,
    );
  }

  // Optional strict on-chain verification hook for production hosts
  if (process.env.MEMORY_REQUIRE_ONCHAIN === "1") {
    const verifier = process.env.MEMORY_TX_VERIFIER_URL;
    if (!verifier) {
      throw new MemoryError(
        "PAYMENT_FAILURE",
        "On-chain verification required but MEMORY_TX_VERIFIER_URL is not configured",
        500,
      );
    }
    const res = await fetch(verifier, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        txHash: proof.txHash,
        payTo: PAY_TO,
        asset: USDC_CONTRACT,
        amount: priced.amount_atomic,
        chainId: CHAIN_ID,
        skill: "agent-memory",
        op,
      }),
    });
    if (!res.ok) {
      throw new MemoryError(
        "PAYMENT_FAILURE",
        "On-chain payment verification failed",
        402,
        { txHash: proof.txHash },
      );
    }
  }

  return {
    mode: "onchain",
    txHash: proof.txHash,
    amount_atomic: priced.amount_atomic,
    amount_usd: priced.amount_usd,
  };
}

export function paymentErrorResponse(
  err: MemoryError & { challenge?: ChallengeBody },
): Response {
  if (err.code === "PAYMENT_REQUIRED" && err.challenge) {
    return Response.json(err.challenge, {
      status: 402,
      headers: {
        "X-Payment-Required": "true",
        "Cache-Control": "no-store",
      },
    });
  }
  return Response.json(err.toJSON(), { status: err.status });
}
