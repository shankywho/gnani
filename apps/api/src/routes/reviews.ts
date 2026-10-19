import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, listPendingReviews } from "@sakhiline/db";
import { assertRole } from "../policy/assignments.js";

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
