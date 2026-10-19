# HANDOFF — Shanky Lane

## Current Phase: Phase 6 Complete (Extraction & Proposals)
- `apps/api`:
  - `src/extraction/`: `prompt.md`, `provider.ts`, `httpStub.ts`, `mock.ts`, `validate.ts`, `clarifications.ts`, `index.ts`.
  - `src/routes/extractions.ts`: `POST /visits/:id/extractions` (clip staging + cleanup), `POST /visits/:id/proposals/:pid/accept` (stale revision safety).
  - Tests: 7 extraction unit tests (§14) + Integrations #8 (late proposal 409), #9 (full voice lifecycle), #11 (provider failure 504 + cleanup) passing (40 passing tests in api suite).

## Next Phase
- Phase 7: Scorer + Corpus (`eval/fixtures/`, `eval/src/`, `eval/tests/`, Integration #10).

## Needs from Johny / Workspace Requirements
- Root package workspace should include `packages/contracts`, `packages/db`, `apps/api`, `eval`.
- Johny owns `apps/api/package.json`, `apps/api/src/server.ts`, speech adapters (`providers/`, `media/`), `eval/src/run.ts`.
