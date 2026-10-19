import { describe, it, expect } from "vitest";
import { generateReadback } from "../../apps/api/src/extraction/readback.js";
import { Observations } from "@sakhiline/contracts";

describe("readback: template generation", () => {
  it("excludes note and transcript, formatting typed fields only", () => {
    const obs: Observations = {
      bloodPressure: {
        status: "recorded",
        systolic: 120,
        diastolic: 80,
        unit: "mmHg",
        source: { type: "manual" },
      },
      hemoglobin: {
        status: "recorded",
        value: "9.5",
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

    const text = generateReadback(obs);
    expect(text).toContain("BP 120 by 80 mmHg.");
    expect(text).toContain("Hemoglobin 9.5 g/dL.");
    expect(text).toContain("TT dose: Second dose completed.");
    expect(text).toContain("Follow-up on 2026-10-27.");

    // Critical safety: readback must never include freeform note/transcript text
    expect(text).not.toContain("Patient complained of fatigue");
  });

  it("formats not_measured fields into safe summary", () => {
    const obs: Observations = {
      bloodPressure: {
        status: "recorded",
        systolic: 110,
        diastolic: 70,
        unit: "mmHg",
        source: { type: "manual" },
      },
      hemoglobin: { status: "not_measured" },
      ttDose: { status: "not_measured" },
      followUpDate: { status: "not_mentioned" },
    };

    const text = generateReadback(obs);
    expect(text).toContain("BP 110 by 70 mmHg.");
    expect(text).toContain("Not measured: hemoglobin, TT dose.");
  });
});
