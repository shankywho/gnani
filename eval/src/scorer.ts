import { Observations } from "@sakhiline/contracts";
import { RunnerOutcome, FieldResult, EvalField } from "./types.js";

const FIELDS: EvalField[] = ["bloodPressure", "hemoglobin", "ttDose", "followUpDate"];

/**
 * Canonical hemoglobin decimal string normalization:
 * "9" -> "9.0", "9.0" -> "9.0", "10.5" -> "10.5"
 */
export function normalizeHemoglobin(val: string): string {
  const trimmed = val.trim();
  const num = parseFloat(trimmed);
  if (Number.isNaN(num)) return trimmed;
  // If it has no decimal part, append .0
  if (!trimmed.includes(".")) {
    return `${trimmed}.0`;
  }
  return trimmed;
}

export function scoreCase(
  expected: Observations,
  outcome: RunnerOutcome
): FieldResult[] {
  // If schema failed, all fields are schema_failed
  if (outcome.kind === "schema_failed") {
    return FIELDS.map((field) => ({
      field,
      classification: "schema_failed",
      expected: (expected as any)[field],
      reason: "Schema validation failed",
    }));
  }

  // If provider failed, all fields are provider_failed
  if (outcome.kind === "provider_failed") {
    return FIELDS.map((field) => ({
      field,
      classification: "provider_failed",
      expected: (expected as any)[field],
      reason: `Provider failed with code: ${outcome.code}`,
    }));
  }

  const { observations: predicted, issues } = outcome;
  const results: FieldResult[] = [];

  for (const field of FIELDS) {
    const exp = (expected as any)[field];
    const pred = (predicted as any)[field];

    const hasIssue = issues.some((i) => i.field === field);

    // 1. Expected is recorded
    if (exp?.status === "recorded") {
      // If predicted abstained (unknown or issue present where expected is recorded)
      if (pred?.status === "unknown" || (hasIssue && pred?.status !== "recorded")) {
        results.push({
          field,
          classification: "abstained",
          expected: exp,
          predicted: pred,
          reason: "Model abstained with unknown or clarification issue",
        });
        continue;
      }

      // If predicted is missing (not_mentioned)
      if (pred?.status === "not_mentioned") {
        results.push({
          field,
          classification: "missing",
          expected: exp,
          predicted: pred,
          reason: "Expected recorded observation was not mentioned in prediction",
        });
        continue;
      }

      // If predicted is not_measured (negation mismatch)
      if (pred?.status === "not_measured") {
        results.push({
          field,
          classification: "wrong",
          expected: exp,
          predicted: pred,
          reason: "Status mismatch: expected recorded, received not_measured",
        });
        continue;
      }

      // Both are recorded: strict type comparison
      if (pred?.status === "recorded") {
        if (field === "bloodPressure") {
          const sysMatch = exp.systolic === pred.systolic;
          const diaMatch = exp.diastolic === pred.diastolic;
          const unitMatch = (exp.unit || "mmHg").toLowerCase() === (pred.unit || "mmHg").toLowerCase();

          if (sysMatch && diaMatch && unitMatch) {
            results.push({ field, classification: "correct", expected: exp, predicted: pred });
          } else {
            results.push({
              field,
              classification: "wrong",
              expected: exp,
              predicted: pred,
              reason: !unitMatch
                ? `Unit mismatch: expected ${exp.unit}, got ${pred.unit}`
                : `BP mismatch: expected ${exp.systolic}/${exp.diastolic}, got ${pred.systolic}/${pred.diastolic}`,
            });
          }
          continue;
        }

        if (field === "hemoglobin") {
          const expNorm = normalizeHemoglobin(exp.value);
          const predNorm = normalizeHemoglobin(pred.value);
          const unitMatch = (exp.unit || "g/dL").toLowerCase() === (pred.unit || "g/dL").toLowerCase();

          // Strict exact decimal equality — NO fuzzy numeric match!
          if (expNorm === predNorm && unitMatch) {
            results.push({ field, classification: "correct", expected: exp, predicted: pred });
          } else {
            results.push({
              field,
              classification: "wrong",
              expected: exp,
              predicted: pred,
              reason: !unitMatch
                ? `Unit mismatch: expected ${exp.unit}, got ${pred.unit}`
                : `Hb mismatch: expected ${expNorm}, got ${predNorm}`,
            });
          }
          continue;
        }

        if (field === "ttDose") {
          const expText = (exp.text || "").trim().toLowerCase();
          const predText = (pred.text || "").trim().toLowerCase();
          if (expText === predText || predText.includes(expText) || expText.includes(predText)) {
            results.push({ field, classification: "correct", expected: exp, predicted: pred });
          } else {
            results.push({
              field,
              classification: "wrong",
              expected: exp,
              predicted: pred,
              reason: `TT dose mismatch: expected "${exp.text}", got "${pred.text}"`,
            });
          }
          continue;
        }

        if (field === "followUpDate") {
          if (exp.date === pred.date) {
            results.push({ field, classification: "correct", expected: exp, predicted: pred });
          } else {
            results.push({
              field,
              classification: "wrong",
              expected: exp,
              predicted: pred,
              reason: `Date mismatch: expected ${exp.date}, got ${pred.date}`,
            });
          }
          continue;
        }
      }

      // Any other unhandled predicted status
      results.push({
        field,
        classification: "wrong",
        expected: exp,
        predicted: pred,
        reason: `Unhandled status: ${pred?.status}`,
      });
      continue;
    }

    // 2. Expected is not_measured, not_mentioned, or unknown
    // Status equality rule: an expected not_measured vs predicted not_mentioned = WRONG
    if (exp?.status === pred?.status) {
      results.push({
        field,
        classification: "correct",
        expected: exp,
        predicted: pred,
      });
    } else {
      results.push({
        field,
        classification: "wrong",
        expected: exp,
        predicted: pred,
        reason: `Status mismatch: expected ${exp?.status}, predicted ${pred?.status}`,
      });
    }
  }

  return results;
}
