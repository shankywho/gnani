import { describe, it, expect } from "vitest";
import { scoreCase, normalizeHemoglobin } from "../src/scorer.js";
import { checkSplitLeakage } from "../src/manifest.js";
import { Observations } from "@sakhiline/contracts";
import { RunnerOutcome, EvalScenario } from "../src/types.js";

describe("Phase 7 Scorer Unit Tests (§14)", () => {
  const baseExpected: Observations = {
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
    ttDose: {
      status: "recorded",
      text: "Second dose completed",
      source: { type: "manual" },
    },
    followUpDate: {
      status: "recorded",
      date: "2026-10-27",
      source: { type: "manual" },
    },
  };

  it("scorer: wrong number fails", () => {
    const outcome: RunnerOutcome = {
      kind: "proposal",
      observations: {
        ...baseExpected,
        hemoglobin: {
          status: "recorded",
          value: "9.5", // expected 9.0
          unit: "g/dL",
          source: { type: "manual" },
        },
      },
      issues: [],
    };

    const results = scoreCase(baseExpected, outcome);
    const hbRes = results.find((r) => r.field === "hemoglobin");
    expect(hbRes?.classification).toBe("wrong");
  });

  it("scorer: wrong unit fails", () => {
    const outcome: RunnerOutcome = {
      kind: "proposal",
      observations: {
        ...baseExpected,
        bloodPressure: {
          status: "recorded",
          systolic: 120,
          diastolic: 80,
          unit: "kPa" as any, // expected mmHg
          source: { type: "manual" },
        },
      },
      issues: [],
    };

    const results = scoreCase(baseExpected, outcome);
    const bpRes = results.find((r) => r.field === "bloodPressure");
    expect(bpRes?.classification).toBe("wrong");
    expect(bpRes?.reason).toContain("Unit mismatch");
  });

  it("scorer: negation vs missing (not_measured vs not_mentioned is WRONG)", () => {
    const negationExpected: Observations = {
      bloodPressure: { status: "not_measured" },
      hemoglobin: { status: "not_mentioned" },
      ttDose: { status: "not_mentioned" },
      followUpDate: { status: "not_mentioned" },
    };

    // Model omitted BP entirely (not_mentioned) instead of identifying negation (not_measured)
    const outcome: RunnerOutcome = {
      kind: "proposal",
      observations: {
        bloodPressure: { status: "not_mentioned" },
        hemoglobin: { status: "not_mentioned" },
        ttDose: { status: "not_mentioned" },
        followUpDate: { status: "not_mentioned" },
      },
      issues: [],
    };

    const results = scoreCase(negationExpected, outcome);
    const bpRes = results.find((r) => r.field === "bloodPressure");
    // Status equality rule: not_measured expected vs not_mentioned predicted is WRONG
    expect(bpRes?.classification).toBe("wrong");
    expect(bpRes?.reason).toContain("Status mismatch");
  });

  it("scorer: denominator keeps failures (schema_failed & provider_failed)", () => {
    const schemaFailedOutcome: RunnerOutcome = {
      kind: "schema_failed",
    };
    const schemaResults = scoreCase(baseExpected, schemaFailedOutcome);
    expect(schemaResults).toHaveLength(4);
    for (const r of schemaResults) {
      expect(r.classification).toBe("schema_failed");
    }

    const providerFailedOutcome: RunnerOutcome = {
      kind: "provider_failed",
      code: "TIMEOUT",
    };
    const providerResults = scoreCase(baseExpected, providerFailedOutcome);
    expect(providerResults).toHaveLength(4);
    for (const r of providerResults) {
      expect(r.classification).toBe("provider_failed");
    }
  });

  it("scorer: split leakage detected", () => {
    const scenarios: EvalScenario[] = [
      {
        id: "SCENARIO-1",
        split: "dev",
        transcript: "BP 120/80 check kiya",
        visitAt: "2026-10-19T10:00:00Z",
        visitTimezone: "Asia/Kolkata",
        history: [],
        expected: baseExpected,
        tags: [],
      },
      {
        id: "SCENARIO-2",
        split: "heldout",
        transcript: "BP 120/80 check kiya", // Leaked identical transcript!
        visitAt: "2026-10-19T10:00:00Z",
        visitTimezone: "Asia/Kolkata",
        history: [],
        expected: baseExpected,
        tags: [],
      },
    ];

    const leakage = checkSplitLeakage(scenarios);
    expect(leakage.leakageDetected).toBe(true);
    expect(leakage.leaks[0]).toContain("Identical transcript found in both dev and heldout");
  });

  it("scorer: no fuzzy numeric pass", () => {
    // 9.1 g/dL must NEVER match 9.0 g/dL
    const outcome: RunnerOutcome = {
      kind: "proposal",
      observations: {
        ...baseExpected,
        hemoglobin: {
          status: "recorded",
          value: "9.1",
          unit: "g/dL",
          source: { type: "manual" },
        },
      },
      issues: [],
    };

    const results = scoreCase(baseExpected, outcome);
    const hbRes = results.find((r) => r.field === "hemoglobin");
    expect(hbRes?.classification).toBe("wrong");
  });

  it("scorer: canonical decimal matching", () => {
    // "9" should match "9.0"
    expect(normalizeHemoglobin("9")).toBe("9.0");
    expect(normalizeHemoglobin("9.0")).toBe("9.0");
    expect(normalizeHemoglobin("10.5")).toBe("10.5");

    const outcome: RunnerOutcome = {
      kind: "proposal",
      observations: {
        ...baseExpected,
        hemoglobin: {
          status: "recorded",
          value: "9", // expected 9.0
          unit: "g/dL",
          source: { type: "manual" },
        },
      },
      issues: [],
    };

    const results = scoreCase(baseExpected, outcome);
    const hbRes = results.find((r) => r.field === "hemoglobin");
    expect(hbRes?.classification).toBe("correct");
  });

  it("manifest: loads all 30 scenarios with zero split leakage", async () => {
    const { loadManifest } = await import("../src/manifest.js");
    const { join } = await import("node:path");
    const manifestPath = join(process.cwd(), "fixtures/manifest.json");

    const { manifest, manifestHash } = loadManifest(manifestPath);
    expect(manifestHash).toBeDefined();
    expect(manifest.scenarios).toHaveLength(30);

    const dev = manifest.scenarios.filter((s) => s.split === "dev");
    const heldout = manifest.scenarios.filter((s) => s.split === "heldout");

    expect(dev).toHaveLength(20);
    expect(heldout).toHaveLength(10);
  });
});
