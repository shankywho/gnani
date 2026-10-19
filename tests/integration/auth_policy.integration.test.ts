import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";
import { computeCsrfToken } from "../../apps/api/src/auth/session.js";

describe("Phase 3 Integration: Auth & Policy (Integrations #2, #3, #12)", () => {
  let prisma: PrismaClient;
  let simulatedTime = new Date("2026-10-19T10:00:00.000Z");
  const nowFn = () => simulatedTime;
  let contextStore: ContextStore;
  let app: any;

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const WORKER_B = "00000000-0000-0000-0000-000000000011";
  const SUP_A = "00000000-0000-0000-0000-000000000020";
  const SUP_B = "00000000-0000-0000-0000-000000000021";

  // Beneficiary SYN-0001 is assigned only to Worker A
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";
  // Beneficiary SYN-0007 is assigned only to Worker B
  const SYN_0007 = "00000000-0000-0000-0000-000000000107";

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    contextStore = new ContextStore(600, nowFn);
    app = createTestApp({
      prisma,
      contextStore,
      now: nowFn,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Integration #12: Auth & CSRF Boundaries", () => {
    it("returns 401 when no session / fixture header is provided", async () => {
      const res = await request(app).get("/api/v1/session");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 403 on mutation when CSRF token is missing", async () => {
      // First login via fixture to get session cookie
      const loginRes = await request(app)
        .post("/api/v1/session/fixture-login")
        .send({ actorId: WORKER_A });
      expect(loginRes.status).toBe(200);
      const cookie = loginRes.headers["set-cookie"] as unknown as string[];

      // Try mutation with session cookie but WITHOUT x-csrf-token header
      const res = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("Cookie", cookie)
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("ignores client role spoof headers", async () => {
      // Worker A sends x-role: supervisor, attempts supervisor-only behavior or check session
      const res = await request(app)
        .get("/api/v1/session")
        .set("x-fixture-actor-id", WORKER_A)
        .set("x-role", "supervisor");

      expect(res.status).toBe(200);
      expect(res.body.actor.role).toBe("worker"); // Server policy dictates role, not header
    });
  });

  describe("Integration #2: Cross-Worker and Cross-Supervisor Isolation", () => {
    it("worker-b cannot list worker-a's beneficiaries", async () => {
      const res = await request(app)
        .get("/api/v1/beneficiaries")
        .set("x-fixture-actor-id", WORKER_B);

      expect(res.status).toBe(200);
      const refs = res.body.beneficiaries.map((b: any) => b.reference);
      // Worker B should only see SYN-0007 and SYN-0008
      expect(refs).toContain("SYN-0007");
      expect(refs).toContain("SYN-0008");
      expect(refs).not.toContain("SYN-0001");
      expect(refs).not.toContain("SYN-0002");
    });

    it("worker-b cannot access worker-a's beneficiary context (returns 404 identical body)", async () => {
      const res = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_B)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Beneficiary not found");
    });

    it("non-existent beneficiary returns identical 404", async () => {
      const randomUuid = "99999999-9999-9999-9999-999999999999";
      const res = await request(app)
        .post(`/api/v1/beneficiaries/${randomUuid}/context`)
        .set("x-fixture-actor-id", WORKER_B)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(res.body.error.message).toBe("Beneficiary not found");
    });
  });

  describe("Integration #3: Context Validation & Expiry", () => {
    it("history without context returns 403", async () => {
      const res = await request(app)
        .get(`/api/v1/beneficiaries/${SYN_0001}/history`)
        .set("x-fixture-actor-id", WORKER_A);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("Missing identity context");
    });

    it("history with valid context returns historical visits", async () => {
      // Step 1: Worker A confirms context for SYN-0001
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      expect(contextRes.status).toBe(200);
      const { contextId } = contextRes.body;

      // Step 2: Request history with unexpired contextId
      const historyRes = await request(app)
        .get(`/api/v1/beneficiaries/${SYN_0001}/history?contextId=${contextId}`)
        .set("x-fixture-actor-id", WORKER_A);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.visits).toBeDefined();
      expect(historyRes.body.visits.length).toBe(3); // 3 historical visits seeded
    });

    it("history with expired context returns 403", async () => {
      // Step 1: Create context at T=0
      simulatedTime = new Date("2026-10-19T10:00:00.000Z");
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      const { contextId } = contextRes.body;

      // Step 2: Advance simulated time by 11 minutes (> 600s TTL)
      simulatedTime = new Date("2026-10-19T10:11:00.000Z");

      const historyRes = await request(app)
        .get(`/api/v1/beneficiaries/${SYN_0001}/history?contextId=${contextId}`)
        .set("x-fixture-actor-id", WORKER_A);

      expect(historyRes.status).toBe(403);
      expect(historyRes.body.error.code).toBe("FORBIDDEN");
      expect(historyRes.body.error.message).toContain("Invalid or expired identity context");
    });

    it("worker-b cannot use worker-a's contextId (returns 403)", async () => {
      // Reset time
      simulatedTime = new Date("2026-10-19T10:00:00.000Z");
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      const { contextId } = contextRes.body;

      // Worker B attempts to use Worker A's contextId
      const historyRes = await request(app)
        .get(`/api/v1/beneficiaries/${SYN_0001}/history?contextId=${contextId}`)
        .set("x-fixture-actor-id", WORKER_B);

      expect(historyRes.status).toBe(403);
    });
  });
});
