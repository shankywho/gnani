import { describe, it, expect } from "vitest";
import { assertRole } from "../../apps/api/src/policy/assignments.js";
import { Actor, AppError } from "@sakhiline/contracts";

describe("policy: deny-by-default matrix", () => {
  const workerActor: Actor = {
    id: "00000000-0000-0000-0000-000000000010",
    organizationId: "00000000-0000-0000-0000-000000000001",
    role: "worker",
  };

  const supervisorActor: Actor = {
    id: "00000000-0000-0000-0000-000000000020",
    organizationId: "00000000-0000-0000-0000-000000000001",
    role: "supervisor",
  };

  it("throws 401 UNAUTHENTICATED when actor is null", () => {
    expect(() => assertRole(null, "worker")).toThrowError(AppError);
    try {
      assertRole(null, "worker");
    } catch (e: any) {
      expect(e.code).toBe("UNAUTHENTICATED");
      expect(e.statusCode).toBe(401);
    }
  });

  it("throws 403 FORBIDDEN when actor role does not match required role", () => {
    expect(() => assertRole(workerActor, "supervisor")).toThrowError(AppError);
    try {
      assertRole(workerActor, "supervisor");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
      expect(e.statusCode).toBe(403);
    }

    expect(() => assertRole(supervisorActor, "worker")).toThrowError(AppError);
    try {
      assertRole(supervisorActor, "worker");
    } catch (e: any) {
      expect(e.code).toBe("FORBIDDEN");
      expect(e.statusCode).toBe(403);
    }
  });

  it("passes when role matches", () => {
    expect(() => assertRole(workerActor, "worker")).not.toThrow();
    expect(() => assertRole(supervisorActor, "supervisor")).not.toThrow();
  });
});
