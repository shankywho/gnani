import { createHash } from "node:crypto";
import { RevisionContent } from "./visit.js";

/**
 * Serializes any value to canonical JSON:
 * - Keys sorted alphabetically at all levels
 * - No whitespace
 * - Undefined object values dropped
 * - Array order preserved
 * - Strings normalized to Unicode NFC
 */
export function canonicalJson(val: unknown): string {
  if (val === null || typeof val !== "object") {
    if (typeof val === "string") {
      return JSON.stringify(val.normalize("NFC"));
    }
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return "[" + val.map((item) => canonicalJson(item)).join(",") + "]";
  }
  const obj = val as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = sortedKeys.map(
    (k) => `${JSON.stringify(k.normalize("NFC"))}:${canonicalJson(obj[k])}`
  );
  return "{" + entries.join(",") + "}";
}

/**
 * Computes SHA-256 hex digest of canonical JSON for RevisionContent.
 */
export function contentHash(content: RevisionContent): string {
  const parsed = RevisionContent.parse(content);
  const canonical = canonicalJson(parsed);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
