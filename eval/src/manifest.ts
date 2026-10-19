import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { EvalManifest, EvalScenario } from "./types.js";

/**
 * Computes SHA-256 hash of a string or buffer.
 */
export function computeHash(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Validates that there is zero split leakage between dev and heldout scenarios.
 * Checks scenario IDs and transcripts for duplicates across splits.
 */
export function checkSplitLeakage(scenarios: EvalScenario[]): {
  leakageDetected: boolean;
  leaks: string[];
} {
  const devIds = new Set<string>();
  const devTexts = new Set<string>();
  const heldoutIds = new Set<string>();
  const heldoutTexts = new Set<string>();
  const leaks: string[] = [];

  for (const s of scenarios) {
    const textNorm = s.transcript.trim().toLowerCase();
    if (s.split === "dev") {
      devIds.add(s.id);
      devTexts.add(textNorm);
    } else {
      heldoutIds.add(s.id);
      heldoutTexts.add(textNorm);
    }
  }

  for (const id of heldoutIds) {
    if (devIds.has(id)) {
      leaks.push(`Duplicate ID between dev and heldout: ${id}`);
    }
  }

  for (const text of heldoutTexts) {
    if (devTexts.has(text)) {
      leaks.push(`Identical transcript found in both dev and heldout: "${text}"`);
    }
  }

  return {
    leakageDetected: leaks.length > 0,
    leaks,
  };
}

/**
 * Loads and validates an EvalManifest from a file path.
 */
export function loadManifest(filePath: string): {
  manifest: EvalManifest;
  manifestHash: string;
} {
  const raw = readFileSync(filePath, "utf8");
  const manifest = JSON.parse(raw) as EvalManifest;
  const manifestHash = computeHash(raw);

  const leakage = checkSplitLeakage(manifest.scenarios);
  if (leakage.leakageDetected) {
    throw new Error(`Split leakage detected in manifest: ${leakage.leaks.join(", ")}`);
  }

  return { manifest, manifestHash };
}
