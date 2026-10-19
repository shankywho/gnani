# HANDOFF — Shanky Lane

## Current Phase: Phase 2 Complete (Database & Repositories)
- `packages/db`:
  - `docker-compose.test.yml`: Local PostgreSQL 16 on port 54320 (`sakhi`/`sakhiline_test`).
  - `prisma/schema.prisma` & `prisma.config.ts`: Prisma 7 with `@prisma/adapter-pg`.
  - `prisma/migrations/0001_initial/migration.sql`: Schema with hand-reviewed checks and immutability triggers on `visit_revision` and `transition_audit`.
  - `prisma/seed.ts`: Idempotent seed (org, 4 actors, 8 beneficiaries, 8 assignments, 3 approved historical visits for SYN-0001).
  - `src/repositories/`: `actors`, `assignments`, `beneficiaries`, `visits`, `idempotency`, `audit`, `evaluation`.
  - Tests: Integration #1 (seed twice idempotent) and #4 (raw-SQL immutability triggers) passed against real Postgres (5/5 tests).

## Next Phase
- Phase 3: Auth + Policy (`auth/*`, `policy/assignments.ts`, `routes/session.ts`, `routes/beneficiaries.ts`, `tests/helpers/testApp.ts`).

## Needs from Johny / Workspace Requirements
- Root package workspace should include `packages/contracts`, `packages/db`, `apps/api`.
- Root `.env.example`: `DATABASE_URL`, `TEST_DATABASE_URL`, `SESSION_SECRET`, `APP_MODE`, `FIXTURE_AUTH`, `CONTEXT_TTL_SECONDS`, `EXTRACTION_PROVIDER`.
