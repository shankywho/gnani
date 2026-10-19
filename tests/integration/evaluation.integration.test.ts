import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import {
  getPrismaClient,
  seed,
  PrismaClient,
  createEvaluationRun,
  recordEvaluationResult,
  getEvaluationRun,
  getEvaluationRunResults,
} from "@sakhiline/db";
import { createTestApp } from "../helpers/testApp.js";

import { randomUUID } from "node:crypto";

describe("Phase 7 Integration: Evaluation Persistence & Table Isolation (Integration #10)", () => {
  let prisma: PrismaClient;
  let app: any;

  beforeAll(async () => {
    prisma = getPrismaClient();
    await seed(prisma);
    app = createTestApp({ prisma });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Integration #10: Evaluation run persist and readback; visit* tables untouched; zero public HTTP triggers (404)", async () => {
    // 1. Record clinical and visit table counts before evaluation
    const initialVisitCount = await prisma.visit.count();
    const initialRevisionCount = await prisma.visitRevision.count();
    const initialAuditCount = await prisma.transitionAudit.count();
    const initialBeneficiaryCount = await prisma.beneficiary.count();

    // 2. Persist an evaluation run via evaluation repository
    const runId = randomUUID();
    const manifestHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    const run = await createEvaluationRun(prisma, {
      id: runId,
      manifestHash,
      codeVersion: "git-commit-phase-7",
      promptVersion: "2026-10-19",
      schemaVersion: "1.0.0",
      modelVersion: "mock-v1",
      seed: 42,
      conditions: ["clean", "noise-a", "noise-b"],
      counts: { expected: 10, correct: 7, wrong: 1, abstained: 1, failure: 1 },
      status: "completed",
    });

    expect(run.id).toBe(runId);
    expect(run.manifestHash).toBe(manifestHash);

    // 3. Persist evaluation results
    await recordEvaluationResult(prisma, {
      runId,
      scenarioId: "SYN-DEV-01",
      split: "dev",
      condition: "clean",
      expected: { bloodPressure: { status: "recorded", systolic: 120, diastolic: 80 } },
      predicted: { bloodPressure: { status: "recorded", systolic: 120, diastolic: 80 } },
      resultClass: "correct",
      denominators: { expectedCount: 4, correct: 4 },
      latencyMs: 120,
    });

    await recordEvaluationResult(prisma, {
      runId,
      scenarioId: "SYN-DEV-02",
      split: "dev",
      condition: "noise-a",
      expected: { bloodPressure: { status: "not_measured" } },
      predicted: { bloodPressure: { status: "not_mentioned" } },
      resultClass: "wrong",
      denominators: { expectedCount: 4, wrong: 1 },
      latencyMs: 145,
    });

    // 4. Read back run and results
    const fetchedRun = await getEvaluationRun(prisma, runId);
    expect(fetchedRun).not.toBeNull();
    expect(fetchedRun?.status).toBe("completed");

    const fetchedResults = await getEvaluationRunResults(prisma, runId);
    expect(fetchedResults).toHaveLength(2);
    expect(fetchedResults[0]?.scenarioId).toBe("SYN-DEV-01");
    expect(fetchedResults[1]?.scenarioId).toBe("SYN-DEV-02");

    // 5. Assert clinical visit tables remain COMPLETELY UNTOUCHED
    const finalVisitCount = await prisma.visit.count();
    const finalRevisionCount = await prisma.visitRevision.count();
    const finalAuditCount = await prisma.transitionAudit.count();
    const finalBeneficiaryCount = await prisma.beneficiary.count();

    expect(finalVisitCount).toBe(initialVisitCount);
    expect(finalRevisionCount).toBe(initialRevisionCount);
    expect(finalAuditCount).toBe(initialAuditCount);
    expect(finalBeneficiaryCount).toBe(initialBeneficiaryCount);

    // 6. Assert NO public HTTP route can trigger an evaluation run
    const endpoints = [
      "/api/v1/eval",
      "/api/v1/eval/run",
      "/api/v1/evaluation",
      "/eval",
      "/eval/run",
    ];

    for (const url of endpoints) {
      const getRes = await request(app).get(url);
      expect(getRes.status).toBe(404);

      const postRes = await request(app).post(url).send({});
      expect(postRes.status).toBe(404);
    }
  });
});
