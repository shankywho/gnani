import {
  Observations,
  ProposalIssue,
  CLARIFICATION_TEMPLATES,
  ClarificationKey,
} from "@sakhiline/contracts";

export interface ValidationContext {
  transcript: string;
  history?: Array<{ observations: any }>;
}

export function validateExtraction(
  rawObservations: any,
  rawIssues: any[],
  ctx: ValidationContext
): { observations: Observations; issues: ProposalIssue[] } {
  const codePoints = [...ctx.transcript];
  const totalCodePoints = codePoints.length;

  const validIssues: ProposalIssue[] = [];
  for (const issue of rawIssues || []) {
    if (
      issue &&
      issue.field &&
      issue.code &&
      issue.clarificationKey &&
      issue.clarificationKey in CLARIFICATION_TEMPLATES
    ) {
      validIssues.push({
        field: issue.field,
        code: issue.code,
        clarificationKey: issue.clarificationKey as ClarificationKey,
      });
    }
  }

  const cleanObs: any = {
    bloodPressure: { status: "not_mentioned" },
    hemoglobin: { status: "not_mentioned" },
    ttDose: { status: "not_mentioned" },
    followUpDate: { status: "not_mentioned" },
  };

  function isValidSpan(source: any, expectedSubstrings: string[]): boolean {
    if (!source || source.type !== "transcript") return true; // manual or no span
    const span = source.span;
    if (!Array.isArray(span) || span.length !== 2) return false;
    const [start, end] = span;
    if (start < 0 || end > totalCodePoints || start >= end) {
      return false; // Out-of-range span
    }
    const snippet = codePoints.slice(start, end).join("");
    for (const sub of expectedSubstrings) {
      if (!snippet.includes(sub)) {
        return false;
      }
    }
    return true;
  }

  // 1. Blood Pressure
  if (rawObservations?.bloodPressure) {
    const bp = rawObservations.bloodPressure;
    if (bp.status === "recorded") {
      const subs = [String(bp.systolic), String(bp.diastolic)];
      if (isValidSpan(bp.source, subs)) {
        cleanObs.bloodPressure = bp;
      } else {
        // Drop invalid span observation
        cleanObs.bloodPressure = { status: "not_mentioned" };
      }
    } else if (["not_measured", "unknown", "not_mentioned"].includes(bp.status)) {
      cleanObs.bloodPressure = { status: bp.status };
    }
  }

  // 2. Hemoglobin
  if (rawObservations?.hemoglobin) {
    const hb = rawObservations.hemoglobin;
    if (hb.status === "recorded") {
      const baseVal = hb.value.split(".")[0];
      const subs = [baseVal];

      // History value check: If value matches a historical reading, verify it actually appears in transcript
      let isHistoryCopy = false;
      if (ctx.history && ctx.history.length > 0) {
        for (const h of ctx.history) {
          const histHb = h.observations?.hemoglobin;
          if (histHb && histHb.status === "recorded" && histHb.value === hb.value) {
            // Check if current transcript actually contains this value
            const transcriptContains = codePoints.join("").includes(baseVal);
            if (!transcriptContains) {
              isHistoryCopy = true;
              break;
            }
          }
        }
      }

      if (!isHistoryCopy && isValidSpan(hb.source, subs)) {
        cleanObs.hemoglobin = hb;
      } else {
        cleanObs.hemoglobin = { status: "not_mentioned" };
      }
    } else if (["not_measured", "unknown", "not_mentioned"].includes(hb.status)) {
      cleanObs.hemoglobin = { status: hb.status };
    }
  }

  // 3. TT Dose
  if (rawObservations?.ttDose) {
    const tt = rawObservations.ttDose;
    if (tt.status === "recorded") {
      if (isValidSpan(tt.source, [])) {
        cleanObs.ttDose = tt;
      } else {
        cleanObs.ttDose = { status: "not_mentioned" };
      }
    } else if (["not_measured", "unknown", "not_mentioned"].includes(tt.status)) {
      cleanObs.ttDose = { status: tt.status };
    }
  }

  // 4. Follow-up Date
  if (rawObservations?.followUpDate) {
    const fu = rawObservations.followUpDate;
    if (fu.status === "recorded") {
      if (isValidSpan(fu.source, [])) {
        cleanObs.followUpDate = fu;
      } else {
        cleanObs.followUpDate = { status: "not_mentioned" };
      }
    } else if (["not_measured", "unknown", "not_mentioned"].includes(fu.status)) {
      cleanObs.followUpDate = { status: fu.status };
    }
  }

  return {
    observations: cleanObs,
    issues: validIssues,
  };
}
