import { describe, it, expect } from "vitest";
import {
  Proposal,
  AcceptProposalRequest,
  ProposalIssue,
  CLARIFICATION_TEMPLATES,
} from "../src/proposal.js";

describe("Proposal schema", () => {
  const validProposal = {
    proposalId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    baseRevision: 1,
    transcript: "Sunita ka BP check kiya 110 by 70 mmHg",
    observations: {
      bloodPressure: {
        status: "recorded" as const,
        systolic: 110,
        diastolic: 70,
        unit: "mmHg" as const,
        source: {
          type: "transcript" as const,
          span: [24, 39] as [number, number],
        },
      },
      hemoglobin: { status: "not_mentioned" as const },
      ttDose: { status: "not_mentioned" as const },
      followUpDate: { status: "not_mentioned" as const },
    },
    issues: [],
    model: {
      provider: "mock" as const,
      name: "regex-mock-v1",
      promptVersion: "2026-10-19",
    },
  };

  it("accepts a fully valid proposal", () => {
    const result = Proposal.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it("accepts proposal with valid issues from the catalog", () => {
    const withIssues = {
      ...validProposal,
      issues: [
        {
          field: "followUpDate",
          code: "AMBIGUOUS_DATE",
          clarificationKey: "ASK_FOLLOWUP_DATE",
        },
      ],
    };
    const result = Proposal.safeParse(withIssues);
    expect(result.success).toBe(true);
  });

  it("rejects free-text clarificationKey outside catalog", () => {
    const invalidIssue = {
      ...validProposal,
      issues: [
        {
          field: "followUpDate",
          code: "AMBIGUOUS_DATE",
          clarificationKey: "Please tell me the date!", // free text, must reject
        },
      ],
    };
    const result = Proposal.safeParse(invalidIssue);
    expect(result.success).toBe(false);
  });

  it("rejects unknown issue codes", () => {
    const invalidCode = {
      ...validProposal,
      issues: [
        {
          field: "bloodPressure",
          code: "UNKNOWN_CODE",
          clarificationKey: "ASK_BP_UNIT_OR_PAIR",
        },
      ],
    };
    expect(Proposal.safeParse(invalidCode).success).toBe(false);
  });

  it("rejects invalid UUID proposalId", () => {
    const invalidId = {
      ...validProposal,
      proposalId: "not-a-uuid",
    };
    expect(Proposal.safeParse(invalidId).success).toBe(false);
  });

  it("rejects baseRevision less than 1", () => {
    const invalidRev = {
      ...validProposal,
      baseRevision: 0,
    };
    expect(Proposal.safeParse(invalidRev).success).toBe(false);
  });

  it("ensures every ClarificationKey maps to a fixed template", () => {
    const keys = ["ASK_FOLLOWUP_DATE", "ASK_BP_UNIT_OR_PAIR", "ASK_HB_UNIT", "ASK_WHICH_READING_CURRENT"] as const;
    for (const key of keys) {
      expect(CLARIFICATION_TEMPLATES[key]).toBeDefined();
      expect(typeof CLARIFICATION_TEMPLATES[key]).toBe("string");
      expect(CLARIFICATION_TEMPLATES[key].length).toBeGreaterThan(0);
    }
  });
});

describe("AcceptProposalRequest schema", () => {
  it("accepts valid list of field keys", () => {
    const valid = { fields: ["bloodPressure", "hemoglobin"] };
    const parsed = AcceptProposalRequest.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects empty fields array", () => {
    const empty = { fields: [] };
    expect(AcceptProposalRequest.safeParse(empty).success).toBe(false);
  });

  it("rejects unknown field keys", () => {
    const unknownField = { fields: ["bloodPressure", "randomField"] };
    expect(AcceptProposalRequest.safeParse(unknownField).success).toBe(false);
  });
});
