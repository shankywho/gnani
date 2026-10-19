# HANDOFF (Shanky lane)

## Done
- `packages/contracts/` standalone pkg (zod, typescript, vitest). `npm run typecheck` clean, `npm test` 15/15.
- `src/visit.ts`: VisitState, Source (code-point span | manual), tagged observations
  (BP mmHg pair, Hb g/dL decimal string, TT mention, follow-up date), RevisionContent,
  Note/ReturnReason limits, IdempotencyKey, ErrorCode/ErrorEnvelope, Confirm/Submit/Review requests.
- All schemas `.strict()`; only `recorded` carries a value; no clinical thresholds.

## Assumptions (G0/G1 unresolved)
- User message "start building my part" treated as G2 for Shanky lane only.
- Field set from DATABASE.md; domain reviewer may narrow it.
- No root workspace yet (Johny's T01). Contracts package installs standalone.

## Next (T03)
1. `packages/db/`: Prisma schema, 0001 migration, seed (needs local Postgres + approval of approach).
2. `apps/api/src/policy/assignments.ts` + `auth/` (OIDC vendor undecided; start with fixture-mode actor).
3. contentHash helper (sha256 of canonical RevisionContent JSON) in contracts.
4. Then T05 extraction, T06 domain, T08 scorer.

## Not done / not verified
- No DB, no routes, no integration tests. Nothing committed (not a git repo).
