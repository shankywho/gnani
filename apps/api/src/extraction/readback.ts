import { Observations } from "@sakhiline/contracts";

/**
 * Generates deterministic spoken text for confirmed typed observations.
 * Excludes arbitrary free-text notes and transcripts (privacy & prompt injection safety).
 */
export function generateReadback(obs: Observations): string {
  const parts: string[] = [];
  const notMeasuredFields: string[] = [];

  // Blood Pressure
  if (obs.bloodPressure.status === "recorded") {
    parts.push(`BP ${obs.bloodPressure.systolic} by ${obs.bloodPressure.diastolic} mmHg.`);
  } else if (obs.bloodPressure.status === "not_measured") {
    notMeasuredFields.push("blood pressure");
  }

  // Hemoglobin
  if (obs.hemoglobin.status === "recorded") {
    parts.push(`Hemoglobin ${obs.hemoglobin.value} g/dL.`);
  } else if (obs.hemoglobin.status === "not_measured") {
    notMeasuredFields.push("hemoglobin");
  }

  // TT Dose
  if (obs.ttDose.status === "recorded") {
    // Free transcript text is never read back (advice-injection channel); only the fact it was mentioned.
    parts.push("TT dose mentioned.");
  } else if (obs.ttDose.status === "not_measured") {
    notMeasuredFields.push("TT dose");
  }

  // Follow-up Date
  if (obs.followUpDate.status === "recorded") {
    parts.push(`Follow-up on ${obs.followUpDate.date}.`);
  } else if (obs.followUpDate.status === "not_measured") {
    notMeasuredFields.push("follow-up date");
  }

  // Not measured summary
  if (notMeasuredFields.length > 0) {
    parts.push(`Not measured: ${notMeasuredFields.join(", ")}.`);
  }

  return parts.join(" ");
}
