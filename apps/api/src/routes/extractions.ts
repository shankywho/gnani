import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@sakhiline/db";
import {
  TranscribeClip,
  StageClip,
  AppError,
  AcceptProposalRequest,
  Proposal,
  RevisionContent,
} from "@sakhiline/contracts";
import { assertRole, assertWorkerVisit } from "../policy/assignments.js";
import { Extractor } from "../extraction/index.js";
import { getVisit, editDraft, parseETag, makeETag } from "../domain/visits.js";

function requireIfMatch(req: Request): number {
  const ifMatch = req.headers["if-match"];
  if (!ifMatch || typeof ifMatch !== "string") {
    throw new AppError("VALIDATION", "If-Match header is required");
  }
  const rev = parseETag(ifMatch);
  if (rev === null) {
    throw new AppError("VALIDATION", "Invalid If-Match ETag");
  }
  return rev;
}

export function createExtractionsRouter(deps: {
  transcribe: TranscribeClip;
  stageClip: StageClip;
  extraction: Extractor;
  prisma: PrismaClient;
}) {
  const router = Router();
  const proposalStore = new Map<string, Proposal>();

  // POST /visits/:id/extractions
  router.post("/:id/extractions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;

      await assertWorkerVisit(deps.prisma, {
        organizationId: req.actor.organizationId,
        workerId: req.actor.id,
        visitId,
      });

      const visit = await getVisit({ prisma: deps.prisma }, {
        actor: req.actor,
        visitId,
      });

      if (visit.state !== "draft") {
        throw new AppError("VALIDATION", "Extractions allowed only for draft visits");
      }

      // Input audio parsing (buffer or simulate from body)
      const audioBuffer = req.body?.audio
        ? Buffer.from(req.body.audio, "base64")
        : Buffer.from("mock audio content", "utf8");
      const mimeType = req.body?.mimeType || "audio/wav";
      const language = req.body?.language || "hi-IN";

      // 1. Stage clip with cleanup guaranteed
      const clip = await deps.stageClip({ buffer: audioBuffer, mimeType });
      let sttResult;
      try {
        // 2. Transcribe
        sttResult = await deps.transcribe(clip, language);
      } finally {
        // Guaranteed cleanup
        await clip.cleanup();
      }

      if (!sttResult.ok) {
        if (sttResult.code === "TIMEOUT") {
          throw new AppError("TIMEOUT", "Speech transcription timed out", 504);
        } else if (sttResult.code === "UNSUPPORTED_MEDIA") {
          throw new AppError("UNSUPPORTED_MEDIA", "Unsupported media format", 415);
        } else if (sttResult.code === "RATE_LIMITED") {
          throw new AppError("RATE_LIMITED", "Speech provider rate limited", 429);
        } else {
          throw new AppError("PROVIDER_FAILURE", "Speech provider failure", 502);
        }
      }

      // 3. Extract observations from transcript
      const currentRev = visit.currentRevisionData;
      const proposal = await deps.extraction.extract({
        baseRevision: visit.currentRevision,
        transcript: sttResult.transcript,
        visitAt: currentRev?.visitAt.toISOString() || new Date().toISOString(),
        visitTimezone: currentRev?.visitTimezone || "Asia/Kolkata",
      });

      proposalStore.set(proposal.proposalId, proposal);

      res.json({ proposal });
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/proposals/:pid/accept
  router.post("/:id/proposals/:pid/accept", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;
      const proposalId = req.params.pid as string;
      const expectedRevision = requireIfMatch(req);

      const body = AcceptProposalRequest.parse(req.body);

      const proposal = proposalStore.get(proposalId);
      if (!proposal) {
        throw new AppError("NOT_FOUND", "Proposal not found");
      }

      const visit = await getVisit({ prisma: deps.prisma }, {
        actor: req.actor,
        visitId,
      });

      // SAKHILINE_BUILD.md §9: Late proposal accept after manual edit -> 409 STALE_REVISION, no change
      if (proposal.baseRevision !== visit.currentRevision || visit.currentRevision !== expectedRevision) {
        throw new AppError(
          "STALE_REVISION",
          "Proposal base revision does not match current visit revision"
        );
      }

      const currentContent = visit.currentRevisionData;
      const newObservations = {
        ...(currentContent?.observations as any),
      };

      for (const field of body.fields) {
        newObservations[field] = proposal.observations[field];
      }

      const updatedContent: RevisionContent = {
        visitAt: currentContent?.visitAt.toISOString() || new Date().toISOString(),
        visitTimezone: currentContent?.visitTimezone || "Asia/Kolkata",
        observations: newObservations,
        note: currentContent?.note || undefined,
        transcript: proposal.transcript,
        unresolvedAcknowledged: [],
      };

      const result = await editDraft({ prisma: deps.prisma }, {
        actor: req.actor,
        visitId,
        expectedRevision: visit.currentRevision,
        content: updatedContent,
        ctx: req.requestContext!,
      });

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
