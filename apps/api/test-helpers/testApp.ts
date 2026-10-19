import express, { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@sakhiline/db";
import { IdentityVerifier, AppError, isAppError } from "@sakhiline/contracts";
import { createAuthMiddleware } from "../src/auth/identity.js";
import { csrfProtection } from "../src/auth/csrf.js";
import { createSessionRouter } from "../src/routes/session.js";
import { createBeneficiariesRouter } from "../src/routes/beneficiaries.js";
import { createVisitsRouter } from "../src/routes/visits.js";
import { createReviewsRouter } from "../src/routes/reviews.js";
import { createExtractionsRouter } from "../src/routes/extractions.js";
import { Extractor } from "../src/extraction/index.js";
import { MockExtractionProvider } from "../src/extraction/mock.js";
import { createStubStageClip, createStubTranscribe } from "./stubs.js";
import { StageClip, TranscribeClip } from "@sakhiline/contracts";
import { ContextStore } from "../src/auth/contextStore.js";
import { FixtureVerifier } from "../src/auth/fixtureVerifier.js";

export interface TestAppDependencies {
  prisma: PrismaClient;
  verifier?: IdentityVerifier;
  contextStore?: ContextStore;
  now?: () => Date;
  transcribe?: TranscribeClip;
  stageClip?: StageClip;
  extraction?: Extractor;
  extraRouters?: { path: string; router: express.Router }[];
}

export function createTestApp(deps: TestAppDependencies): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const verifier = deps.verifier || new FixtureVerifier(deps.prisma);
  const contextStore = deps.contextStore || new ContextStore(600, deps.now);

  // Authentication & Johny requestContext injection
  app.use(createAuthMiddleware(verifier));

  // CSRF protection for mutations
  app.use(csrfProtection);

  const transcribe = deps.transcribe || createStubTranscribe();
  const stageClip = deps.stageClip || createStubStageClip();
  const extraction = deps.extraction || new Extractor(new MockExtractionProvider());

  // Routers
  app.use("/api/v1/session", createSessionRouter({ prisma: deps.prisma }));
  app.use(
    "/api/v1/beneficiaries",
    createBeneficiariesRouter({ prisma: deps.prisma, contextStore })
  );
  app.use(
    "/api/v1/visits",
    createVisitsRouter({ prisma: deps.prisma, contextStore })
  );
  app.use(
    "/api/v1/visits",
    createExtractionsRouter({
      prisma: deps.prisma,
      transcribe,
      stageClip,
      extraction,
    })
  );
  app.use(
    "/api/v1/reviews",
    createReviewsRouter({ prisma: deps.prisma })
  );

  if (deps.extraRouters) {
    for (const r of deps.extraRouters) {
      app.use(r.path, r.router);
    }
  }

  // Error handling middleware
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestContext?.requestId || "req-unknown";

    if (isAppError(err)) {
      res.status(err.statusCode).json(err.toEnvelope(requestId));
      return;
    }

    if ((err as any)?.name === "ZodError") {
      res.status(400).json({
        error: {
          code: "VALIDATION",
          message: (err as Error).message,
        },
        requestId,
      });
      return;
    }

    console.error("Unhandled testApp error:", err);
    res.status(500).json({
      error: {
        code: "VALIDATION",
        message: err instanceof Error ? err.message : "Internal error",
      },
      requestId,
    });
  });

  return app;
}
