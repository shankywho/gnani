import { Request, Response, NextFunction } from "express";
import { AppError } from "@sakhiline/contracts";
import { timingSafeEqual } from "node:crypto";
import { computeCsrfToken } from "./session.js";

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // Safe HTTP methods do not require CSRF token
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Session must be attached
  const session = (req as unknown as { session?: { csrfSecret: string } }).session;
  if (!session?.csrfSecret) {
    // If not authenticated, identity middleware will handle 401; but if authenticated without CSRF, reject
    return next();
  }

  const token = req.headers["x-csrf-token"];
  if (!token || typeof token !== "string") {
    return next(new AppError("FORBIDDEN", "Missing CSRF token"));
  }

  const expectedToken = computeCsrfToken(session.csrfSecret);
  const a = Buffer.from(token);
  const b = Buffer.from(expectedToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return next(new AppError("FORBIDDEN", "Invalid CSRF token"));
  }

  next();
}
