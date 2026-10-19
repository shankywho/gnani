# HANDOFF — Shanky Lane

## Current Phase: Phase 4 Complete (Domain & Visit Routes)
- `apps/api`:
  - `src/domain/visits.ts`: Domain logic, ETag generator/parser, transition audit logging (no PHI/keys logged), transaction boundaries.
  - `src/routes/visits.ts`: `POST /visits`, `GET /visits/:id`, `PATCH /visits/:id/draft`, `POST /visits/:id/confirm`, `POST /visits/:id/submit`.
  - `packages/contracts`: Exported type definitions for requests (`ConfirmRequest`, `SubmitRequest`, `ReviewRequest`).
  - Tests: Integration #4, #5, #6 passed (25 passing tests in api suite).

## Next Phase
- Phase 5: Review Loop (`routes/reviews.ts`, reopen, readback, integration #7 and API-level #9 manual path).

## Needs from Johny / Workspace Requirements
- Root package workspace should include `packages/contracts`, `packages/db`, `apps/api`.
- Johny owns `apps/api/package.json`, `apps/api/src/server.ts`, root scripts and config.
