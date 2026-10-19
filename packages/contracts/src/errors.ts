import { ErrorCode, ErrorEnvelope } from "./visit.js";
export { ErrorCode, ErrorEnvelope };

export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  STALE_REVISION: 409,
  IDEMPOTENCY_CONFLICT: 409,
  TOO_LARGE: 413,
  UNSUPPORTED_MEDIA: 415,
  UNRESOLVED_INPUT: 422,
  RATE_LIMITED: 429,
  PROVIDER_FAILURE: 502,
  TIMEOUT: 504,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? ERROR_STATUS_MAP[code] ?? 500;
  }

  toEnvelope(requestId: string): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
      requestId,
    };
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export const notFound = (message = "Resource not found"): AppError =>
  new AppError("NOT_FOUND", message);

export const forbidden = (message = "Access denied"): AppError =>
  new AppError("FORBIDDEN", message);

export const unauthenticated = (message = "Authentication required"): AppError =>
  new AppError("UNAUTHENTICATED", message);

export const staleRevision = (message = "Refresh this visit before retrying."): AppError =>
  new AppError("STALE_REVISION", message);

export const idempotencyConflict = (message = "Idempotency key reused with different request payload"): AppError =>
  new AppError("IDEMPOTENCY_CONFLICT", message);

export const validationError = (message: string): AppError =>
  new AppError("VALIDATION", message);

export const unresolvedInputError = (message: string): AppError =>
  new AppError("UNRESOLVED_INPUT", message);
