# Draco — Final Alignment Check (Round 3)

Reviewer: Draco (Claude systems member)
Date: 2026-10-19
R2 artifact: `docs/council/PROPOSAL_R2.md`
**R2 SHA256 (independently recomputed, matches Helios's stated value):** `ab0ef019095c8dc6fd5147d7369df5b53208b9b83b29beabd1645caf08e9df0b`
R2 not modified. No other root docs modified.

## Scope

Inspected `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `BACKEND_CONTEXT.md`, `AUTHENTICATION_AND_SECURITY.md`, `INTEGRATIONS.md` in full, cross-checked each against R2's P1–P6 and against my own conceded positions from round 2 (`docs/council/draco-review-r1.md` owner-response section, `docs/council/draco-review-r2.md`).

## Result: no material contradiction found

All six documents are consistent with R2 and, notably, correctly carry forward the specific resolutions reached during cross-review rather than reverting to earlier, superseded proposals:

- **D4/S-04 (medical safety):** `AUTHENTICATION_AND_SECURITY.md` S-04 states "No advice output field; approved deterministic prompts/read-backs; arbitrary generated text never rendered/spoken... Regex is supplemental only," matching `API.md`'s `/visits/:id/readback` ("deterministic allowlisted read-back excluding arbitrary notes") and `ARCHITECTURE.md`'s alternatives table ("Deterministic UI prompts... accepts human review as authority"). This is exactly the BLOCKER resolution I conceded to (round 2) — no doc backslides to regex-as-primary-safety-boundary.
- **D5 (no volunteer recordings):** no document reintroduces human-voiced validation audio; `INTEGRATIONS.md`'s deferred-contracts section and the evaluation design in `DATABASE.md`/`ARCHITECTURE.md` stay within synthetic-only scope.
- **D1 (1.2s / priority lanes):** no occurrence of a 1.2s requirement or priority-queue mechanism in any of the six files; latency is treated as something to measure (`ARCHITECTURE.md` reliability/cost section), not assert.
- **Redis/BullMQ/GPU/PSTN deferral:** consistently absent as MVP dependencies across `ARCHITECTURE.md`, `BACKEND_CONTEXT.md`, and `INTEGRATIONS.md`'s explicit "Deferred contracts" section — matches P1/P6.
- **WebM/MIME handling (P2):** `INTEGRATIONS.md` ("Browser WebM is not listed, so T02 must verify recorder output/conversion rather than rename the MIME type") and `API.md`/`BACKEND_CONTEXT.md`'s codec-validation language match P2's "never send it under a fake MIME type" exactly.
- **Entity/state model (P3):** `DATABASE.md`'s entity table and state diagram, and `ARCHITECTURE.md`'s persistence section, match P3's entity list, state machine, idempotency, and "no clinical thresholds invented" verbatim in substance.
- **Evaluation design (P5):** concurrency-1, demo-isolated evaluation runs appear consistently in `ARCHITECTURE.md`, `API.md`, and `DATABASE.md`'s `EvaluationRun`/`EvaluationResult` entities.

## Non-blocking observation (not a contradiction — flagged as a QUESTION)

`BACKEND_CONTEXT.md`'s module table lists `apps/api/src/domain/visits.ts` as performing "atomic submission/review/return, state/audit consistency," while `ARCHITECTURE.md` ("Only `packages/db` holds Prisma ORM access") and `BACKEND_CONTEXT.md`'s own module table for `packages/db/prisma/` ("repository layer is the only DB writer") state DB writes are exclusive to `packages/db`. Nothing in the docs is actually inconsistent — the natural reading is that `domain/visits.ts` calls a repository exposed by `packages/db` rather than touching Prisma directly — but the boundary isn't spelled out explicitly in these six files. Not a contradiction with R2 (R2 doesn't specify file layout), and not something I'm treating as a blocker. Suggested fix if anyone is revising `BACKEND_CONTEXT.md` later: one sentence clarifying that `apps/api/src/domain/visits.ts` calls into `packages/db`'s repository functions rather than holding its own Prisma client.

## Votes: retained, not withdrawn

All six P1–P6 approvals from `docs/council/draco-review-r2.md` are **retained as-is**: APPROVE on P1, P2, P3, P4, P5, P6. No amendment requested. No blocker found in this final document-alignment pass.

## Blockers

**None.**

## Gate status

G0, G1, G2, G3 all remain closed per R2's own vote contract — this document is a council recommendation and alignment check only, not spend, deployment, or implementation authorization. Clarifications recorded in the inspected docs (provisional 1h staging retention, provisional 10-minute context expiry, 30s/10MiB limits, OIDC vendor TBD, etc.) are provisional G1-scope choices, not decisions taken on a human's behalf.
