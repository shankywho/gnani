import { Observations, ProposalIssue } from "@sakhiline/contracts";

export type RunnerOutcome =
  | {
      kind: "proposal";
      observations: Observations;
      issues: ProposalIssue[];
    }
  | {
      kind: "schema_failed";
    }
  | {
      kind: "provider_failed";
      code: string;
    };

export type FieldClassification =
  | "correct"
  | "wrong"
  | "missing"
  | "abstained"
  | "schema_failed"
  | "provider_failed";

export type EvalField = "bloodPressure" | "hemoglobin" | "ttDose" | "followUpDate";

export interface FieldResult {
  field: EvalField;
  classification: FieldClassification;
  expected?: any;
  predicted?: any;
  reason?: string;
}

export interface CaseResult {
  scenarioId: string;
  split: "dev" | "heldout";
  condition: "clean" | "noise-a" | "noise-b";
  outcome: RunnerOutcome;
  fieldResults: FieldResult[];
  latencyMs: number;
}

export interface ConditionSummary {
  expectedCount: number;
  suppliedCount: number;
  correct: number;
  wrong: number;
  missing: number;
  abstained: number;
  schemaFailed: number;
  providerFailed: number;
  accuracy: number;
  coverage: number;
  wrongRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  nLatency: number;
}

export interface RunSummary {
  manifestHash: string;
  seed: number;
  mode: string;
  conditions: Record<string, ConditionSummary>;
  overall: ConditionSummary;
}

export interface EvalScenario {
  id: string;
  split: "dev" | "heldout";
  transcript: string;
  visitAt: string;
  visitTimezone: string;
  history: Array<{ visitAt?: string; observations: Observations }>;
  expected: Observations;
  tags: string[];
}

export interface EvalManifest {
  version: string;
  scorerVersion: string;
  seed: number;
  conditions: Array<"clean" | "noise-a" | "noise-b">;
  scenarios: EvalScenario[];
  checksums?: Record<string, string>;
}
