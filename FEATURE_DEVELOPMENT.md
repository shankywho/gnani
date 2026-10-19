# Feature development

Current status: planning only. Follow the council decision revision and human gates in [decision log](DECISION_LOG.md). No approval is implied by a roadmap task.

## Small complete change workflow

1. Identify the approved task ID and exact proposal revision. If a field, role, channel, budget or retention changes, obtain the appropriate scope/security approval first.
2. Read the current callers and route/schema/provider contracts. Map changes across frontend routes, backend services, Zod contracts, database migration, fixtures, docs and CI scripts before editing.
3. Use one behavior-focused test for each nontrivial transition or parser. For example, stale approval must fail even when the UI permits clicking; a duplicate HTTP retry must create one transition.
4. Reuse the domain service and shared contract. Do not let browser code, model output or an evaluation runner write visits directly. Keep secrets server-side and typed draft values distinct from confirmed submissions.
5. Each new route is its own file, registered in the router, per `CLAUDE.md`. Never modify `_variant_b`, `_variant_c` or other variants without explicit instruction.
6. Every new import requires a corresponding workspace dependency and lockfile change. Do not add a dependency for a few lines if the platform suffices.
7. Run the relevant checks after changing behavior. Once the future scripts exist: `npm run typecheck`, targeted `npm test -- <path>`, `npm run build`; use integration/E2E checks for boundary changes. Report actual commands/results separately from proposed checks.
8. Show the diff and update the decision/contract documents where behavior changes. Do not commit, merge, deploy or publish on the user's behalf without applicable authorization.

## Future extension admission

Offline audio needs visible storage acknowledgement, eviction/quota handling, foreground retry, idempotency, sign-out/shared-device privacy and retention tests. Calls need authenticated caller binding, provider media contract, draft recovery, cost cap and clear non-emergency labeling. Clinical flags need qualified policy ownership. Each is a new proposal, not a hidden addition to the first slice.

Rollback uses small commits after implementation authorization. Revert code before changing shared schemas; preserve forward-compatible database columns and audit data. Never use destructive resets, wipe databases or silently delete recordings to make tests pass.
