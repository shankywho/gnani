---
tags: [sakhiline, johny, phase]
owner: johny
status: in-progress
current_phase: J6
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
- [x] Key is in the local `.env` (gitignored, mode 0600; never in git, the vault or logs). `npm run dev:api` loads it with `--env-file-if-exists`
- [x] **Live smoke passed (2026-10-24):** one billed call, 686 ms end to end. BP and TT extracted; Hb ("nine" as a word) and the follow-up ("agle hafte" → "ugly haft") were missed. Details in `docs/source/VERIFICATION.md`
- [x] Tried Gnani `format=transcribe` (2nd billed call, 722 ms): **no change**, still "hb nine". The option stays as `GNANI_STT_FORMAT`, default verbatim. The fix belongs after STT (number words in the extractor)
- **Decision:** the browser must record **16 kHz mono PCM WAV** (Web Audio), not MediaRecorder WebM. This is a J4 requirement.

### J4 — Web app + worker screens ✅ (2026-10-24)
- [x] `apps/web`: React 19 + Vite 8 + react-router 7. `npm run dev:web` (port 5173, proxies `/api` to :3000); `npm run build`
- [x] Routes, one file each, registered in `src/router.tsx`: `SignIn.tsx`, `NewVisit.tsx`, `Visit.tsx`
- [x] `src/wav.ts`: browser records 16 kHz mono PCM16 WAV (Web Audio), with a 30s auto-stop
- [x] Worker journey checked by hand in the browser: demo sign-in → search → duplicate-name warning → previous visits (labelled, not copied) → start visit (idempotent) → record → proposal with fixed clarification text → accept → acknowledge unclear field → confirm → submit → receipt. Mic-blocked state checked too
- [x] Manual entry for every field with a status choice; client-side checks; edits preserved on errors; stale-revision → reload prompt
- [x] Design: Atkinson Hyperlegible, indigo/ink, turmeric only on the Record button, statuses in words not colour, 375px mobile checked
- [x] 🐞 Fixed in `server.ts`: visit ETags only track the revision, so the browser got a stale 304 after confirm. `/api` now sends `no-store` and ignores `If-None-Match` (2 new assertions)
- [ ] E2E specs not un-skipped yet. Doing that with J5 (needs Playwright + a browser download); label wording already matches (Playwright matching is case-insensitive)
- Known: microphone capture can't be tested in the in-app browser (a tone stub was used there). Needs a real Android Chrome check (J7)
- Known: `AudioContext({sampleRate:16000})` may fail on Firefox; Chrome is the target

### J5 — Supervisor screens + E2E ✅ (2026-10-24)
- [x] `routes/ReviewQueue.tsx` (table, paging, empty/error states, no risk ranking) and `routes/ReviewVisit.tsx` (exact-version snapshot, transcript, approve, return with reason, stale-409 reload, idempotency key per action+version)
- [x] **E2E switched on** with Playwright 1.64 (`npm run test:e2e`): `worker.spec.ts`, `review.spec.ts` (Shanky's, un-skipped with small step fixes) + new `correction.spec.ts` (return → reopen → re-confirm → resubmit → approve). **3/3 green, 3 runs in a row**
- [x] E2E uses its own servers on ports 3100/5174 with `STT_PROVIDER=mock` forced (it can never bill Gnani), and runs in **system Chrome** (the bundled headless shell has no audio capture), so it exercises the real WAV recorder through Chrome's fake microphone
- [x] 🐞 Fixed: the "recording too short" check counted timer ticks (flaky); it now measures the WAV bytes
- [x] Separate **dev DB** `sakhiline_dev` (`npm run db:dev:setup`); `dev:api` uses it, so tests no longer pollute the demo queue
- [x] Removed Shanky's `tests/e2e/playwright.d.ts` shim (the real types are installed now)
- Gap: workers have **no list of their visits**, so a returned visit can only be reached by URL. Needs an API from Shanky (logged)

### J6 — Eval runner + dashboard ⏳
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
