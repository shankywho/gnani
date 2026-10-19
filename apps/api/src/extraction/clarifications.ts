import { ClarificationKey, CLARIFICATION_TEMPLATES } from "@sakhiline/contracts";

export { ClarificationKey, CLARIFICATION_TEMPLATES };

export function isValidClarificationKey(key: string): key is ClarificationKey {
  return key in CLARIFICATION_TEMPLATES;
}
