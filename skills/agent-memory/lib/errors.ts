export type MemoryErrorCode =
  | "PAYMENT_REQUIRED"
  | "PAYMENT_FAILURE"
  | "INVALID_SCOPE"
  | "MALFORMED_KEY"
  | "MALFORMED_VALUE"
  | "MALFORMED_PREFIX"
  | "INVALID_WALLET"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "STORAGE_FULL"
  | "STORAGE_ERROR"
  | "METHOD_NOT_ALLOWED"
  | "BAD_REQUEST";

export class MemoryError extends Error {
  readonly code: MemoryErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: MemoryErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "MemoryError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON() {
    return {
      ok: false as const,
      error: this.code.toLowerCase(),
      error_code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export function isMemoryError(e: unknown): e is MemoryError {
  return e instanceof MemoryError;
}
