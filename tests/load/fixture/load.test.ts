import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../../helpers/testApp.js";
import { ContextStore } from "../../../apps/api/src/auth/contextStore.js";
import { contentHash, RevisionContent } from "@sakhiline/contracts";

describe("Phase 8 Fixture Load Test (§14 Integration #14)", () => {
  let prisma: PrismaClient;
  let contextStore: ContextStore;
  let app: any;

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    contextStore = new ContextStore(600);
    app = createTestApp({ prisma, contextStore });
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(
    "Integration #14: 200 concurrent reads + 50 concurrent distinct submits complete without deadlock or duplicate",
    async () => {
      // Step A: Prepare 50 confirmed draft visits for distinct submits
      // We will create context once and then create 50 visits
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      expect(contextRes.status).toBe(200);
      const { contextId } = contextRes.body;

      const visitIds: string[] = [];
      const contentHashes: string[] = [];

      // Create 50 distinct visits in parallel chunks
      const createPromises = Array.from({ length: 50 }, async (_, i) => {
        const createRes = await request(app)
          .post("/api/v1/visits")
          .set("x-fixture-actor-id", WORKER_A)
          .send({
            contextId,
            visitAt: "2026-10-19T10:00:00+05:30",
            visitTimezone: "Asia/Kolkata",
          });
        expect(createRes.status).toBe(201);
        const vId = createRes.body.visit.id;

        const revContent: RevisionContent = {
          visitAt: "2026-10-19T10:00:00+05:30",
          visitTimezone: "Asia/Kolkata",
          observations: {
            bloodPressure: {
              status: "recorded",
              systolic: 120,
              diastolic: 80,
              unit: "mmHg",
              source: { type: "manual" },
            },
            hemoglobin: {
              status: "recorded",
              value: "10.0",
              unit: "g/dL",
              source: { type: "manual" },
            },
            ttDose: { status: "not_mentioned" },
            followUpDate: { status: "not_mentioned" },
          },
          note: `Load test visit ${i}`,
          unresolvedAcknowledged: [],
        };
        const cHash = contentHash(revContent);

        // Edit draft to revision 2
        const editRes = await request(app)
          .patch(`/api/v1/visits/${vId}/draft`)
          .set("x-fixture-actor-id", WORKER_A)
          .set("If-Match", `"visit:${vId}:1"`)
          .send(revContent);
        expect(editRes.status).toBe(200);

        // Confirm revision 2
        const confirmRes = await request(app)
          .post(`/api/v1/visits/${vId}/confirm`)
          .set("x-fixture-actor-id", WORKER_A)
          .set("If-Match", `"visit:${vId}:2"`)
          .send({
            revision: 2,
            contentHash: cHash,
            unresolvedAcknowledged: [],
          });
        expect(confirmRes.status).toBe(200);

        return vId;
      });

      const preparedVisitIds = await Promise.all(createPromises);
      expect(preparedVisitIds).toHaveLength(50);

      // Pick a sample visit for the 200 concurrent reads
      const sampleVisitId = preparedVisitIds[0]!;

      // Step B: Concurrently trigger 200 reads AND 50 distinct submits simultaneously
      const readPromises = Array.from({ length: 200 }, async (_, idx) => {
        const targetVisitId = preparedVisitIds[idx % 50]!;
        const res = await request(app)
          .get(`/api/v1/visits/${targetVisitId}`)
          .set("x-fixture-actor-id", WORKER_A);
        return res.status;
      });

      const submitPromises = preparedVisitIds.map(async (vId, idx) => {
        const res = await request(app)
          .post(`/api/v1/visits/${vId}/submit`)
          .set("x-fixture-actor-id", WORKER_A)
          .set("If-Match", `"visit:${vId}:2"`)
          .set("Idempotency-Key", `load-test-submit-${vId}-${idx}`)
          .send({ revision: 2 });
        return { status: res.status, visitId: vId, body: res.body };
      });

      // Execute all 250 concurrent operations in parallel
      const [readStatuses, submitResults] = await Promise.all([
        Promise.all(readPromises),
        Promise.all(submitPromises),
      ]);

      // Assert all 200 reads completed with status 200
      expect(readStatuses).toHaveLength(200);
      for (const st of readStatuses) {
        expect(st).toBe(200);
      }

      // Assert all 50 submits completed with status 200 and state "submitted"
      expect(submitResults).toHaveLength(50);
      for (const res of submitResults) {
        expect(res.status).toBe(200);
        expect(res.body.visit.state).toBe("submitted");
        expect(res.body.visit.currentRevision).toBe(2);
      }

      // Verify in DB that all 50 visits are in state "submitted"
      const submittedVisitsInDb = await prisma.visit.findMany({
        where: { id: { in: preparedVisitIds } },
      });

      expect(submittedVisitsInDb).toHaveLength(50);
      for (const v of submittedVisitsInDb) {
        expect(v.state).toBe("submitted");
      }
    },
    60000
  );
});
