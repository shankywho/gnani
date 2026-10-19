# SakhiLine repository instructions

## Current authorization

This repository is in planning. Do not create production code until human G2 implementation authorization is explicitly recorded. Council votes approve a recommendation, not spending, deployment, public posts or collection of real health data. Read `DECISION_LOG.md` and `IMPLEMENTATION_ROADMAP.md` before work. All product data and audio in the current scope are synthetic.

## Collaboration

Athena/Gemini owns product analysis; Draco/Claude owns systems design; Helios/Codex owns feasibility and integration. These are council roles, not three human builders. Do not claim another agent reviewed work without its actual response. Prior-context exposure is disclosed; keep new independent reports isolated until all members submit. At most three debate rounds; unresolved blockers remain open. Three explicit approvals must bind to the same exact revision.

Assign non-overlapping file ownership before parallel edits. Agents share the workspace; never revert another agent's edits. Verify returned files rather than assuming a tool status means the edit persisted.

## Implementation rules when authorized

- Follow `CLAUDE.md`: one route file per screen and router registration.
- Do not modify variant files without explicit instruction.
- Declare new imports in the appropriate `package.json` and update the lockfile; no undeclared packages.
- Server verifies identity, assignment, schema and transitions. Model text and client role hints are not authority.
- No real beneficiaries, phone numbers, Aadhaar/PAN, patient recordings or production data. No diagnostic/treatment recommendations or invented clinical thresholds.
- Secrets stay outside git/frontend/logs. Inspect variable names only; never print values.
- Preserve existing docs; distinguish observed behavior, approved plans and speculative backlog.
- Test meaningful behavior, especially confirmation/version/idempotency boundaries. Never claim a test ran when it is only proposed.
- Request human approval for material scope, new spending, production deployments, credentials, destructive migrations and security-policy changes. Prepare a concrete reviewable change first.

## Next task

See T00–T01 in the roadmap. At planning completion the authorized next action is human review of scope/gates; implementation remains blocked until explicitly approved.
