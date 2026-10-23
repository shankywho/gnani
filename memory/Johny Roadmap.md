---
tags: [sakhiline, johny, phase]
owner: johny
status: in-progress
current_phase: J0
---
# Johny Roadmap

Ordered by dependency. Each phase ends with a commit `johny phase N: <title>`, its tests run, and an entry in [[Progress Log]].

### J0 — Baseline check ⏳
- [ ] Install each package (`npm install` in contracts, db, api, eval)
- [ ] `docker compose -f packages/db/docker-compose.test.yml up -d`, `prisma migrate deploy`, seed
- [ ] Run every package's tests and record the **real** count (125 vs 104 conflict, see [[Shanky Lane]])
- [ ] Confirm the open gates in [[Decisions and Open Questions]] (Gnani key, spend limit)

### J1 — Root workspace wiring
- [ ] Root `package.json` with npm workspaces for `packages/*`, `apps/*`, `eval`, plus one lockfile
- [ ] `tsconfig.base.json`, `.env.example` (names only), `.gitignore` update
- [ ] All required root scripts (see [[Ownership and Seams]])
- Done when: clean `npm ci && npm run typecheck && npm test` from the root

### J2 — API server bootstrap
- [ ] `apps/api/src/server.ts`: middleware order and router mounts from [[Ownership and Seams]]
- [ ] `config/` (zod env), `routes/health.ts`, `observability/` (RequestContext + pino-style logger, no payloads)
- [ ] Error middleware producing the `AppError` envelope; take over `apps/api/package.json`
- Done when: a supertest smoke passes (health → session → beneficiaries) using the fixture verifier

### J3 — Speech + media (Gnani)
- [ ] `media/`: `stageClip` (check real MIME/duration server-side, ≤30s/10MiB, convert if needed) + `cleanup.ts`
- [ ] `providers/gnani.ts`: `TranscribeClip` with a mock mode and a live mode (30s timeout, ≤1 retry)
- [ ] `tests/contract/gnani.test.ts` (ok/invalid media/malformed/auth-quota/timeout), `tests/unit/media.test.ts`
- [ ] Live smoke **only once a key and spend are approved**; record it in `docs/source/VERIFICATION.md`

### J4 — Web app + worker screens
- [ ] `apps/web` (React + TS + Vite), `src/router.tsx`
- [ ] `routes/SignIn.tsx`, `routes/NewVisit.tsx` (roster, disambiguation, context, history, record/stop, manual entry), `routes/Visit.tsx` (draft, proposal accept, confirm, submit receipt, returned, approved read-only)
- [ ] All failure states from `DESIGN.md`, keyboard/a11y, ≥44px controls, no colour-only status
- [ ] Un-skip `tests/e2e/worker.spec.ts`

### J5 — Supervisor screens
- [ ] `routes/ReviewQueue.tsx`, `routes/ReviewVisit.tsx` (exact revision, approve/return + reason, stale 409 refresh)
- [ ] Un-skip `tests/e2e/review.spec.ts`; full loop works end to end in the browser

### J6 — Eval runner + dashboard
- [ ] `eval/src/run.ts`: load manifest → noise via `scenarioSeed(manifest.seed, scenario.id, condition)` → pipeline → `scoreCase` → `aggregateResults` → persist with `createEvaluationRun` / `recordEvaluationResult`
- [ ] `routes/Evaluation.tsx`: labelled "Synthetic robustness evaluation", `FIXTURE` mode label, a no-results state
- [ ] Never write sample numbers into `docs/evaluation/results.md`

### J7 — Hardening + CI
- [ ] `.github/workflows/ci.yml` (install, typecheck, unit, contract, integration with a Postgres service, e2e)
- [ ] Scan the bundle and logs for secrets, check audio cleanup, device/a11y matrix (Android Chrome)

### J8 — Demo + submission (before 2026-11-10 23:59 IST)
- [ ] `docs/demo/script.md` (60s story with a correction moment), `docs/demo/evidence.md` (claim → artifact)
- [ ] Update `README.md` and `SETUP_AND_INITIALIZATION.md` to actual tested behaviour
- [ ] Get human sign-off (G3) before any deploy, post or submission
