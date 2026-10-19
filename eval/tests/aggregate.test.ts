import { describe, it, expect } from "vitest";
import { summarizeFieldResults, calculateNearestRankPercentile } from "../src/aggregate.js";
import { FieldClassification } from "../src/types.js";

describe("Phase 7 Aggregate Unit Tests (§14)", () => {
  it("aggregate: worked example from delivery plan (7 correct, 1 wrong, 1 abstained, 1 provider failure of 10)", () => {
    const classifications: FieldClassification[] = [
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
      "wrong",
      "abstained",
      "provider_failed",
    ];

    const latencies = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190];

    const summary = summarizeFieldResults(classifications, latencies);

    expect(summary.expectedCount).toBe(10);
    expect(summary.correct).toBe(7);
    expect(summary.wrong).toBe(1);
    expect(summary.abstained).toBe(1);
    expect(summary.providerFailed).toBe(1);

    // Exact formulas per delivery plan & §12:
    // accuracy = correct / expected = 7 / 10 = 70%
    expect(summary.accuracy).toBeCloseTo(0.7, 5);

    // coverage = supplied / expected = (correct + wrong) / 10 = 8 / 10 = 80%
    expect(summary.coverage).toBeCloseTo(0.8, 5);

    // wrongRate = wrong / expected = 1 / 10 = 10%
    expect(summary.wrongRate).toBeCloseTo(0.1, 5);
  });

  it("aggregate: nearest-rank latency calculation for p50 and p95", () => {
    // 10 sorted latency values: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    // p50: rank = ceil(0.50 * 10) = 5 -> index 4 -> 50
    const p50 = calculateNearestRankPercentile(values, 50);
    expect(p50).toBe(50);

    // p95: rank = ceil(0.95 * 10) = 10 -> index 9 -> 100
    const p95 = calculateNearestRankPercentile(values, 95);
    expect(p95).toBe(100);
  });
});
