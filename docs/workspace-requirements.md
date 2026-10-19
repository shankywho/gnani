# Workspace Requirements & Integration Guide for Johny

This document outlines all integration seams, package configurations, environment variables, router mountings, and required script names implemented in Shanky's lane for teammate Johny to wire into root npm workspaces, `apps/api/src/server.ts`, and `apps/web/`.

---

## 1. Monorepo Package Structure
Shanky's lane created and maintained the following workspace packages:
- `packages/contracts`: Shared TypeScript schemas (Zod), types, error classes, seams, contentHash canonical JSON.
- `packages/db`: Prisma 7.10.1 ORM configuration, migrations (`0001_initial`), SQL immutability triggers, seed, and data repositories (`actors`, `assignments`, `beneficiaries`, `visits`, `idempotency`, `audit`, `evaluation`). Only `packages/db` imports Prisma.
- `apps/api`: Express 5 / Node.js backend logic containing auth, policy, domain visits, extraction pipeline, and router factories.
- `eval`: Evaluation framework containing 30 synthetic scenarios, Mulberry32 noise generator, deterministic exact-match scorer, nearest-rank metrics aggregator, and manifest loader.

---

## 2. Required Root Scripts
When Johny creates the root `package.json`, the following npm scripts are required to drive verification across the workspaces:
- `npm run typecheck`: Runs `tsc --noEmit` across `packages/contracts`, `packages/db`, `apps/api`, and `eval`.
- `npm run test`: Runs unit tests across all packages.
- `npm run test:integration`: Runs database and API integration tests against the test PostgreSQL container.
- `npm run db:migrate:test`: Deploys Prisma migrations against test DB (`prisma migrate deploy`).
- `npm run db:seed:test`: Runs idempotent seed against test DB (`npx tsx prisma/seed.ts`).
- `npm run eval:self-test`: Runs scorer unit tests (`vitest run tests/scorer.test.ts` in `eval`).
- `npm run test:security`: Runs security tests (`vitest run tests/security/security.test.ts`).
- `npm run test:load:fixture`: Runs 250-concurrency load test (`vitest run tests/load/fixture/load.test.ts`).

---

## 3. Ports & Test Environment
- **Test PostgreSQL Port:** `54320` (configured in `packages/db/docker-compose.test.yml`).
- **Database Connection String:** `postgresql://sakhi:sakhi@localhost:54320/sakhiline_test?schema=public`
- **Application Default Port:** `3000` (or `PORT` env var).

---

## 4. Environment Variables
Add the following to `.env` / runtime configuration:
- `DATABASE_URL`: Postgres connection URL (e.g. `postgresql://sakhi:sakhi@localhost:54320/sakhiline_test?schema=public`).
- `APP_MODE`: `"local"` (allows fixture verification for tests/demo) or `"live"` (strictly rejects fixture verifier with 401).
- `SESSION_SECRET`: Secret key (minimum 32 characters) for signing session cookies and HMAC CSRF tokens. Default in test mode is `sakhiline-default-test-secret-min-32-chars!`.
- `GNANI_API_KEY`: Server-only API key for Gnani speech services (Johny's layer).

---

## 5. Router Factories & Mounting in `apps/api/src/server.ts`
Shanky's lane provides modular router factories in `apps/api/src/routes/`. Mount them in `server.ts` as follows:

```typescript
import express from "express";
import cookieParser from "cookie-parser";
import { getPrismaClient } from "@sakhiline/db";
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

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const prisma = getPrismaClient();
const contextStore = new ContextStore(600); // 10-minute context TTL

// 1. Identity & RequestContext Middleware (injects req.actor, req.session, req.requestContext)
// Johny can pass OIDC verifier or FixtureVerifier
const verifier = new FixtureVerifier(prisma);
app.use(createAuthMiddleware(verifier));

// 2. CSRF Protection for mutations
app.use(csrfProtection);

// 3. Mount Routers
app.use("/api/v1/session", createSessionRouter({ prisma }));
app.use("/api/v1/beneficiaries", createBeneficiariesRouter({ prisma, contextStore }));
app.use("/api/v1/visits", createVisitsRouter({ prisma, contextStore }));
app.use("/api/v1/reviews", createReviewsRouter({ prisma }));

// 4. Extraction Router (requires Johny's transcribe and stageClip adapters)
const extraction = new Extractor(new MockExtractionProvider());
app.use("/api/v1/visits", createExtractionsRouter({
  prisma,
  transcribe, // TranscribeClip adapter from Johny
  stageClip,  // StageClip adapter from Johny
  extraction,
}));

// 5. Standard Error Middleware mapping AppError to { error: { code, message }, requestId }
```

---

## 6. Adapter Interfaces
Johny's adapters must satisfy the contracts defined in `@sakhiline/contracts`:

### `RequestContext`
```typescript
export interface RequestContext {
  requestId: string;
  log: {
    info(obj: object, msg?: string): void;
    warn(obj: object, msg?: string): void;
    error(obj: object, msg?: string): void;
  };
}
```

### `StageClip`
```typescript
export type StageClip = (upload: {
  buffer: Buffer;
  mimeType: string;
}) => Promise<{
  path: string;
  mimeType: string;
  seconds: number;
  cleanup(): Promise<void>; // Guaranteed cleanup hook
}>;
```

### `TranscribeClip` & `SttResult`
```typescript
export type TranscribeClip = (
  clip: { path: string; mimeType: string; seconds: number },
  language: string
) => Promise<SttResult>;

export type SttResult =
  | {
      ok: true;
      transcript: string;
      providerRequestId?: string;
      latencyMs: number;
      mode: "mock" | "live";
    }
  | {
      ok: false;
      code: "UNSUPPORTED_MEDIA" | "TIMEOUT" | "RATE_LIMITED" | "PROVIDER_FAILURE";
      latencyMs: number;
    };
```

### `eval/src/run.ts` Execution
Johny's `eval/src/run.ts` can import runner types and scorers directly from `@sakhiline/eval`:
```typescript
import { loadManifest } from "@sakhiline/eval";
import { applyNoise } from "@sakhiline/eval";
import { scoreCase } from "@sakhiline/eval";
import { aggregateResults } from "@sakhiline/eval";
```
Persist runs and results to the database via `@sakhiline/db` repositories: `createEvaluationRun` and `recordEvaluationResult`.
