import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { getPrismaClient, seed, PrismaClient } from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";
import { ContextStore } from "../../apps/api/src/auth/contextStore.js";
import { RevisionContent } from "@sakhiline/contracts";

describe("Phase 8 Log Capture Test (§11, §14 Integration #13)", () => {
  let prisma: PrismaClient;
  let contextStore: ContextStore;

  const capturedLogs: Array<Record<string, any>> = [];
  const rawLogStrings: string[] = [];

  const WORKER_A = "00000000-0000-0000-0000-000000000010";
  const SUP_A = "00000000-0000-0000-0000-000000000020";
  const SYN_0001 = "00000000-0000-0000-0000-000000000101";

  // Distinct sensitive test fixture strings that must NEVER leak into log output
  const SENSITIVE_TRANSCRIPT_SUBSTRING = "ConfidentialBeneficiaryTranscript12345";
  const SENSITIVE_NOTE_SUBSTRING = "PatientComplainedOfSevereSecretCondition";

  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    contextStore = new ContextStore(600);

    // Custom verifier with captured logger in requestContext
    app = createTestApp({
      prisma,
      contextStore,
      extraRouters: [],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Integration #13: Full lifecycle structured logging verifies zero transcript or note leakage", async () => {
    // Intercept console.log and console.info to capture all structured logs during the run
    const originalLog = console.log;
    const originalInfo = console.info;

    try {
      console.log = (message?: any, ...optionalParams: any[]) => {
        if (typeof message === "string") {
          rawLogStrings.push(message);
          try {
            capturedLogs.push(JSON.parse(message));
          } catch {
            // Non-JSON
          }
        }
        originalLog(message, ...optionalParams);
      };

      console.info = console.log;

      // 1. Acquire Context
      const contextRes = await request(app)
        .post(`/api/v1/beneficiaries/${SYN_0001}/context`)
        .set("x-fixture-actor-id", WORKER_A)
        .send({});
      expect(contextRes.status).toBe(200);
      const { contextId } = contextRes.body;

      // 2. Create Visit
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

      // 3. Edit Draft with sensitive note and transcript
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
          hemoglobin: {
            status: "recorded",
            value: "10.0",
            unit: "g/dL",
            source: { type: "manual" },
          },
          ttDose: { status: "not_mentioned" },
          followUpDate: { status: "not_mentioned" },
        },
        note: SENSITIVE_NOTE_SUBSTRING,
        transcript: SENSITIVE_TRANSCRIPT_SUBSTRING,
        unresolvedAcknowledged: [],
      };

      const editRes = await request(app)
        .patch(`/api/v1/visits/${visitId}/draft`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:1"`)
        .send(editContent);
      expect(editRes.status).toBe(200);

      // 4. Confirm Revision 2
      const confirmRes = await request(app)
        .post(`/api/v1/visits/${visitId}/confirm`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .send({
          revision: 2,
          contentHash: editRes.body.revision.contentHash,
          unresolvedAcknowledged: [],
        });
      expect(confirmRes.status).toBe(200);

      // 5. Submit Visit
      const submitRes = await request(app)
        .post(`/api/v1/visits/${visitId}/submit`)
        .set("x-fixture-actor-id", WORKER_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .set("Idempotency-Key", `idem-log-capture-${visitId}`)
        .send({ revision: 2 });
      expect(submitRes.status).toBe(200);

      // 6. Supervisor Review (Approve)
      const reviewRes = await request(app)
        .post(`/api/v1/visits/${visitId}/reviews`)
        .set("x-fixture-actor-id", SUP_A)
        .set("If-Match", `"visit:${visitId}:2"`)
        .set("Idempotency-Key", `idem-log-review-${visitId}`)
        .send({ action: "approve", revision: 2 });
      expect(reviewRes.status).toBe(200);
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
    }

    // Assert that operations were logged with required structured keys
    const operationsLogged = capturedLogs.map((l) => l.op).filter(Boolean);
    expect(operationsLogged).toContain("createVisit");
    expect(operationsLogged).toContain("editDraft");
    expect(operationsLogged).toContain("confirmRevision");
    expect(operationsLogged).toContain("submitVisit");
    expect(operationsLogged).toContain("reviewVisit");

    // Check schema of every structured log entry
    for (const log of capturedLogs) {
      if (log.op) {
        expect(log).toHaveProperty("level");
        expect(log).toHaveProperty("requestId");
        expect(log).toHaveProperty("actorRole");
        expect(log).toHaveProperty("visitId");
        expect(log).toHaveProperty("durationMs");
      }
    }

    // CRITICAL SECURITY ASSERTION: Zero occurrences of sensitive transcript or note in all logs
    const joinedLogs = rawLogStrings.join("\n");
    expect(joinedLogs).not.toContain(SENSITIVE_TRANSCRIPT_SUBSTRING);
    expect(joinedLogs).not.toContain(SENSITIVE_NOTE_SUBSTRING);
  });
});
