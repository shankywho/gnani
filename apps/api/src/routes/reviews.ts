import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, listPendingReviews } from "@sakhiline/db";
import { AppError, IdempotencyKey, ReviewRequest } from "@sakhiline/contracts";
import { assertRole } from "../policy/assignments.js";
import { reviewVisit, parseETag, makeETag } from "../domain/visits.js";

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

export function createReviewsRouter(deps: { prisma: PrismaClient }) {
  const router = Router();

  // GET /reviews?cursor=&limit=
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "supervisor");

      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await listPendingReviews(deps.prisma, {
        organizationId: req.actor.organizationId,
        supervisorId: req.actor.id,
        cursor,
        limit,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function createVisitReviewActionRouter(deps: { prisma: PrismaClient }) {
  const router = Router({ mergeParams: true });

  // POST /visits/:id/reviews
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "supervisor");
      const visitId = req.params.id as string;
      const expectedRevision = requireIfMatch(req);
      const idempotencyKey = requireIdempotencyKey(req);

      const data = ReviewRequest.parse(req.body);

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
