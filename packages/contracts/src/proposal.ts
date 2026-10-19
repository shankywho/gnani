import { z } from "zod";
import { Observations } from "./visit.js";

export const FieldKey = z.enum(["bloodPressure", "hemoglobin", "ttDose", "followUpDate"]);
export type FieldKey = z.infer<typeof FieldKey>;

export const IssueCode = z.enum([
  "AMBIGUOUS_DATE",
  "MISSING_UNIT",
  "CONFLICTING_READING",
  "NO_SPEECH",
  "EXTRACTION_FAILED",
  "HISTORY_ONLY",
]);
export type IssueCode = z.infer<typeof IssueCode>;

export const ClarificationKey = z.enum([
  "ASK_FOLLOWUP_DATE",
  "ASK_BP_UNIT_OR_PAIR",
  "ASK_HB_UNIT",
  "ASK_WHICH_READING_CURRENT",
]);
export type ClarificationKey = z.infer<typeof ClarificationKey>;

export const CLARIFICATION_TEMPLATES: Record<ClarificationKey, string> = {
  ASK_FOLLOWUP_DATE: "Please specify an exact follow-up date (e.g. YYYY-MM-DD).",
  ASK_BP_UNIT_OR_PAIR: "Please provide both systolic and diastolic blood pressure in mmHg.",
  ASK_HB_UNIT: "Please confirm the hemoglobin reading in g/dL.",
  ASK_WHICH_READING_CURRENT:
    "Multiple readings found. Please select which reading represents the current visit.",
};

export const ProposalIssue = z
  .object({
    field: FieldKey,
    code: IssueCode,
    clarificationKey: ClarificationKey,
  })
  .strict();
export type ProposalIssue = z.infer<typeof ProposalIssue>;

export const ProposalModel = z
  .object({
    provider: z.enum(["mock", "http"]),
    name: z.string().min(1),
    promptVersion: z.string().min(1),
  })
  .strict();
export type ProposalModel = z.infer<typeof ProposalModel>;

export const Proposal = z
  .object({
    proposalId: z.string().uuid(),
    baseRevision: z.number().int().min(1),
    transcript: z.string(),
    observations: Observations,
    issues: z.array(ProposalIssue),
    model: ProposalModel,
  })
  .strict();
export type Proposal = z.infer<typeof Proposal>;

export const AcceptProposalRequest = z
  .object({
    fields: z.array(FieldKey).min(1),
  })
  .strict();
export type AcceptProposalRequest = z.infer<typeof AcceptProposalRequest>;
