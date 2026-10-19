import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@sakhiline/db";
import { AppError } from "@sakhiline/contracts";
import { signSession, computeCsrfToken, SessionPayload, SESSION_TTL_MS } from "../auth/session.js";
import { randomBytes } from "node:crypto";
import { authEnv } from "../auth/env.js";

export function createSessionRouter(deps: { prisma: PrismaClient }) {
  const router = Router();

  router.get("/", (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.actor) {
        throw new AppError("UNAUTHENTICATED", "Authentication required");
      }

      // Generate or retrieve CSRF token
      const csrfSecret = req.session?.csrfSecret || randomBytes(16).toString("hex");
      const csrfToken = computeCsrfToken(csrfSecret);

      res.json({
        actor: req.actor,
        csrfToken,
      });
    } catch (err) {
      next(err);
    }
  });

  // Local/test helper to set session cookie for fixture testing
  router.post("/fixture-login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (authEnv.APP_MODE === "live" || !authEnv.FIXTURE_AUTH) {
        throw new AppError("FORBIDDEN", "Fixture login not allowed in live mode");
      }

      const { actorId } = req.body as { actorId?: string };
      if (!actorId) {
        throw new AppError("VALIDATION", "actorId required");
      }

      let actor = await deps.prisma.actor.findUnique({
        where: { id: actorId },
      });
      if (!actor) {
        actor = await deps.prisma.actor.findUnique({
          where: { issuer_subject: { issuer: "fixture", subject: actorId } },
        });
      }
      if (!actor || !actor.active) {
        throw new AppError("NOT_FOUND", "Actor not found");
      }

      const csrfSecret = randomBytes(16).toString("hex");
      const payload: SessionPayload = {
        actorId: actor.id,
        organizationId: actor.organizationId,
        role: actor.role as "worker" | "supervisor",
        csrfSecret,
        exp: Date.now() + SESSION_TTL_MS,
      };

      const token = signSession(payload);
      res.cookie("sakhi_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });

      res.json({
        actor: {
          id: actor.id,
          organizationId: actor.organizationId,
          role: actor.role,
        },
        csrfToken: computeCsrfToken(csrfSecret),
      });
    } catch (err) {
      next(err);
    }
  });

  // Clears the cookie. Sessions are stateless and expire server-side after SESSION_TTL_MS.
  router.post("/logout", (_req: Request, res: Response) => {
    res.clearCookie("sakhi_session");
    res.status(204).end();
  });

  return router;
}
