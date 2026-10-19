import { PrismaClient, EvaluationRun, EvaluationResult, Prisma } from "@prisma/client";

export async function createEvaluationRun(
  prisma: PrismaClient,
  data: {
    id?: string;
    manifestHash: string;
    codeVersion: string;
    promptVersion: string;
    schemaVersion: string;
    modelVersion: string;
    seed: number;
    conditions: Prisma.InputJsonValue;
    counts: Prisma.InputJsonValue;
    status: string;
  }
): Promise<EvaluationRun> {
  return prisma.evaluationRun.create({
    data: {
      id: data.id,
      manifestHash: data.manifestHash,
      codeVersion: data.codeVersion,
      promptVersion: data.promptVersion,
      schemaVersion: data.schemaVersion,
      modelVersion: data.modelVersion,
      seed: data.seed,
      conditions: data.conditions,
      counts: data.counts,
      status: data.status,
    },
  });
}

export async function recordEvaluationResult(
  prisma: PrismaClient,
  data: {
    runId: string;
    scenarioId: string;
    split: string;
    condition: string;
    expected: Prisma.InputJsonValue;
    predicted: Prisma.InputJsonValue;
    resultClass: string;
    denominators: Prisma.InputJsonValue;
    latencyMs: number;
  }
): Promise<EvaluationResult> {
  return prisma.evaluationResult.create({
    data,
  });
}

export async function getEvaluationRun(
  prisma: PrismaClient,
  runId: string
): Promise<EvaluationRun | null> {
  return prisma.evaluationRun.findUnique({
    where: { id: runId },
  });
}

export async function getEvaluationRunResults(
  prisma: PrismaClient,
  runId: string
): Promise<EvaluationResult[]> {
  return prisma.evaluationResult.findMany({
    where: { runId },
    orderBy: { scenarioId: "asc" },
  });
}
