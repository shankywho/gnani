# HANDOFF — Shanky Lane

## Current Phase: Phase 5 Complete (Review Loop & Lifecycle)
- `apps/api`:
  - `src/routes/reviews.ts`: `GET /reviews` (supervisor queue, no risk ranking), review actions with idempotency.
  - `src/routes/visits.ts`: Added `POST /visits/:id/reopen`, `POST /visits/:id/readback`, `POST /visits/:id/reviews`.
  - `src/extraction/readback.ts`: Spoken deterministic text generation for confirmed typed observations (excludes notes/transcripts).
  - Tests: Integration #7 (concurrent approve vs return race: 200 vs 409) and API-level #9 (full manual lifecycle) passed (30 passing tests in api suite).

## Next Phase
- Phase 6: Extraction (`extraction/*`, `routes/extractions.ts`, proposal accept, integration #8, #9 full, #11).

## Needs from Johny / Workspace Requirements
- Root package workspace should include `packages/contracts`, `packages/db`, `apps/api`.
- Johny owns `apps/api/package.json`, `apps/api/src/server.ts`, speech adapters (`providers/`, `media/`).
