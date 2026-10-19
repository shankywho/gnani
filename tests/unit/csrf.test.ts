import { describe, it, expect } from "vitest";
import { csrfProtection } from "../../apps/api/src/auth/csrf.js";
import { computeCsrfToken } from "../../apps/api/src/auth/session.js";
import { AppError } from "@sakhiline/contracts";

describe("csrf: protection rules", () => {
  const csrfSecret = "test-csrf-secret-1234";
  const validToken = computeCsrfToken(csrfSecret);

  it("allows safe GET/HEAD/OPTIONS methods without token", () => {
    let nextCalled = false;
    const req = { method: "GET", headers: {} } as any;
    csrfProtection(req, {} as any, (err?: any) => {
      expect(err).toBeUndefined();
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
  });

  it("rejects POST mutation when CSRF token is missing with 403", () => {
    let capturedErr: any = null;
    const req = {
      method: "POST",
      headers: {},
      session: { csrfSecret },
    } as any;

    csrfProtection(req, {} as any, (err?: any) => {
      capturedErr = err;
    });

    expect(capturedErr).toBeInstanceOf(AppError);
    expect(capturedErr.statusCode).toBe(403);
    expect(capturedErr.code).toBe("FORBIDDEN");
  });

  it("rejects POST mutation when CSRF token is invalid with 403", () => {
    let capturedErr: any = null;
    const req = {
      method: "POST",
      headers: { "x-csrf-token": "wrong-token-value" },
      session: { csrfSecret },
    } as any;

    csrfProtection(req, {} as any, (err?: any) => {
      capturedErr = err;
    });

    expect(capturedErr).toBeInstanceOf(AppError);
    expect(capturedErr.statusCode).toBe(403);
    expect(capturedErr.code).toBe("FORBIDDEN");
  });

  it("allows POST mutation when CSRF token is valid", () => {
    let nextCalled = false;
    const req = {
      method: "POST",
      headers: { "x-csrf-token": validToken },
      session: { csrfSecret },
    } as any;

    csrfProtection(req, {} as any, (err?: any) => {
      expect(err).toBeUndefined();
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });
});
