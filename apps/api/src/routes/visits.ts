import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@sakhiline/db";
import {
  AppError,
  IdempotencyKey,
  RevisionContent,
  ConfirmRequest,
  SubmitRequest,
} from "@sakhiline/contracts";
import { z } from "zod";
import { assertRole } from "../policy/assignments.js";
import { ContextStore } from "../auth/contextStore.js";
import {
  createVisit,
  getVisit,
  editDraft,
  confirmRevision,
  submitVisit,
  reopenVisit,
  readbackVisit,
  parseETag,
  makeETag,
} from "../domain/visits.js";

const CreateVisitBody = z
  .object({
    contextId: z.string(),
    visitAt: z.iso.datetime({ offset: true }),
    visitTimezone: z.string().min(1).max(64),
  })
  .strict();

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

function requireIdempotencyKey(req: Request): string {
  const key = req.headers["idempotency-key"];
  if (!key || typeof key !== "string") {
    throw new AppError("VALIDATION", "Idempotency-Key header is required");
  }
  const parsed = IdempotencyKey.safeParse(key);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION",
      "Invalid Idempotency-Key format (must be 16-128 chars alphanumeric, dot, dash, underscore)"
    );
  }
  return parsed.data;
}

export function createVisitsRouter(deps: {
  prisma: PrismaClient;
  contextStore: ContextStore;
}) {
  const router = Router();

  // POST /visits
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const body = CreateVisitBody.parse(req.body);

      // Validate contextId
      const contextRecord = deps.contextStore.getValid(body.contextId, req.actor.id);
      if (!contextRecord) {
        throw new AppError("FORBIDDEN", "Invalid or expired identity context");
      }

      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

      const result = await createVisit(deps, {
        actor: req.actor,
        beneficiaryId: contextRecord.beneficiaryId,
        visitAt: body.visitAt,
        visitTimezone: body.visitTimezone,
        idempotencyKey,
        ctx: req.requestContext!,
      });

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /visits/:id
  router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.actor) {
        throw new AppError("UNAUTHENTICATED", "Authentication required");
      }
      const visitId = req.params.id as string;

      const visit = await getVisit(deps, {
        actor: req.actor,
        visitId,
      });

      const etag = makeETag(visit.id, visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(visit);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /visits/:id/draft
  router.patch("/:id/draft", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);

      const content = RevisionContent.parse(req.body);

      const result = await editDraft(deps, {
        actor: req.actor,
        visitId,
        expectedRevision,
        content,
        ctx: req.requestContext!,
      });

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/confirm
  router.post("/:id/confirm", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);

      const data = ConfirmRequest.parse(req.body);

      const result = await confirmRevision(deps, {
        actor: req.actor,
        visitId,
        expectedRevision,
        data,
        ctx: req.requestContext!,
      });

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/submit
  router.post("/:id/submit", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);
      const idempotencyKey = requireIdempotencyKey(req);

      const data = SubmitRequest.parse(req.body);

      const result = await submitVisit(deps, {
        actor: req.actor,
        visitId,
        expectedRevision,
        data,
        idempotencyKey,
        requestBody: req.body,
        ctx: req.requestContext!,
      });

      if (result.isReplay) {
        res.setHeader("Idempotent-Replay", "true");
      }

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/reopen
  router.post("/:id/reopen", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);

      const result = await reopenVisit(deps, {
        actor: req.actor,
        visitId,
        expectedRevision,
        ctx: req.requestContext!,
      });

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/readback
  router.post("/:id/readback", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.actor) {
        throw new AppError("UNAUTHENTICATED", "Authentication required");
      }
      const visitId = req.params.id as string;

      const result = await readbackVisit(deps, {
        actor: req.actor,
        visitId,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /visits/:id/reviews
  router.post("/:id/reviews", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "supervisor");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);
      const idempotencyKey = requireIdempotencyKey(req);

      const { ReviewRequest } = await import("@sakhiline/contracts");
      const data = ReviewRequest.parse(req.body);

      const { reviewVisit } = await import("../domain/visits.js");
      const result = await reviewVisit(deps, {
        actor: req.actor,
        visitId,
        expectedRevision,
        action: data.action,
        reason: data.action === "return" ? data.reason : undefined,
        idempotencyKey,
        requestBody: req.body,
        ctx: req.requestContext!,
      });

      if (result.isReplay) {
        res.setHeader("Idempotent-Replay", "true");
      }

      const etag = makeETag(result.visit.id, result.visit.currentRevision);
      res.setHeader("ETag", etag);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
