import { randomUUID } from "node:crypto";
import { Proposal, ProposalIssue } from "@sakhiline/contracts";
import { ExtractionProvider, ExtractionInput } from "./provider.js";
import { validateExtraction } from "./validate.js";
import { MockExtractionProvider } from "./mock.js";

export * from "./provider.js";
export * from "./mock.js";
export * from "./httpStub.js";
export * from "./validate.js";
export * from "./readback.js";
export * from "./clarifications.js";

export interface ExtractParams {
  baseRevision: number;
  transcript: string;
  visitAt: string;
  visitTimezone: string;
  history?: Array<{ observations: any }>;
}

export class Extractor {
  constructor(private readonly provider: ExtractionProvider = new MockExtractionProvider()) {}

  async extract(params: ExtractParams): Promise<Proposal> {
    const proposalId = randomUUID();
    const input: ExtractionInput = {
      transcript: params.transcript,
      visitAt: params.visitAt,
      visitTimezone: params.visitTimezone,
      history: params.history,
    };

    let rawOutput: any;
    try {
      rawOutput = await this.provider.extract(input);
    } catch {
      // Degrade on provider crash
      return this.degradedProposal(proposalId, params);
    }

    const candidate1 = {
      proposalId,
      baseRevision: params.baseRevision,
      transcript: params.transcript,
      observations: rawOutput?.observations,
      issues: rawOutput?.issues,
      model: rawOutput?.model || {
        provider: "mock",
        name: this.provider.name,
        promptVersion: "2026-10-19",
      },
    };

    let parsed = Proposal.safeParse(candidate1);

    if (!parsed.success) {
      // One repair retry
      try {
        const repairedRaw = await this.provider.extract(input);
        const candidate2 = {
          proposalId,
          baseRevision: params.baseRevision,
          transcript: params.transcript,
          observations: repairedRaw?.observations,
          issues: repairedRaw?.issues,
          model: repairedRaw?.model || {
            provider: "mock",
            name: this.provider.name,
            promptVersion: "2026-10-19",
          },
        };
        parsed = Proposal.safeParse(candidate2);
      } catch {
        // Fall through to degrade
      }
    }

    if (!parsed.success) {
      return this.degradedProposal(proposalId, params);
    }

    // Code-side validation
    const validated = validateExtraction(parsed.data.observations, parsed.data.issues, {
      transcript: params.transcript,
      history: params.history,
    });

    return {
      ...parsed.data,
      observations: validated.observations,
      issues: validated.issues,
    };
  }

  private degradedProposal(proposalId: string, params: ExtractParams): Proposal {
    const issues: ProposalIssue[] = [
      {
        field: "bloodPressure",
        code: "EXTRACTION_FAILED",
        clarificationKey: "ASK_BP_UNIT_OR_PAIR",
      },
    ];

    return {
      proposalId,
      baseRevision: params.baseRevision,
      transcript: params.transcript,
      observations: {
        bloodPressure: { status: "not_mentioned" },
        hemoglobin: { status: "not_mentioned" },
        ttDose: { status: "not_mentioned" },
        followUpDate: { status: "not_mentioned" },
      },
      issues,
      model: {
        provider: "mock",
        name: this.provider.name,
        promptVersion: "2026-10-19",
      },
    };
  }
}
