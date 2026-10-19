# SakhiLine Build Summary — Shanky Lane

## 1. Phases Status

| Phase | Description | Status | Commit |
|---|---|---|---|
| Phase 0 | Decisions & Seams (`DECISIONS.md`, `HANDOFF.md`, `seams.ts`, `errors.ts`) | **COMPLETE** | `3773a6c` |
| Phase 1 | Contracts (`contentHash.ts`, `proposal.ts`, `visit.ts`, Zod schemas) | **COMPLETE** | `e847efd` |
| Phase 2 | Database & Repositories (Postgres 16, Prisma 7.10.1, SQL triggers, seed) | **COMPLETE** | `7ef975b` |
| Phase 3 | Auth & Policy (`session.ts`, `csrf.ts`, `contextStore.ts`, deny-by-default) | **COMPLETE** | `a41d65a` |
| Phase 4 | Domain & Visit Routes (`domain/visits.ts`, `routes/visits.ts`, ETags) | **COMPLETE** | `5d04642` |
| Phase 5 | Review Loop (`routes/reviews.ts`, reopen, readback, concurrency races) | **COMPLETE** | `a7abb19` |
| Phase 6 | Extraction (`extraction/*`, `routes/extractions.ts`, proposal accept) | **COMPLETE** | `5bbd08d` |
| Phase 7 | Scorer & Corpus (30 scenarios, noise, exact-match scorer, aggregate) | **COMPLETE** | `dd6702e` |
| Phase 8 | Hardening (Security tests, log capture, 250-load test, e2e skeletons, docs) | **COMPLETE** | Pending |

**Blocked Phases:** None. All phases 0 through 8 are 100% complete. Stretch phase S remains optional backlog per §16.

---

## 2. Assumptions Affecting Correctness (from `DECISIONS.md`)
- **A-0 (Authorization):** Autonomous execution authorized strictly for Shanky's backend/data/eval lane with synthetic data and zero paid spend.
- **A-1 (Primary Language):** Mixed Hindi/English (Hinglish) with English clinical loanwords.
- **A-2 (Identity Verification):** Local mode uses `FixtureVerifier`; live mode (`APP_MODE=live`) strictly rejects fixture verification.
- **A-3 (Extraction Abstraction):** Deterministic regex double (`MockExtractionProvider`) and unconfigured stub (`HttpStubExtractionProvider`); no external LLM keys required.
- **A-4 (Resource Bounds):** Context TTL 600s; note <= 2,000 code points; transcript <= 16,000 code points; return reason <= 1,000 code points; idempotency key 16–128 chars.
- **A-5 (Clinical Thresholds):** Strict non-clinical boundary. Zero invented diagnostic thresholds, risk tiers, or triage alerts.
- **A-6 (Package Architecture):** Standalone packages (`packages/contracts`, `packages/db`, `apps/api`, `eval`) with zero edits to Johny's monorepo root files.
- **A-7 (API Shim):** Minimal `@sakhiline/api` shim used for development without touching Johny's `server.ts`.
- **A-8 (Evaluation Isolation):** Evaluation tables isolated without foreign keys to clinical tables; verified zero cross-table mutations.
- **A-9 (Proposal Store):** Proposals cached ephemerally and validated against `baseRevision`; stale accept fails with 409 `STALE_REVISION`.
- **A-10 (Exact Canonical Matching):** Scorer enforces exact normalized decimal/integer comparison; zero fuzzy numeric passes; failures retained in denominators.

---

## 3. What You Need from Johny
1. **Root Monorepo Wiring:** Hoist workspaces in root `package.json` to encompass `packages/contracts`, `packages/db`, `apps/api`, `eval`.
2. **HTTP Server Entrypoint (`apps/api/src/server.ts`):** Instantiate Express, mount middleware (`createAuthMiddleware`, `csrfProtection`), and wire the routers documented in `docs/workspace-requirements.md`.
3. **Speech & Media Adapters (`apps/api/src/providers/` & `apps/api/src/media/`):** Supply implementations conforming to `TranscribeClip` and `StageClip` (with guaranteed `cleanup()` hook).
4. **UI Routes (`apps/web/`):** Implement the UI screens (`/sign-in`, `/visits/new`, `/visits/:visitId`, `/review`, `/review/:visitId`) fulfilling the Playwright E2E specifications in `tests/e2e/`.
5. **Evaluation Runner CLI (`eval/src/run.ts`):** Consume `@sakhiline/eval` types, load `eval/fixtures/manifest.json`, execute pipeline, and persist runs to `@sakhiline/db`.

---

## 4. Test Counts & Verification Commands

### Summary: 104 Total Tests Passing across 4 Packages (100% Green)

| Package | Test Command | Tests Passing | Test Suites |
|---|---|---|---|
| `packages/contracts` | `npm test` | **35** | `errors.test.ts`, `contentHash.test.ts`, `proposal.test.ts`, `visit.test.ts` |
| `packages/db` | `npm test` | **5** | `db.integration.test.ts` (Real PostgreSQL: seed idempotency, immutability triggers, check constraints) |
| `apps/api` | `npm test` | **49** | 13 test files (`auth`, `csrf`, `policy`, `readback`, `extraction`, `logCapture`, `auth_policy`, `visits`, `reviews`, `extractions`, `evaluation`, `security`, `load`) |
| `eval` | `npm test` / `npm run eval:self-test` | **15** | `scorer.test.ts` (incl. manifest & leakage check), `aggregate.test.ts` (worked example), `noise.test.ts` |

### Exact Verification Commands:
```bash
# 1. Typecheck all packages
cd packages/contracts && npm run typecheck
cd ../../packages/db && npm run typecheck
cd ../../apps/api && npm run typecheck
cd ../../eval && npm run typecheck

# 2. Run Contracts test suite (35 tests)
cd packages/contracts && npm test

# 3. Run Database integration tests against real PostgreSQL (5 tests)
cd packages/db && npm test

# 4. Run API Unit, Integration, Security, and Load test suites (49 tests)
cd apps/api && npm test

# 5. Run Evaluation Scorer, Noise, and Aggregator test suite (15 tests)
cd eval && npm test && npm run eval:self-test
```

---

## 5. Mounting Routers & DB Test Setup for Johny

### 1. Database Setup
```bash
# Start disposable test PostgreSQL 16 container on port 54320
docker compose -f packages/db/docker-compose.test.yml up -d

# Deploy migrations
cd packages/db && npx prisma migrate deploy

# Seed database idempotently
npx tsx prisma/seed.ts
```

### 2. Mounting Routers in `server.ts`
```typescript
import { createSessionRouter } from "./routes/session.js";
import { createBeneficiariesRouter } from "./routes/beneficiaries.js";
import { createVisitsRouter } from "./routes/visits.js";
import { createReviewsRouter } from "./routes/reviews.js";
import { createExtractionsRouter } from "./routes/extractions.js";

app.use("/api/v1/session", createSessionRouter({ prisma }));
app.use("/api/v1/beneficiaries", createBeneficiariesRouter({ prisma, contextStore }));
app.use("/api/v1/visits", createVisitsRouter({ prisma, contextStore }));
app.use("/api/v1/visits", createExtractionsRouter({ prisma, transcribe, stageClip, extraction }));
app.use("/api/v1/reviews", createReviewsRouter({ prisma }));
```
