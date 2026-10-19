// Seams with Johny's speech & runtime lane (SAKHILINE_BUILD.md §4)

export interface RequestContext {
  requestId: string;
  log: {
    info(o: object, m?: string): void;
    warn(o: object, m?: string): void;
    error(o: object, m?: string): void;
  };
}

export interface Actor {
  id: string;
  organizationId: string;
  role: "worker" | "supervisor";
}

export interface IdentityVerifier {
  verify(req: {
    headers: Record<string, string | undefined>;
    cookies: Record<string, string | undefined>;
  }): Promise<Actor | null>;
}

export type SttResult =
  | {
      ok: true;
      transcript: string;
      providerRequestId?: string;
      latencyMs: number;
      mode: "mock" | "live";
    }
  | {
      ok: false;
      code: "UNSUPPORTED_MEDIA" | "TIMEOUT" | "RATE_LIMITED" | "PROVIDER_FAILURE";
      latencyMs: number;
    };

export type TranscribeClip = (
  clip: { path: string; mimeType: string; seconds: number },
  language: string
) => Promise<SttResult>;

export type StageClip = (upload: {
  buffer: Buffer;
  mimeType: string;
}) => Promise<{
  path: string;
  mimeType: string;
  seconds: number;
  cleanup(): Promise<void>;
}>;
