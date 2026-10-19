# HANDOFF — Shanky Lane

## Current Phase: Phase 0 Complete (Decisions & Seams)
- `DECISIONS.md`: Logged baseline assumptions A-0 through A-7.
- `packages/contracts`:
  - `src/seams.ts`: Defined `RequestContext`, `Actor`, `IdentityVerifier`, `SttResult`, `TranscribeClip`, `StageClip`.
  - `src/errors.ts`: Defined `AppError`, `ERROR_STATUS_MAP`, and error helper functions.
  - `src/index.ts`: Barrel export for visit, seams, errors.
  - `package.json`: Main entry set to `src/index.ts`.
  - Verification: `npm run typecheck && npm test` passed (15/15 tests).

## Next Phase
- Phase 1: Contracts (`contentHash.ts`, `proposal.ts`, tests >= 28 passing).

## Needs from Johny / Workspace Requirements
- Root package workspace will need to reference `packages/contracts` and `packages/db`.
- Root `.env.example` should include `DATABASE_URL`, `TEST_DATABASE_URL`, `SESSION_SECRET`, `APP_MODE`, `FIXTURE_AUTH`, `CONTEXT_TTL_SECONDS`, `EXTRACTION_PROVIDER`.
