import { ExtractionProvider, ExtractionInput, ExtractionRawOutput } from "./provider.js";
import { AppError } from "@sakhiline/contracts";

export class HttpStubExtractionProvider implements ExtractionProvider {
  public readonly name = "http-stub";

  async extract(_input: ExtractionInput): Promise<ExtractionRawOutput> {
    throw new AppError("PROVIDER_FAILURE", "NOT_CONFIGURED: HTTP extraction provider not configured");
  }
}
