import { Request, Response, NextFunction } from "express";
import { Actor, IdentityVerifier, RequestContext, AppError } from "@sakhiline/contracts";
import { SessionPayload, verifySession } from "./session.js";

declare global {
  namespace Express {
    interface Request {
      actor?: Actor;
      session?: SessionPayload;
      requestContext?: RequestContext;
    }
  }
}

export function createAuthMiddleware(verifier: IdentityVerifier) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // Johny's request context
      const requestId =
        (req.headers["x-request-id"] as string) ||
        `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      req.requestContext = {
        requestId,
        log: {
          info: (o: object, m?: string) => console.log(JSON.stringify({ level: "info", requestId, ...o, msg: m })),
          warn: (o: object, m?: string) => console.warn(JSON.stringify({ level: "warn", requestId, ...o, msg: m })),
          error: (o: object, m?: string) => console.error(JSON.stringify({ level: "error", requestId, ...o, msg: m })),
        },
      };

      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headers[k] = Array.isArray(v) ? v[0] : v;
      }
      const cookies: Record<string, string | undefined> = req.cookies || {};

      const actor = await verifier.verify({ headers, cookies });
      if (actor) {
        req.actor = actor;

        // If session cookie exists and is valid, attach it
        const cookie = cookies["sakhi_session"];
        if (cookie) {
          const session = verifySession(cookie);
          if (session) {
            req.session = session;
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.actor) {
    return next(new AppError("UNAUTHENTICATED", "Authentication required"));
  }
  next();
}

export function requireRole(role: "worker" | "supervisor") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.actor) {
      return next(new AppError("UNAUTHENTICATED", "Authentication required"));
    }
    if (req.actor.role !== role) {
      return next(new AppError("FORBIDDEN", "Insufficient role permissions"));
    }
    next();
  };
}
