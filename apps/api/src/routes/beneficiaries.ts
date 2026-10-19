import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient, listAssignedBeneficiaries, listHistoricalVisits } from "@sakhiline/db";
import { AppError } from "@sakhiline/contracts";
import { assertRole, assertWorkerBeneficiary } from "../policy/assignments.js";
import { ContextStore } from "../auth/contextStore.js";

export function createBeneficiariesRouter(deps: {
  prisma: PrismaClient;
  contextStore: ContextStore;
}) {
  const router = Router();

  // GET /beneficiaries?cursor=&limit=
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");

      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await listAssignedBeneficiaries(deps.prisma, {
        organizationId: req.actor.organizationId,
        workerId: req.actor.id,
        cursor,
        limit,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /beneficiaries/:id/context
  router.post("/:id/context", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const beneficiaryId = req.params.id as string;

      // Assignment check: deny by default, unassigned is indistinguishable 404
      await assertWorkerBeneficiary(deps.prisma, {
        organizationId: req.actor.organizationId,
        workerId: req.actor.id,
        beneficiaryId,
      });

      const context = deps.contextStore.create(req.actor.id, beneficiaryId);
      res.json(context);
    } catch (err) {
      next(err);
    }
  });

  // GET /beneficiaries/:id/history?contextId=
  router.get("/:id/history", async (req: Request, res: Response, next: NextFunction) => {
    try {
      assertRole(req.actor, "worker");
      const beneficiaryId = req.params.id as string;
      const contextId = req.query.contextId;

      if (!contextId || typeof contextId !== "string") {
        throw new AppError("FORBIDDEN", "Missing identity context");
      }

      // Check context validity (must match actor, beneficiary, and not be expired)
      const valid = deps.contextStore.validate(contextId, req.actor.id, beneficiaryId);
      if (!valid) {
        throw new AppError("FORBIDDEN", "Invalid or expired identity context");
      }

      // Fresh assignment check
      await assertWorkerBeneficiary(deps.prisma, {
        organizationId: req.actor.organizationId,
        workerId: req.actor.id,
        beneficiaryId,
      });

      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const result = await listHistoricalVisits(deps.prisma, {
        organizationId: req.actor.organizationId,
        workerId: req.actor.id,
        beneficiaryId,
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
