import { z } from "zod";

// Shared visit contract (T03). Format bounds only; no clinical thresholds (see DATABASE.md).

export const NOTE_MAX = 2000;
export const RETURN_REASON_MAX = 1000;
export const TRANSCRIPT_MAX = 16000;

const codePoints = (s: string) => [...s].length;

export const VisitState = z.enum(["draft", "submitted", "returned", "approved"]);
export type VisitState = z.infer<typeof VisitState>;

// Offsets are Unicode code points into the frozen transcript.
export const Source = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("transcript"),
      span: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]),
    })
    .strict()
    .refine((s) => s.span[0] < s.span[1], { message: "span start must be before end" }),
  z.object({ type: z.literal("manual") }).strict(),
]);
export type Source = z.infer<typeof Source>;

// Only `recorded` carries a value; missing states never default to zero/false.
function tagged<V extends z.ZodRawShape>(valueShape: V) {
  return z.discriminatedUnion("status", [
    z.object({ status: z.literal("recorded"), ...valueShape, source: Source }).strict(),
    z.object({ status: z.literal("not_measured") }).strict(),
    z.object({ status: z.literal("unknown") }).strict(),
    z.object({ status: z.literal("not_mentioned") }).strict(),
  ]);
}

const posInt = z.number().int().min(1).max(999);

export const BloodPressure = tagged({
  systolic: posInt,
  diastolic: posInt,
  unit: z.literal("mmHg"),
});

// Normalized decimal string, e.g. "9" or "9.5". Ambiguous forms are rejected.
export const Hemoglobin = tagged({
  value: z.string().regex(/^\d{1,2}(\.\d{1,2})?$/, "hemoglobin must be a plain decimal"),
  unit: z.literal("g/dL"),
});

export const TtDoseMention = tagged({
  text: z
    .string()
    .min(1)
    .refine((s) => codePoints(s) <= 120, "TT mention too long"),
});

export const FollowUpDate = tagged({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => {
    const t = Date.parse(`${d}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().startsWith(d);
  }, "invalid calendar date"),
});

export const Observations = z
  .object({
    bloodPressure: BloodPressure,
    hemoglobin: Hemoglobin,
    ttDose: TtDoseMention,
    followUpDate: FollowUpDate,
  })
  .strict();
export type Observations = z.infer<typeof Observations>;

export const Note = z.string().refine((s) => codePoints(s) <= NOTE_MAX, `note exceeds ${NOTE_MAX} code points`);

// Content of one immutable revision (what contentHash covers).
export const RevisionContent = z
  .object({
    visitAt: z.iso.datetime({ offset: true }),
    visitTimezone: z.string().min(1).max(64),
    observations: Observations,
    note: Note.optional(),
    transcript: z
      .string()
      .refine((s) => codePoints(s) <= TRANSCRIPT_MAX, "transcript too long")
      .optional(),
    unresolvedAcknowledged: z.array(z.enum(["bloodPressure", "hemoglobin", "ttDose", "followUpDate"])).default([]),
  })
  .strict();
export type RevisionContent = z.infer<typeof RevisionContent>;

export const ReturnReason = z
  .string()
  .min(1)
  .refine((s) => codePoints(s) <= RETURN_REASON_MAX, `reason exceeds ${RETURN_REASON_MAX} code points`);

export const IdempotencyKey = z.string().min(16).max(128).regex(/^[A-Za-z0-9._-]+$/);

export const ErrorCode = z.enum([
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "STALE_REVISION",
  "IDEMPOTENCY_CONFLICT",
  "TOO_LARGE",
  "UNSUPPORTED_MEDIA",
  "UNRESOLVED_INPUT",
  "RATE_LIMITED",
  "PROVIDER_FAILURE",
  "TIMEOUT",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorEnvelope = z
  .object({
    error: z.object({ code: ErrorCode, message: z.string() }).strict(),
    requestId: z.string(),
  })
  .strict();

// Request bodies (API.md). Unknown keys rejected.
export const ConfirmRequest = z
  .object({
    revision: z.number().int().min(1),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    unresolvedAcknowledged: z.array(z.string()).default([]),
  })
  .strict();

export const SubmitRequest = z.object({ revision: z.number().int().min(1) }).strict();

export const ReviewRequest = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), revision: z.number().int().min(1) }).strict(),
  z.object({ action: z.literal("return"), revision: z.number().int().min(1), reason: ReturnReason }).strict(),
]);
