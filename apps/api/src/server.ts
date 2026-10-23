import express, { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { pathToFileURL } from "node:url";
import { PrismaClient, getPrismaClient } from "@sakhiline/db";
import { AppError, isAppError, StageClip, TranscribeClip } from "@sakhiline/contracts";
import { authEnv } from "./auth/env.js";
import { createAuthMiddleware } from "./auth/identity.js";
import { csrfProtection } from "./auth/csrf.js";
import { ContextStore } from "./auth/contextStore.js";
import { FixtureVerifier } from "./auth/fixtureVerifier.js";
import { createSessionRouter } from "./routes/session.js";
import { createBeneficiariesRouter } from "./routes/beneficiaries.js";
import { createVisitsRouter } from "./routes/visits.js";
import { createReviewsRouter } from "./routes/reviews.js";
import { createExtractionsRouter } from "./routes/extractions.js";
import { Extractor } from "./extraction/index.js";
import { MockExtractionProvider } from "./extraction/mock.js";
import { HttpStubExtractionProvider } from "./extraction/httpStub.js";
import { stageClip } from "./media/stage.js";
import { sweepStaging } from "./media/cleanup.js";
import { createGnaniTranscribe, mockTranscribe } from "./providers/gnani.js";

export interface AppDeps {
  prisma: PrismaClient;
  transcribe: TranscribeClip;
  stageClip: StageClip;
  /** Shown on /health so the UI can label fixture speech honestly. */
  sttMode?: "mock" | "gnani";
}

export function createApp(deps: AppDeps): Express {
  const { prisma } = deps;
  const app = express();
  app.disable("x-powered-by");

  app.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", mode: authEnv.APP_MODE, stt: deps.sttMode ?? "mock" });
    } catch {
      res.status(503).json({ status: "db_unavailable" });
    }
  });

  // Authenticated, per-actor data: never cache. The visit ETag only tracks the revision, so a cached
  // 304 would hide confirm/submit/review state changes that keep the same revision.
  app.use("/api", (req, res, next) => {
    delete req.headers["if-none-match"]; // never answer 304 from a stale browser copy
    res.set("Cache-Control", "no-store");
    next();
  });

  // Audio arrives base64 in JSON: 10 MiB of audio is ~13.4 MB encoded.
  app.use(express.json({ limit: "15mb" }));
  app.use(cookieParser());
  // One access line per request (read at finish, after auth sets requestContext); never bodies, cookies or query strings.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () =>
      req.requestContext?.log.info({
        op: "http",
        method: req.method,
        path: req.baseUrl + (req.route?.path ?? req.path),
        status: res.statusCode,
        actorRole: req.actor?.role,
        durationMs: Date.now() - start,
      })
    );
    next();
  });

  app.use(createAuthMiddleware(new FixtureVerifier(prisma))); // sets req.actor and req.requestContext
  app.use(csrfProtection);

  const extraction = new Extractor(
    process.env.EXTRACTION_PROVIDER === "http" ? new HttpStubExtractionProvider() : new MockExtractionProvider()
  );
  const contextStore = new ContextStore(authEnv.CONTEXT_TTL_SECONDS);

  app.use("/api/v1/session", createSessionRouter({ prisma }));
  app.use("/api/v1/beneficiaries", createBeneficiariesRouter({ prisma, contextStore }));
  app.use("/api/v1/visits", createVisitsRouter({ prisma, contextStore }));
  app.use("/api/v1/visits", createExtractionsRouter({ prisma, transcribe: deps.transcribe, stageClip: deps.stageClip, extraction }));
  app.use("/api/v1/reviews", createReviewsRouter({ prisma }));

  app.use("/api", (_req, _res, next) => next(new AppError("NOT_FOUND", "Resource not found")));

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestContext?.requestId ?? "req-unknown";
    if (isAppError(err)) {
      res.status(err.statusCode).json(err.toEnvelope(requestId));
      return;
    }
    const e = err as { name?: string; type?: string; status?: number };
    if (e?.name === "ZodError" || e?.type === "entity.parse.failed") {
      res.status(400).json({ error: { code: "VALIDATION", message: "Invalid request body" }, requestId });
      return;
    }
    if (e?.type === "entity.too.large") {
      res.status(413).json({ error: { code: "TOO_LARGE", message: "Request too large" }, requestId });
      return;
    }
    req.requestContext?.log.error({ op: "unhandled", errorClass: e?.name ?? typeof err }, "unhandled error");
    // ponytail: ErrorCode has no INTERNAL; ask Shanky to add it to packages/contracts if clients need it typed.
    res.status(500).json({ error: { code: "INTERNAL", message: "Internal error" }, requestId });
  });

  return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3000);
  const sttMode = process.env.STT_PROVIDER === "gnani" ? "gnani" : "mock";
  if (sttMode === "gnani" && !process.env.GNANI_API_KEY) throw new Error("STT_PROVIDER=gnani requires GNANI_API_KEY");
  // No silent fallback: live mode refuses to run on fixture speech.
  if (authEnv.APP_MODE === "live" && sttMode === "mock") throw new Error("APP_MODE=live requires STT_PROVIDER=gnani");
  const transcribe =
    sttMode === "gnani"
      ? createGnaniTranscribe({ apiKey: process.env.GNANI_API_KEY!, languageCode: process.env.GNANI_LANGUAGE_CODE })
      : mockTranscribe;

  await sweepStaging();
  const app = createApp({ prisma: getPrismaClient(), transcribe, stageClip, sttMode });
  app.listen(port, () => console.log(JSON.stringify({ level: "info", msg: "api listening", port, mode: authEnv.APP_MODE, stt: sttMode })));
}
