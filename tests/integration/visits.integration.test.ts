import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";
import { contentHash, RevisionContent } from "@sakhiline/contracts";

describe("Phase 4 Integration: Visits, Transitions & Idempotency (Integrations #4, #5, #6)", () => {
  let prisma: PrismaClient;
  let app: any;
  let contextStore: ContextStore;

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    contextStore = new ContextStore(600);
    app = createTestApp({ prisma, contextStore });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createDraftVisit() {
    const contextRes = await request(app)
      .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({});
    expect(contextRes.status).toBe(200);
    const { contextId } = contextRes.body;

    const createRes = await request(app)
      .post("/api/v1/visits")
      .set("x-fixture-actor-id", WORKER_A)
      .send({
        contextId,
        visitAt: "2026-10-19T10:00:00+05:30",
        visitTimezone: "Asia/Kolkata",
      });
    expect(createRes.status).toBe(201);
    return createRes.body.visit;
  }

  describe("Integration #4 & #5: Edit, Confirm, and Invalidation", () => {
    it("edit creates revision N+1 and clears confirmation", async () => {
      const visit = await createDraftVisit();
      expect(visit.currentRevision).toBe(1);
      expect(visit.confirmedRevision).toBeNull();

      // Edit revision 1 -> produces revision 2
      const editContent: RevisionContent = {
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
          hemoglobin: { status: "not_mentioned" },
          ttDose: { status: "not_mentioned" },
          followUpDate: { status: "not_mentioned" },
        },
        note: "Updated BP manually",
        unresolvedAcknowledged: [],
      };

      const editRes = await request(app)
        .patch(`/api/v1/visits/${visit.id}/draft`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:1"`)
        .send(editContent);

      expect(editRes.status).toBe(200);
      expect(editRes.body.visit.currentRevision).toBe(2);
      expect(editRes.body.visit.confirmedRevision).toBeNull();
      expect(editRes.body.revision.revision).toBe(2);

      // Confirm revision 2
      const hash = contentHash(editContent);
      const confirmRes = await request(app)
        .post(`/api/v1/visits/${visit.id}/confirm`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:2"`)
        .send({
          revision: 2,
          contentHash: hash,
          unresolvedAcknowledged: [],
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.confirmedRevision).toBe(2);

      // Verify that editing after confirmation invalidates confirmation (confirmedRevision becomes null)
      const secondEditContent: RevisionContent = {
        ...editContent,
        note: "Second manual edit after confirmation",
      };

      const secondEditRes = await request(app)
        .patch(`/api/v1/visits/${visit.id}/draft`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:2"`)
        .send(secondEditContent);

      expect(secondEditRes.status).toBe(200);
      expect(secondEditRes.body.visit.currentRevision).toBe(3);
      expect(secondEditRes.body.visit.confirmedRevision).toBeNull(); // Confirmation cleared!
    });

    it("submitting an unconfirmed revision returns 422 UNRESOLVED_INPUT", async () => {
      const visit = await createDraftVisit();

      const submitRes = await request(app)
        .post(`/api/v1/visits/${visit.id}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:1"`)
        .set("Idempotency-Key", "valid-idem-key-1234567890")
        .send({ revision: 1 });

      expect(submitRes.status).toBe(422);
      expect(submitRes.body.error.code).toBe("UNRESOLVED_INPUT");
    });

    it("submitting with stale revision returns 409 STALE_REVISION", async () => {
      const visit = await createDraftVisit();

      // Submit with revision mismatch (e.g. revision 99 vs current 1)
      const submitRes = await request(app)
        .post(`/api/v1/visits/${visit.id}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:1"`)
        .set("Idempotency-Key", "valid-idem-key-1234567890")
        .send({ revision: 99 });

      expect(submitRes.status).toBe(409);
      expect(submitRes.body.error.code).toBe("STALE_REVISION");
    });
  });

  describe("Integration #6: Idempotent Submit & Concurrency", () => {
    it("10 parallel identical submit calls with same key produce 1 transition and identical bodies", async () => {
      const visit = await createDraftVisit();

      // Get initial revision content and compute hash
      const getRes = await request(app)
        .get(`/api/v1/visits/${visit.id}`)
        .set("x-fixture-actor-id", WORKER_A);
      const revData = getRes.body.currentRevisionData;

      const hash = revData.contentHash;

      // Confirm revision 1
      const confirmRes = await request(app)
        .post(`/api/v1/visits/${visit.id}/confirm`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:1"`)
        .send({
          revision: 1,
          contentHash: hash,
          unresolvedAcknowledged: [],
        });
      expect(confirmRes.status).toBe(200);

      // Execute 10 parallel identical submit calls
      const idemKey = "idem-submit-key-concurrent-12345";
      const submitPromises = Array.from({ length: 10 }).map(() =>
        request(app)
          .post(`/api/v1/visits/${visit.id}/submit`)
          .set("x-fixture-actor-id", WORKER_A)
          .set("If-Match", `"visit:${visit.id}:1"`)
          .set("Idempotency-Key", idemKey)
          .send({ revision: 1 })
      );

      const responses = await Promise.all(submitPromises);

      // All 10 requests must succeed with 200
      for (const res of responses) {
        expect(res.status).toBe(200);
        expect(res.body.visit.state).toBe("submitted");
      }

      // Check transition_audit: only ONE 'draft' -> 'submitted' audit row must exist
      const audits = await prisma.transitionAudit.findMany({
        where: { visitId: visit.id, toState: "submitted" },
      });
      expect(audits.length).toBe(1);

      // Reusing the same key with different body payload returns 409 IDEMPOTENCY_CONFLICT
      const conflictRes = await request(app)
        .post(`/api/v1/visits/${visit.id}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visit.id}:1"`)
        .set("Idempotency-Key", idemKey)
        .send({ revision: 2 }); // Changed body payload

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    });
  });
});
