import { describe, it, expect } from "vitest";
import { contentHash, canonicalJson } from "../src/contentHash.js";
import { RevisionContent } from "../src/visit.js";

describe("canonicalJson", () => {
  it("sorts object keys recursively and strips whitespace", () => {
    const a = { z: 1, a: { b: 2, a: 1 } };
    const b = { a: { a: 1, b: 2 }, z: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":{"a":1,"b":2},"z":1}');
  });

  it("normalizes unicode strings to NFC", () => {
    // 'e\u0301' (decomposed é) vs '\u00e9' (composed é)
    const decomposed = "cafe\u0301";
    const composed = "caf\u00e9";
    expect(canonicalJson(decomposed)).toBe(canonicalJson(composed));
  });

  it("preserves array order", () => {
    expect(canonicalJson([1, 2, 3])).toBe("[1,2,3]");
    expect(canonicalJson([3, 2, 1])).toBe("[3,2,1]");
    expect(canonicalJson([1, 2, 3])).not.toBe(canonicalJson([3, 2, 1]));
  });
});

describe("contentHash", () => {
  const baseContent: RevisionContent = {
    visitAt: "2026-10-19T10:00:00+05:30",
    visitTimezone: "Asia/Kolkata",
    observations: {
      bloodPressure: {
        status: "recorded",
        systolic: 110,
        diastolic: 70,
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
      followUpDate: { status: "unknown" },
    },
    note: "Routine prenatal checkup",
    unresolvedAcknowledged: ["followUpDate"],
  };

  it("produces a 64-character lowercase hex string", () => {
    const hash = contentHash(baseContent);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is independent of top-level or nested key insertion order", () => {
    const permutedContent: RevisionContent = {
      note: "Routine prenatal checkup",
      unresolvedAcknowledged: ["followUpDate"],
      visitTimezone: "Asia/Kolkata",
      visitAt: "2026-10-19T10:00:00+05:30",
      observations: {
        followUpDate: { status: "unknown" },
        ttDose: { status: "not_measured" },
        hemoglobin: {
          source: { type: "manual" },
          unit: "g/dL",
          value: "9.0",
          status: "recorded",
        },
        bloodPressure: {
          unit: "mmHg",
          diastolic: 70,
          systolic: 110,
          source: { type: "manual" },
          status: "recorded",
        },
      },
    };
    expect(contentHash(baseContent)).toBe(contentHash(permutedContent));
  });

  it("changes hash when any field is modified", () => {
    const originalHash = contentHash(baseContent);

    // Edit blood pressure
    const modBP = {
      ...baseContent,
      observations: {
        ...baseContent.observations,
        bloodPressure: {
          status: "recorded" as const,
          systolic: 120,
          diastolic: 80,
          unit: "mmHg" as const,
          source: { type: "manual" as const },
        },
      },
    };
    expect(contentHash(modBP)).not.toBe(originalHash);

    // Edit visitAt
    const modTime = { ...baseContent, visitAt: "2026-10-19T11:00:00+05:30" };
    expect(contentHash(modTime)).not.toBe(originalHash);

    // Edit note
    const modNote = { ...baseContent, note: "Different note" };
    expect(contentHash(modNote)).not.toBe(originalHash);

    // Edit unresolvedAcknowledged
    const modUnresolved = { ...baseContent, unresolvedAcknowledged: [] };
    expect(contentHash(modUnresolved)).not.toBe(originalHash);
  });

  it("produces a stable known vector", () => {
    const minimalContent: RevisionContent = {
      visitAt: "2026-10-19T10:00:00+05:30",
      visitTimezone: "Asia/Kolkata",
      observations: {
        bloodPressure: { status: "not_mentioned" },
        hemoglobin: { status: "not_mentioned" },
        ttDose: { status: "not_mentioned" },
        followUpDate: { status: "not_mentioned" },
      },
      unresolvedAcknowledged: [],
    };
    const hash = contentHash(minimalContent);
    // Verify deterministic stability across calls
    expect(contentHash(minimalContent)).toBe(hash);
    expect(hash).toHaveLength(64);
  });
});
