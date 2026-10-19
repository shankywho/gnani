import { describe, it, expect } from "vitest";
import {
  AppError,
  ERROR_STATUS_MAP,
  notFound,
  forbidden,
  unauthenticated,
  staleRevision,
  idempotencyConflict,
  validationError,
  unresolvedInputError,
  ErrorCode,
} from "../src/errors.js";
import { ErrorEnvelope } from "../src/visit.js";

describe("errors and status codes", () => {
  it("maps all ErrorCodes to valid HTTP status codes", () => {
    const codes = ErrorCode.options;
    for (const code of codes) {
      const status = ERROR_STATUS_MAP[code];
      expect(status).toBeDefined();
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });

  it("AppError creates valid ErrorEnvelope conforming to schema", () => {
    const err = new AppError("STALE_REVISION", "Refresh this visit before retrying.");
    expect(err.statusCode).toBe(409);
    const envelope = err.toEnvelope("req-12345");
    expect(envelope).toEqual({
      error: {
        code: "STALE_REVISION",
        message: "Refresh this visit before retrying.",
      },
      requestId: "req-12345",
    });
    expect(ErrorEnvelope.safeParse(envelope).success).toBe(true);
  });

  it("helper functions set expected defaults", () => {
    expect(notFound().statusCode).toBe(404);
    expect(forbidden().statusCode).toBe(403);
    expect(unauthenticated().statusCode).toBe(401);
    expect(staleRevision().statusCode).toBe(409);
    expect(idempotencyConflict().statusCode).toBe(409);
    expect(validationError("bad input").statusCode).toBe(400);
    expect(unresolvedInputError("unacknowledged").statusCode).toBe(422);
  });
});
