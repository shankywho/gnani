---
tags: [sakhiline, johny, phase]
owner: johny
status: in-progress
current_phase: J4
---
# Johny Roadmap

Ordered by dependency. Each phase ends with a commit `johny phase N: <title>`, its tests run, and an entry in [[Progress Log]].

### J0 — Baseline check ✅ (2026-10-24)
- [x] Installed contracts, db and api. eval **can't install standalone** (`workspace:*` is pnpm syntax)
- [x] Test DB up on 54320, migrations applied, seeded
- [x] All green: contracts 35 + db 6 + api 66 + eval 18 = **125** (the eval self-test is 10 of those 18)
- [ ] Open gates still need answers, see [[Decisions and Open Questions]]

### J1 — Root workspace wiring ✅ (2026-10-24)
- [x] Root `package.json`: npm workspaces (contracts, db, api, eval), canonical root lockfile, `postinstall` runs `prisma generate`
- [x] `.env.example` (names only); `.gitignore` already covered `.env*`
- [x] Scripts: `typecheck`, `test`, `test:integration`, `test:security`, `test:load:fixture`, `eval:self-test`, `db:up/down`, `db:migrate:test`, `db:seed:test`
- [x] `eval/package.json`: `workspace:*` → `*`, and toolchain aligned to ts ^7 / vitest ^5.0.5 / @types/node (Shanky's file, so tell him)
- [x] Hoisting fixed root `tests/` resolution; no extra tsconfig needed (api tsconfig already includes `../../tests`)
- [x] Clean `npm ci` → typecheck exit 0 → `npm test` 125 green, also without `DATABASE_URL` set
- Skipped: `tsconfig.base.json` (the four package tsconfigs are Shanky's and already work; add it if they drift)
- Skipped: the `build` script, which comes with apps/web (J4)
- Note: the per-package `package-lock.json` files are now ignored by npm; Shanky may delete them

### J2 — API server bootstrap ✅ (2026-10-24)
- [x] `apps/api/src/server.ts`: `createApp(deps)` + listens when run directly (`npm run dev:api` / `start:api`, PORT default 3000)
- [x] Middleware order: `/health` (DB `SELECT 1`, no auth) → json 15mb (base64 audio) → cookies → access log → auth → CSRF → 5 routers → `/api` 404 → error envelope
- [x] Error middleware: `AppError` envelope; ZodError or bad JSON → 400 `VALIDATION`; body too large → 413; anything else → 500 `INTERNAL`, logged by error class only
- [x] Access log: one line per request (method, route, status, role, ms), with no bodies, cookies or queries
- [x] `EXTRACTION_PROVIDER=mock|http` picks the extraction provider; the speech adapters are placeholders, so extraction answers 502 until J3
- [x] `apps/api/tests/server.test.ts` (4 tests); full suite **129 green**; manual curl smoke against a running server passed
- Skipped: separate `config/`, `routes/health.ts` and `observability/` files. The env is already parsed by Shanky's `authEnv`/`dbEnv`, and the request context is created inside his auth middleware. Split them out if they grow.

### J3 — Speech + media (Gnani) ✅ code / ⏸ live smoke (2026-10-24)
- [x] `media/stage.ts`: WAV only, checks the RIFF header (so renamed WebM is rejected), ≤30s → 413, private 0600 files in `$TMPDIR/sakhiline-staging`, `cleanup()` unlinks
- [x] `media/cleanup.ts`: `sweepStaging()` removes files older than 1h, run at server start (crash recovery)
- [x] `providers/gnani.ts`: live `createGnaniTranscribe` (`en-IN`, 30s timeout, no retries) + `mockTranscribe` (labelled mock)
- [x] `server.ts`: `STT_PROVIDER=mock|gnani`. Gnani without a key → startup error; `APP_MODE=live` with mock → startup error; `/health` reports `stt`
- [x] Tests: `tests/contract/gnani.test.ts` (10), `tests/unit/media.test.ts` (6), plus an end-to-end real-WAV → proposal test in `server.test.ts`. Full suite **146 green**. New script `npm run test:contract`
- [x] `docs/source/VERIFICATION.md` rechecked on 2026-10-24
- [ ] ⏸ Live smoke: waiting on a Gnani key and spend approval
- **Decision:** the browser must record **16 kHz mono PCM WAV** (Web Audio), not MediaRecorder WebM. This is a J4 requirement.

### J4 — Web app + worker screens ⏳
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
