import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";
import { contentHash, RevisionContent } from "@sakhiline/contracts";

describe("Phase 5 Integration: Supervisor Reviews & Full Lifecycle (Integrations #7, #9 manual)", () => {
  let prisma: PrismaClient;
  let app: any;
  let contextStore: ContextStore;

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SUP_A = "00000000-0000-0000-0000-000000000020";
  const SUP_B = "00000000-0000-0000-0000-000000000021";
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

  async function createAndSubmitVisit() {
    const contextRes = await request(app)
      .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({});
    const { contextId } = contextRes.body;

    const createRes = await request(app)
      .post("/api/v1/visits")
      .set("x-fixture-actor-id", WORKER_A)
      .send({
        contextId,
        visitAt: "2026-10-19T10:00:00+05:30",
        visitTimezone: "Asia/Kolkata",
      });
    const visitId = createRes.body.visit.id;

    const editContent: RevisionContent = {
      visitAt: "2026-10-19T10:00:00+05:30",
      visitTimezone: "Asia/Kolkata",
      observations: {
        bloodPressure: {
          status: "recorded",
          systolic: 118,
          diastolic: 76,
          unit: "mmHg",
          source: { type: "manual" },
        },
        hemoglobin: {
          status: "recorded",
          value: "10.0",
          unit: "g/dL",
          source: { type: "manual" },
        },
        ttDose: { status: "not_measured" },
        followUpDate: { status: "not_mentioned" },
      },
      note: "Routine prenatal checkup",
      unresolvedAcknowledged: [],
    };

    const editRes = await request(app)
      .patch(`/api/v1/visits/${visitId}/draft`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("If-Match", `"visit:${visitId}:1"`)
      .send(editContent);
    expect(editRes.status).toBe(200);

    const hash = contentHash(editContent);
    const confirmRes = await request(app)
      .post(`/api/v1/visits/${visitId}/confirm`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("If-Match", `"visit:${visitId}:2"`)
      .send({
        revision: 2,
        contentHash: hash,
        unresolvedAcknowledged: [],
      });
    expect(confirmRes.status).toBe(200);

    const submitRes = await request(app)
      .post(`/api/v1/visits/${visitId}/submit`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("If-Match", `"visit:${visitId}:2"`)
      .set("Idempotency-Key", `idem-submit-${visitId}`)
      .send({ revision: 2 });
    expect(submitRes.status).toBe(200);

    return { visitId, revision: 2, content: editContent };
  }

  describe("Integration #7: Concurrent Approve vs Return Race", () => {
    it("two concurrent supervisor reviews on same revision yield one 200, one 409, and one review audit row", async () => {
      const { visitId, revision } = await createAndSubmitVisit();

      // Launch concurrent approve and return requests
      const approvePromise = request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_A)
        .set("If-Match", `"visit:${visitId}:${revision}"`)
        .set("Idempotency-Key", `idem-approve-race-${visitId}`)
        .send({ action: "approve", revision });

      const returnPromise = request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_A)
        .set("If-Match", `"visit:${visitId}:${revision}"`)
        .set("Idempotency-Key", `idem-return-race-${visitId}`)
        .send({ action: "return", revision, reason: "Please verify hemoglobin units" });

      const [resApprove, resReturn] = await Promise.all([approvePromise, returnPromise]);

      const statuses = [resApprove.status, resReturn.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Exactly ONE review audit row must exist
      const reviewAudits = await prisma.transitionAudit.findMany({
        where: {
          visitId,
          fromState: "submitted",
        },
      });
      expect(reviewAudits.length).toBe(1);
    });

    it("sup-b cannot review sup-a's assigned visit (returns 404)", async () => {
      const { visitId, revision } = await createAndSubmitVisit();

      const res = await request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_B)
        .set("If-Match", `"visit:${visitId}:${revision}"`)
        .set("Idempotency-Key", `idem-supb-unauth-${visitId}`)
        .send({ action: "approve", revision });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });

  describe("Integration #9: Full Lifecycle (Manual Path) & Audit Ordering", () => {
    it("select -> context -> create -> edit -> confirm -> submit -> return -> reopen -> confirm -> submit -> approve", async () => {
      // 1. Select & context
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      expect(contextRes.status).toBe(200);
      const { contextId } = contextRes.body;

      // 2. Create visit
      const createRes = await request(app)
        .post("/api/v1/visits")
        .set("x-fixture-actor-id", WORKER_A)
        .send({
          contextId,
          visitAt: "2026-10-19T10:00:00+05:30",
          visitTimezone: "Asia/Kolkata",
        });
      expect(createRes.status).toBe(201);
      const visitId = createRes.body.visit.id;
      expect(createRes.body.visit.currentRevision).toBe(1);

      // 3. Edit draft -> revision 2
      const contentRev2: RevisionContent = {
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
            value: "9.0",
            unit: "g/dL",
            source: { type: "manual" },
          },
          ttDose: { status: "not_measured" },
          followUpDate: { status: "not_mentioned" },
        },
        note: "Initial visit entry",
        unresolvedAcknowledged: [],
      };

      const editRes = await request(app)
        .patch(`/api/v1/visits/${visitId}/draft`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:1"`)
        .send(contentRev2);
      expect(editRes.status).toBe(200);

      // 4. Confirm revision 2
      const hashRev2 = contentHash(contentRev2);
      const confirmRes = await request(app)
        .post(`/api/v1/visits/${visitId}/confirm`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .send({
          revision: 2,
          contentHash: hashRev2,
          unresolvedAcknowledged: [],
        });
      expect(confirmRes.status).toBe(200);

      // 5. Submit revision 2
      const submitRes = await request(app)
        .post(`/api/v1/visits/${visitId}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .set("Idempotency-Key", `full-cycle-sub-1-${visitId}`)
        .send({ revision: 2 });
      expect(submitRes.status).toBe(200);

      // 6. Supervisor lists pending reviews
      const queueRes = await request(app)
        .get("/api/v1/reviews")
        .set("x-fixture-actor-id", SUP_A);
      expect(queueRes.status).toBe(200);
      const pendingIds = queueRes.body.reviews.map((r: any) => r.id);
      expect(pendingIds).toContain(visitId);

      // 7. Supervisor returns visit with reason
      const returnRes = await request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .set("Idempotency-Key", `full-cycle-ret-1-${visitId}`)
        .send({
          action: "return",
          revision: 2,
          reason: "Please verify hemoglobin value with lab slip",
        });
      expect(returnRes.status).toBe(200);
      expect(returnRes.body.visit.state).toBe("returned");

      // 8. Worker reopens returned visit -> creates revision 3
      const reopenRes = await request(app)
        .post(`/api/v1/visits/${visitId}/reopen`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .send({ revision: 2 });
      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.visit.state).toBe("draft");
      expect(reopenRes.body.visit.currentRevision).toBe(3);

      // 9. Worker corrects Hb to 9.5 -> creates revision 4
      const contentRev4: RevisionContent = {
        ...contentRev2,
        observations: {
          ...contentRev2.observations,
          hemoglobin: {
            status: "recorded",
            value: "9.5",
            unit: "g/dL",
            source: { type: "manual" },
          },
        },
        note: "Corrected Hb to 9.5 per lab slip",
      };

      const editRes2 = await request(app)
        .patch(`/api/v1/visits/${visitId}/draft`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:3"`)
        .send(contentRev4);
      expect(editRes2.status).toBe(200);
      expect(editRes2.body.visit.currentRevision).toBe(4);

      // 10. Fresh confirmation required for revision 4
      const hashRev4 = contentHash(contentRev4);
      const confirmRes2 = await request(app)
        .post(`/api/v1/visits/${visitId}/confirm`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:4"`)
        .send({
          revision: 4,
          contentHash: hashRev4,
          unresolvedAcknowledged: [],
        });
      expect(confirmRes2.status).toBe(200);

      // 11. Resubmit revision 4
      const submitRes2 = await request(app)
        .post(`/api/v1/visits/${visitId}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:4"`)
        .set("Idempotency-Key", `full-cycle-sub-2-${visitId}`)
        .send({ revision: 4 });
      expect(submitRes2.status).toBe(200);
      expect(submitRes2.body.visit.state).toBe("submitted");

      // 12. Supervisor approves revision 4
      const approveRes = await request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_A)
        .set("If-Match", `"visit:${visitId}:4"`)
        .set("Idempotency-Key", `full-cycle-app-1-${visitId}`)
        .send({ action: "approve", revision: 4 });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.visit.state).toBe("approved");

      // 13. Readback on approved visit
      const readbackRes = await request(app)
        .post(`/api/v1/visits/${visitId}/readback`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      expect(readbackRes.status).toBe(200);
      expect(readbackRes.body.readbackText).toContain("BP 120 by 80 mmHg.");
      expect(readbackRes.body.readbackText).toContain("Hemoglobin 9.5 g/dL.");

      // 14. Assert complete audit trail sequence
      const audits = await prisma.transitionAudit.findMany({
        where: { visitId },
        orderBy: { createdAt: "asc" },
      });

      const auditSequence = audits.map((a) => `${a.fromState}->${a.toState}`);
      expect(auditSequence).toEqual([
        "draft->draft", // create (rev 1)
        "draft->draft", // edit (rev 2)
        "draft->draft", // confirm (rev 2)
        "draft->submitted", // submit (rev 2)
        "submitted->returned", // return (rev 2)
        "returned->draft", // reopen (rev 3)
        "draft->draft", // edit (rev 4)
        "draft->draft", // confirm (rev 4)
        "draft->submitted", // submit (rev 4)
        "submitted->approved", // approve (rev 4)
      ]);
    });
  });
});
