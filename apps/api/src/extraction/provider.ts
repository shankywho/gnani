export interface ExtractionInput {
  transcript: string;
  visitAt: string;
  visitTimezone: string;
  history?: Array<{ visitAt?: string; observations: unknown }>;
}

export interface ExtractionRawOutput {
  observations: unknown;
  issues: unknown[];
  model: {
    provider: "mock" | "http";
    name: string;
    promptVersion: string;
  };
}

export interface ExtractionProvider {
  name: string;
  promptVersion?: string;
  extract(input: ExtractionInput): Promise<ExtractionRawOutput>;
}
