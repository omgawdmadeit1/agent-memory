/**
 * Shared HTTP handler core used by Next.js routes and TanStack Start routes.
 */

import { MemoryError, isMemoryError } from "./errors.ts";
import { checkRateLimit } from "./rate-limit.ts";
import { priceRemember, utf8Bytes, type MemoryOp } from "./pricing.ts";
import { assertWallet } from "./scope.ts";
import { MemoryService, type MemoryStore } from "./storage.ts";
import { buildChallenge, paymentErrorResponse, requirePayment } from "./x402.ts";

export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

export function getWallet(request: Request): string {
  const h =
    request.headers.get("x-wallet") ??
    request.headers.get("x-caller-wallet") ??
    request.headers.get("x-agent-wallet");
  return assertWallet(h);
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get("content-type") ?? "";
  if (request.method === "GET" || request.method === "HEAD") {
    const url = new URL(request.url);
    return Object.fromEntries(url.searchParams.entries());
  }
  if (!ct.includes("application/json")) {
    // allow empty body
    try {
      return (await request.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new MemoryError("BAD_REQUEST", "Request body must be valid JSON", 400);
  }
}

function handleError(err: unknown): Response {
  if (isMemoryError(err)) {
    if (err.code === "PAYMENT_REQUIRED") {
      return paymentErrorResponse(err as MemoryError & { challenge?: ReturnType<typeof buildChallenge> });
    }
    return json(err.toJSON(), err.status);
  }
  console.error("[agent-memory]", err);
  return json(
    {
      ok: false,
      error: "storage_error",
      error_code: "STORAGE_ERROR",
      message: "Unexpected storage error",
    },
    500,
  );
}

async function gate(
  request: Request,
  op: MemoryOp,
  resourceUrl: string,
  opts?: { valueBytes?: number },
) {
  const wallet = getWallet(request);
  const rl = checkRateLimit(wallet, op);
  if (!rl.ok) {
    throw new MemoryError("RATE_LIMITED", "Per-wallet rate limit exceeded", 429, {
      retry_after_sec: rl.retryAfterSec,
      limit: rl.limit,
    });
  }
  const payment = await requirePayment(request, op, resourceUrl, opts);
  return { wallet, payment };
}

export function createMemoryHandlers(getStore: () => Promise<MemoryStore> | MemoryStore) {
  const serviceOf = async () => new MemoryService(await getStore());

  return {
    async remember(request: Request): Promise<Response> {
      try {
        if (request.method !== "POST") {
          throw new MemoryError("METHOD_NOT_ALLOWED", "POST only", 405);
        }
        const body = await readBody(request);
        const value = typeof body.value === "string" ? body.value : "";
        const valueBytes = utf8Bytes(value);
        const resourceUrl = new URL(request.url).pathname;
        const { wallet, payment } = await gate(request, "remember", resourceUrl, { valueBytes });
        const svc = await serviceOf();
        const rec = await svc.remember({
          wallet,
          key: body.key,
          value: body.value,
          scope: body.scope,
        });
        return json({
          ok: true,
          op: "remember",
          key: rec.key,
          scope: rec.scope,
          bytes: rec.bytes,
          updated_at: rec.updated_at,
          payment: {
            mode: payment.mode,
            amount_usd: payment.amount_usd,
            amount_atomic: payment.amount_atomic,
            txHash: payment.txHash ?? null,
          },
          pricing: priceRemember(valueBytes),
        });
      } catch (err) {
        return handleError(err);
      }
    },

    async recall(request: Request): Promise<Response> {
      try {
        if (request.method !== "POST" && request.method !== "GET") {
          throw new MemoryError("METHOD_NOT_ALLOWED", "GET or POST", 405);
        }
        const body = await readBody(request);
        const resourceUrl = new URL(request.url).pathname;
        const { wallet, payment } = await gate(request, "recall", resourceUrl);
        const svc = await serviceOf();
        const rec = await svc.recall({
          wallet,
          key: body.key,
          scope: body.scope,
        });
        return json({
          ok: true,
          op: "recall",
          key: rec.key,
          scope: rec.scope,
          value: rec.value,
          bytes: rec.bytes,
          updated_at: rec.updated_at,
          payment: {
            mode: payment.mode,
            amount_usd: payment.amount_usd,
            amount_atomic: payment.amount_atomic,
            txHash: payment.txHash ?? null,
          },
        });
      } catch (err) {
        return handleError(err);
      }
    },

    async list(request: Request): Promise<Response> {
      try {
        if (request.method !== "POST" && request.method !== "GET") {
          throw new MemoryError("METHOD_NOT_ALLOWED", "GET or POST", 405);
        }
        const body = await readBody(request);
        const resourceUrl = new URL(request.url).pathname;
        const { wallet, payment } = await gate(request, "list", resourceUrl);
        const svc = await serviceOf();
        const result = await svc.list({
          wallet,
          prefix: body.prefix,
          scope: body.scope,
          limit: body.limit ? Number(body.limit) : undefined,
        });
        return json({
          ok: true,
          op: "list",
          ...result,
          payment: {
            mode: payment.mode,
            amount_usd: payment.amount_usd,
            amount_atomic: payment.amount_atomic,
            txHash: payment.txHash ?? null,
          },
        });
      } catch (err) {
        return handleError(err);
      }
    },

    async forget(request: Request): Promise<Response> {
      try {
        if (request.method !== "POST" && request.method !== "DELETE") {
          throw new MemoryError("METHOD_NOT_ALLOWED", "POST or DELETE", 405);
        }
        const body = await readBody(request);
        const resourceUrl = new URL(request.url).pathname;
        const { wallet, payment } = await gate(request, "forget", resourceUrl);
        const svc = await serviceOf();
        const result = await svc.forget({
          wallet,
          key: body.key,
          scope: body.scope,
        });
        return json({
          ok: true,
          op: "forget",
          ...result,
          payment: {
            mode: payment.mode,
            amount_usd: payment.amount_usd,
            amount_atomic: payment.amount_atomic,
            txHash: payment.txHash ?? null,
          },
        });
      } catch (err) {
        return handleError(err);
      }
    },
  };
}
