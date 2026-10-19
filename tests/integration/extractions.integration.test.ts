import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";
import { contentHash, RevisionContent } from "@sakhiline/contracts";
import { createStubStageClip, createStubTranscribe } from "../../apps/api/test-helpers/stubs.js";

describe("Phase 6 Integration: Extractions & Proposals (Integrations #8, #9 voice, #11)", () => {
  let prisma: PrismaClient;
  let contextStore: ContextStore;

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SUP_A = "00000000-0000-0000-0000-000000000020";
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    contextStore = new ContextStore(600);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createDraftVisit(appInstance: any) {
    const contextRes = await request(appInstance)
      .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({});
    expect(contextRes.status).toBe(200);
    const { contextId } = contextRes.body;

    const createRes = await request(appInstance)
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

  it("Integration #8: Late proposal accept after manual edit -> 409 STALE_REVISION, manual edit preserved", async () => {
    const app = createTestApp({ prisma, contextStore });
    const visit = await createDraftVisit(app);
    const visitId = visit.id;

    // 1. Worker triggers voice extraction based on revision 1
    const extractRes = await request(app)
      .post(`/api/v1/visits/${visitId}/extractions`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({
        audio: Buffer.from("mock audio").toString("base64"),
        mimeType: "audio/wav",
      });

    expect(extractRes.status).toBe(200);
    const proposal = extractRes.body.proposal;
    expect(proposal.baseRevision).toBe(1);
    const proposalId = proposal.proposalId;

    // 2. Meanwhile, worker manually edits the draft -> advances revision to 2
    const manualEditContent: RevisionContent = {
      visitAt: "2026-10-19T10:00:00+05:30",
      visitTimezone: "Asia/Kolkata",
      observations: {
        bloodPressure: {
          status: "recorded",
          systolic: 125,
          diastolic: 85,
          unit: "mmHg",
          source: { type: "manual" },
        },
        hemoglobin: {
          status: "recorded",
          value: "11.5",
          unit: "g/dL",
          source: { type: "manual" },
        },
        ttDose: { status: "not_mentioned" },
        followUpDate: { status: "not_mentioned" },
      },
      note: "Manual edit takes precedence",
      unresolvedAcknowledged: [],
    };

    const editRes = await request(app)
      .patch(`/api/v1/visits/${visitId}/draft`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("if-match", `W/"${visitId}:1"`)
      .send({ content: manualEditContent });

    expect(editRes.status).toBe(200);
    expect(editRes.body.visit.currentRevision).toBe(2);

    // 3. Worker tries to accept the late proposal (which was based on revision 1)
    // Even if client sends If-Match: W/"<id>:2" or W/"<id>:1", proposal.baseRevision === 1 != 2
    const lateAcceptRes = await request(app)
      .post(`/api/v1/visits/${visitId}/proposals/${proposalId}/accept`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("if-match", `W/"${visitId}:2"`)
      .send({ fields: ["bloodPressure"] });

    expect(lateAcceptRes.status).toBe(409);
    expect(lateAcceptRes.body.error.code).toBe("STALE_REVISION");

    // 4. Verify manual edit is preserved and current revision remains 2
    const getRes = await request(app)
      .get(`/api/v1/visits/${visitId}`)
      .set("x-fixture-actor-id", WORKER_A);

    expect(getRes.status).toBe(200);
    expect(getRes.body.currentRevision).toBe(2);
    expect(getRes.body.currentRevisionData.observations.hemoglobin.value).toBe("11.5");
    expect(getRes.body.currentRevisionData.note).toBe("Manual edit takes precedence");
  });

  it("Integration #9: Full Lifecycle (Voice Extraction Path) -> select -> context -> create -> extract -> accept -> confirm -> submit -> approve", async () => {
    const app = createTestApp({ prisma, contextStore });

    // Step 1: Select beneficiary & acquire context
    const contextRes = await request(app)
      .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({});
    expect(contextRes.status).toBe(200);
    const { contextId } = contextRes.body;

    // Step 2: Create visit
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

    // Step 3: Trigger voice extraction
    const extractRes = await request(app)
      .post(`/api/v1/visits/${visitId}/extractions`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({
        audio: Buffer.from("mock audio bytes").toString("base64"),
        mimeType: "audio/wav",
      });
    expect(extractRes.status).toBe(200);
    const proposal = extractRes.body.proposal;
    expect(proposal.observations.bloodPressure.status).toBe("recorded");
    expect(proposal.observations.bloodPressure.systolic).toBe(110);
    expect(proposal.observations.bloodPressure.diastolic).toBe(70);

    // Step 4: Accept proposal observations
    const acceptRes = await request(app)
      .post(`/api/v1/visits/${visitId}/proposals/${proposal.proposalId}/accept`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("if-match", `W/"${visitId}:1"`)
      .send({ fields: ["bloodPressure", "hemoglobin", "ttDose"] });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.visit.currentRevision).toBe(2);

    // Step 5: Confirm revision 2
    const currentRevData = acceptRes.body.revision;
    const rev2Content: RevisionContent = {
      visitAt: currentRevData.visitAt,
      visitTimezone: currentRevData.visitTimezone,
      observations: currentRevData.observations,
      note: currentRevData.note || undefined,
      transcript: currentRevData.transcript || undefined,
      unresolvedAcknowledged: [],
    };
    const cHash = contentHash(rev2Content);

    const confirmRes = await request(app)
      .post(`/api/v1/visits/${visitId}/confirm`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("if-match", `W/"${visitId}:2"`)
      .send({
        revision: 2,
        contentHash: cHash,
        unresolvedAcknowledged: [],
      });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.visit.confirmedAt).not.toBeNull();

    // Step 6: Readback check
    const readbackRes = await request(app)
      .post(`/api/v1/visits/${visitId}/readback`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({});
    expect(readbackRes.status).toBe(200);
    expect(readbackRes.body.readbackText).toContain("BP 110 by 70 mmHg");

    // Step 7: Submit visit
    const submitRes = await request(app)
      .post(`/api/v1/visits/${visitId}/submit`)
      .set("x-fixture-actor-id", WORKER_A)
      .set("if-match", `W/"${visitId}:2"`)
      .set("idempotency-key", `submit-voice-${visitId}`)
      .send({ revision: 2 });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.visit.state).toBe("submitted");

    // Step 8: Supervisor approves
    const reviewRes = await request(app)
      .post(`/api/v1/visits/${visitId}/reviews`)
      .set("x-fixture-actor-id", SUP_A)
      .set("if-match", `W/"${visitId}:2"`)
      .set("idempotency-key", `approve-voice-${visitId}`)
      .send({ action: "approve", revision: 2 });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.visit.state).toBe("approved");
  });

  it("Integration #11: Provider failure injection (TIMEOUT) -> 504 TIMEOUT, draft untouched, cleanup() called", async () => {
    let cleanupCalled = false;
    const mockStageClip = createStubStageClip(() => {
      cleanupCalled = true;
    });

    const mockTranscribeTimeout = createStubTranscribe({
      ok: false,
      code: "TIMEOUT",
      latencyMs: 15000,
    });

    const app = createTestApp({
      prisma,
      contextStore,
      stageClip: mockStageClip,
      transcribe: mockTranscribeTimeout,
    });

    const visit = await createDraftVisit(app);
    const visitId = visit.id;

    // Trigger extraction with injected TIMEOUT
    const extractRes = await request(app)
      .post(`/api/v1/visits/${visitId}/extractions`)
      .set("x-fixture-actor-id", WORKER_A)
      .send({
        audio: Buffer.from("audio bytes").toString("base64"),
        mimeType: "audio/wav",
      });

    expect(extractRes.status).toBe(504);
    expect(extractRes.body.error.code).toBe("TIMEOUT");

    // Verify cleanup() was called despite failure
    expect(cleanupCalled).toBe(true);

    // Verify draft visit is untouched
    const getRes = await request(app)
      .get(`/api/v1/visits/${visitId}`)
      .set("x-fixture-actor-id", WORKER_A);

    expect(getRes.status).toBe(200);
    expect(getRes.body.currentRevision).toBe(1);
    expect(getRes.body.state).toBe("draft");
  });
});
