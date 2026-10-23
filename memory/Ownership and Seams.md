---
tags: [sakhiline, ownership]
---
# Ownership and Seams

Neither of us edits the other's files. If something needs to change on the other side, send expected vs actual evidence instead.

## Johny owns
- `apps/web/**`: all UI routes, clients and UI tests
- `apps/api/src/server.ts`, `config/`, `routes/health.ts`, `observability/`
- `apps/api/src/providers/` (Gnani), `apps/api/src/media/` (incl. `cleanup.ts`)
- Root `package.json`, lockfile, `tsconfig.base.json`, `.env*`, `.gitignore`, `.github/`, `deploy/`
- `eval/src/run.ts` + the web Evaluation route
- `tests/contract/gnani.test.ts`, `tests/unit/media.test.ts`
- `docs/source/VERIFICATION.md`, `docs/demo/`, `README.md`
- `apps/api/package.json` (currently a temporary shim from Shanky; Johny takes it over)

## Shanky owns
`packages/contracts`, `packages/db` (schema/migrations/repos), `apps/api/src/{auth,policy,domain,extraction,routes}`, eval fixtures/scorer/aggregate, the other `tests/**`, and the backend docs.

## Seams (in `packages/contracts/src/seams.ts`)
- `RequestContext { requestId, log{info,warn,error} }`: Johny provides it, Shanky's routes log through it
- `IdentityVerifier.verify(req) → Actor | null`: `FixtureVerifier` exists, but in `APP_MODE=live` it is rejected
- `StageClip(upload{buffer,mimeType}) → {path,mimeType,seconds,cleanup()}`: Johny
- `TranscribeClip(clip, language) → SttResult`: Johny (ok | UNSUPPORTED_MEDIA/TIMEOUT/RATE_LIMITED/PROVIDER_FAILURE)

## Router mounts (Johny's server.ts, prefix `/api/v1`)
`session`, `beneficiaries` (ctx store, TTL 600s), `visits`, `visits` (extractions: `{prisma, transcribe, stageClip, extraction}`), `reviews`. Middleware order: `express.json` → `cookieParser` → `createAuthMiddleware(verifier)` → `csrfProtection` → routers → error middleware (`AppError` → `{error:{code,message},requestId}`). The full snippet is in `docs/workspace-requirements.md` §5.

## Env
`DATABASE_URL`, `APP_MODE` (local|live), `SESSION_SECRET` (≥32 chars), `FIXTURE_AUTH`, `CONTEXT_TTL_SECONDS`, `EXTRACTION_PROVIDER` (mock|http), `GNANI_API_KEY` (server only), `PORT` (3000). Test DB: Postgres 16 on **54320**, `sakhi/sakhi@sakhiline_test`.

## Required root scripts
`typecheck`, `test`, `test:integration`, `db:migrate:test`, `db:seed:test`, `eval:self-test`, `test:security`, `test:load:fixture` (+ later `test:contract`, `test:e2e`, `build`).
