import { describe, it, expect } from "vitest";
import { Observations, RevisionContent, ReviewRequest, Hemoglobin, FollowUpDate, Note } from "../src/visit";

const missing = { status: "not_mentioned" } as const;
const base = {
  bloodPressure: missing,
  hemoglobin: missing,
  ttDose: missing,
  followUpDate: missing,
};

describe("observations", () => {
  it("accepts all-missing states without defaults", () => {
    expect(Observations.safeParse(base).success).toBe(true);
  });

  it("accepts recorded hemoglobin with unit and source", () => {
    const r = Observations.safeParse({
      ...base,
      hemoglobin: { status: "recorded", value: "9.0", unit: "g/dL", source: { type: "transcript", span: [18, 25] } },
    });
    expect(r.success).toBe(true);
  });

  it("rejects recorded value without unit", () => {
    expect(Hemoglobin.safeParse({ status: "recorded", value: "9", source: { type: "manual" } }).success).toBe(false);
  });

  it("rejects wrong unit", () => {
    expect(
      Hemoglobin.safeParse({ status: "recorded", value: "9", unit: "g/L", source: { type: "manual" } }).success,
    ).toBe(false);
  });

  it("rejects value on a non-recorded status (missing never carries a value)", () => {
    expect(Hemoglobin.safeParse({ status: "not_measured", value: "0" }).success).toBe(false);
  });

  it("rejects ambiguous hemoglobin formats", () => {
    for (const v of ["9,0", "nine", "9 g", "", "-9", "100"]) {
      expect(Hemoglobin.safeParse({ status: "recorded", value: v, unit: "g/dL", source: { type: "manual" } }).success, v).toBe(false);
    }
  });

  it("requires BP pair with mmHg", () => {
    const bp = { status: "recorded", systolic: 120, diastolic: 80, unit: "mmHg", source: { type: "manual" } };
    expect(Observations.safeParse({ ...base, bloodPressure: bp }).success).toBe(true);
    expect(Observations.safeParse({ ...base, bloodPressure: { ...bp, diastolic: undefined } }).success).toBe(false);
    expect(Observations.safeParse({ ...base, bloodPressure: { ...bp, systolic: 120.5 } }).success).toBe(false);
  });

  it("rejects bad spans and unknown keys", () => {
    const hb = (span: [number, number]) => ({
      status: "recorded", value: "9", unit: "g/dL", source: { type: "transcript", span },
    });
    expect(Hemoglobin.safeParse(hb([5, 5])).success).toBe(false);
    expect(Observations.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });

  it("validates real calendar dates", () => {
    const d = (date: string) => ({ status: "recorded", date, source: { type: "manual" } });
    expect(FollowUpDate.safeParse(d("2026-10-27")).success).toBe(true);
    expect(FollowUpDate.safeParse(d("2026-02-30")).success).toBe(false);
    expect(FollowUpDate.safeParse(d("next week")).success).toBe(false);
  });
});

describe("revision content", () => {
  const ok = { visitAt: "2026-10-19T10:00:00+05:30", visitTimezone: "Asia/Kolkata", observations: base };

  it("accepts minimal content", () => {
    expect(RevisionContent.safeParse(ok).success).toBe(true);
  });

  it("rejects offset-less visitAt", () => {
    expect(RevisionContent.safeParse({ ...ok, visitAt: "2026-10-19T10:00:00" }).success).toBe(false);
  });

  it("counts note length in code points, not UTF-16 units", () => {
    expect(Note.safeParse("😀".repeat(2000)).success).toBe(true);
    expect(Note.safeParse("😀".repeat(2001)).success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    expect(RevisionContent.safeParse({ ...ok, status: "approved" }).success).toBe(false);
  });
});

describe("review request", () => {
  it("requires a reason on return", () => {
    expect(ReviewRequest.safeParse({ action: "return", revision: 2 }).success).toBe(false);
    expect(ReviewRequest.safeParse({ action: "return", revision: 2, reason: "unit unclear" }).success).toBe(true);
  });
  it("rejects reason on approve", () => {
    expect(ReviewRequest.safeParse({ action: "approve", revision: 2, reason: "x" }).success).toBe(false);
  });
});
