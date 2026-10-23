import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPrismaClient, getEvaluationRunResults } from "@sakhiline/db";
import { runEvaluation } from "../src/run.js";

// Johny's runner (J6): FIXTURE mode, no audio or spend.
describe("evaluation runner", () => {
  it("runs 30 scenarios × 3 conditions, keeps failures in denominators, is deterministic", async () => {
    const a = await runEvaluation({ persist: false, outDir: mkdtempSync(join(tmpdir(), "eval-")) });
    const b = await runEvaluation({ persist: false, outDir: mkdtempSync(join(tmpdir(), "eval-")) });
    expect(a.caseCount).toBe(90);
    expect(a.overall.expectedCount).toBe(360);
    const o = a.overall;
    expect(o.correct + o.wrong + o.missing + o.abstained + o.schemaFailed + o.providerFailed).toBe(o.expectedCount);
    expect(a.failures.length).toBe(o.expectedCount - o.correct);
    expect(a.mode).toBe("FIXTURE");
    // Seeded noise + deterministic extractor: identical outcomes (timing may differ).
    const counts = ({ latencyP50Ms, latencyP95Ms, ...rest }: typeof a.overall) => rest;
    expect(counts(b.overall)).toEqual(counts(a.overall));
    expect(b.failures).toEqual(a.failures);
  });

  it("persists results that reconcile with the summary and writes latest.json", async () => {
    const dir = mkdtempSync(join(tmpdir(), "eval-"));
    const a = await runEvaluation({ persist: true, outDir: dir });
    const rows = await getEvaluationRunResults(getPrismaClient(), a.runId);
    expect(rows).toHaveLength(90);
    const fields = rows.reduce((n, r) => n + (r.denominators as { expectedCount: number }).expectedCount, 0);
    const correct = rows.reduce((n, r) => n + ((r.denominators as { correct?: number }).correct ?? 0), 0);
    expect(fields).toBe(a.overall.expectedCount);
    expect(correct).toBe(a.overall.correct);
    expect(JSON.parse(readFileSync(join(dir, "latest.json"), "utf8")).runId).toBe(a.runId);
    await getPrismaClient().$disconnect();
  });
});
