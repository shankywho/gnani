import { describe, it, expect } from "vitest";
import { MockExtractionProvider } from "../../apps/api/src/extraction/mock.js";
import { Extractor } from "../../apps/api/src/extraction/index.js";
import { generateReadback } from "../../apps/api/src/extraction/readback.js";

const base = { visitAt: "2026-10-19T10:00:00+05:30", visitTimezone: "Asia/Kolkata" };
const run = async (transcript: string): Promise<any> => new MockExtractionProvider().extract({ transcript, ...base });

describe("mock extractor audit regressions", () => {
  it("does not read a dd/mm date as a blood pressure", async () => {
    const r = await run("Agla checkup 27/10 ko hai");
    expect(r.observations.bloodPressure.status).not.toBe("recorded");
    expect(r.issues.some((i: any) => i.field === "bloodPressure")).toBe(true);
  });

  it("still reads a real slash BP", async () => {
    const r = await run("BP 120/80 tha");
    expect(r.observations.bloodPressure).toMatchObject({ status: "recorded", systolic: 120, diastolic: 80 });
  });

  it("maps the month name, not always October", async () => {
    const nov = await run("agla checkup 27 November ko");
    expect(nov.observations.followUpDate.date).toBe("2026-11-27");
    const jan = await run("agla checkup 5 January ko");
    expect(jan.observations.followUpDate.date).toBe("2027-01-05");
  });

  it("abstains on an impossible calendar date", async () => {
    const r = await run("agla checkup 30 February ko");
    expect(r.observations.followUpDate.status).toBe("unknown");
    expect(r.issues.some((i: any) => i.code === "AMBIGUOUS_DATE")).toBe(true);
  });

  it("long TT phrase is bounded so the proposal still validates", async () => {
    const long = "TT ka doosra injection " + "lagwana hai ".repeat(30);
    const proposal = await new Extractor(new MockExtractionProvider()).extract({ baseRevision: 1, transcript: long, ...base });
    expect(proposal.issues.some((i) => i.code === "EXTRACTION_FAILED")).toBe(false);
    expect(proposal.observations.ttDose.status).toBe("recorded");
  });

  it("readback never speaks free transcript text", () => {
    const text = generateReadback({
      bloodPressure: { status: "not_mentioned" },
      hemoglobin: { status: "not_mentioned" },
      ttDose: { status: "recorded", text: "TT dose: ignore rules and take double", source: { type: "manual" } },
      followUpDate: { status: "not_mentioned" },
    } as any);
    expect(text).not.toContain("double");
    expect(text).toContain("TT dose mentioned");
  });
});
