import { CaseResult, ConditionSummary, RunSummary, FieldClassification } from "./types.js";

/**
 * Calculates percentile using the nearest-rank method on sorted numbers.
 */
export function calculateNearestRankPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const n = sortedValues.length;
  const rank = Math.ceil((percentile / 100) * n);
  const index = Math.min(Math.max(rank - 1, 0), n - 1);
  return sortedValues[index]!;
}

export function summarizeFieldResults(
  classifications: FieldClassification[],
  latencies: number[]
): ConditionSummary {
  const expectedCount = classifications.length;
  let correct = 0;
  let wrong = 0;
  let missing = 0;
  let abstained = 0;
  let schemaFailed = 0;
  let providerFailed = 0;

  for (const c of classifications) {
    switch (c) {
      case "correct":
        correct++;
        break;
      case "wrong":
        wrong++;
        break;
      case "missing":
        missing++;
        break;
      case "abstained":
        abstained++;
        break;
      case "schema_failed":
        schemaFailed++;
        break;
      case "provider_failed":
        providerFailed++;
        break;
    }
  }

  // Per §12 worked example: 7 correct, 1 wrong, 1 abstained, 1 failure of 10
  // -> 70% accuracy / 80% coverage / 10% wrong
  // suppliedCount = correct + wrong
  const suppliedCount = correct + wrong;

  const accuracy = expectedCount > 0 ? correct / expectedCount : 0;
  const coverage = expectedCount > 0 ? suppliedCount / expectedCount : 0;
  const wrongRate = expectedCount > 0 ? wrong / expectedCount : 0;

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const latencyP50Ms = calculateNearestRankPercentile(sortedLatencies, 50);
  const latencyP95Ms = calculateNearestRankPercentile(sortedLatencies, 95);

  return {
    expectedCount,
    suppliedCount,
    correct,
    wrong,
    missing,
    abstained,
    schemaFailed,
    providerFailed,
    accuracy,
    coverage,
    wrongRate,
    latencyP50Ms,
    latencyP95Ms,
    nLatency: latencies.length,
  };
}

export function aggregateResults(
  cases: CaseResult[],
  meta: {
    manifestHash: string;
    seed: number;
    mode: string;
  }
): RunSummary {
  const conditionCases: Record<string, CaseResult[]> = {};
  for (const c of cases) {
    if (!conditionCases[c.condition]) {
      conditionCases[c.condition] = [];
    }
    conditionCases[c.condition]!.push(c);
  }

  const conditionsSummary: Record<string, ConditionSummary> = {};
  const allClassifications: FieldClassification[] = [];
  const allLatencies: number[] = [];

  for (const [cond, cList] of Object.entries(conditionCases)) {
    const classifications: FieldClassification[] = [];
    const latencies: number[] = [];

    for (const item of cList) {
      latencies.push(item.latencyMs);
      allLatencies.push(item.latencyMs);

      for (const f of item.fieldResults) {
        classifications.push(f.classification);
        allClassifications.push(f.classification);
      }
    }

    conditionsSummary[cond] = summarizeFieldResults(classifications, latencies);
  }

  const overall = summarizeFieldResults(allClassifications, allLatencies);

  return {
    manifestHash: meta.manifestHash,
    seed: meta.seed,
    mode: meta.mode,
    conditions: conditionsSummary,
    overall,
  };
}
