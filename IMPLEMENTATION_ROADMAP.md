# Implementation roadmap

Status: planning only. Council recommendation and human authorization are separate; see [DECISION_LOG.md](DECISION_LOG.md). No production code has been written. Dates are a conditional planning envelope, not a delivery promise. Human has not yet confirmed language, staffing, budget or recording-first scope.

## Prioritized portfolio

Ranks are qualitative judgments, not measured ROI. Two human builders are assumed from the brief: Builder A handles speech/backend adapters and evaluation, Builder B handles UI/data/review. Council role ownership below is review responsibility, not three people available to code.

| Rank | Capability | User impact / strategic fit | Complexity / risk | Dependencies / time to first value | Tier |
|---|---|---|---|---|---|
| 1 | Correct beneficiary and version-safe confirmation/review loop | High / core documentation task | Medium / high correctness risk | Scope+field/auth gate, scaffold; 3–6 builder-days for fixture loop | MVP |
| 2 | Bounded Gnani short-clip transcription and manual fallback | High / contest technology requirement | Medium / provider+device risk | Authorized contract spike; 2–4 builder-days integration | MVP |
| 3 | Typed extraction, unit/negation/history handling | High / safe form accuracy | Medium / semantic error risk | Frozen fields, provider/model gate; 2–4 builder-days overlapping loop | MVP |
| 4 | Small reproducible synthetic report | Medium / evidence differentiator | Medium / cost and misleading-metric risk | Stable contract/scorer, budget; 2–4 builder-days | MVP |
| 5 | TTS deterministic read-back | Medium / accessibility support | Low–medium / pronunciation risk | Verified voice, confirmed fields; 0.5–1.5 builder-days | MVP only within budget; text always works |
| 6 | Continuous segment streaming | Medium / source's live experience | High / device+framing+latency risk | Core done, new scope approval/spike; estimate after spike | Next iteration |
| 7 | Durable offline audio + sync | High for no-data users / source vision | High / loss/privacy risk | Separate storage/device/privacy design; preliminary 3–6 days after spike | Next iteration, not promised |
| 8 | PSTN fallback and call recovery | Potentially high / network channel | High / identity, cost, operations | Telephony account, media/identity/recovery contracts; estimate after spike | Backlog |
| 9 | Reminders, clinical flags, GPU Evon, more languages | Unvalidated / optional | High / policy+cost+scope | Separate human/domain gates; not estimated as committed work | Backlog |

Overlapping estimates must not be added as independent feature totals. Task estimates below are the delivery budgeting units.

## Approval gates

- **G0 (human):** contest-only synthetic demo, primary language, two-builder availability, deadline, and explicit approval to replace the brief's live must-ship flow with recording-first MVP. No answer is assumed approval.
- **G1 (human/domain):** field/unit definitions and qualified reviewer; identity/hosting choice; private audio retention; exact vendor access and spend ceiling/retries. No paid requests until spend explicitly approved.
- **G2 (human):** approve the exact architecture/PRD/roadmap revision and explicitly authorize implementation.
- **G3 (human release):** accept executed checks/risks; separately authorize remote deployment, ongoing cost and public demo/post/submission. A demo post is not sent by agents without instruction.
- **New gate:** real data, clinical policy, destructive migration, credentials or security-policy change requires fresh review/approval.

## Dependency-aware tasks

All commands below are **proposed acceptance commands** to be added by T01; none ran against application code in this council. Builder-days are effort ranges, excluding approval delays. Every task preserves existing files and uses synthetic data only.

| ID / owner role / estimate | Exact target paths | Inputs → outputs | Acceptance / verification | Depends / rollback |
|---|---|---|---|---|
| T00 Product (Athena) + human / 0.5–1d | `PRD.md`, `DECISION_LOG.md`, `DESIGN.md` | Brief + open questions → human scope/language/staffing decision | Written G0/G1 choices, named domain reviewer, bounded budget; inspect decision records | First; revert doc amendment, no infrastructure changes. |
| T01 Implementation (Helios) / 0.5–1.5d | `package.json`, `package-lock.json`, `tsconfig.base.json`, `apps/web/package.json`, `apps/api/package.json`, `packages/contracts/package.json`, `packages/db/package.json`, `.env.example`, `.gitignore` | G0/G1/G2 + selected versions → npm workspace, scripts, minimal fixture smoke | Clean `npm ci`, typecheck/test/build; imports declared; no secrets; smoke exercises app/API boundary | G0/G1/G2; remove/revert scaffold change only, preserve prior docs/tool config. |
| T02 Systems (Draco), Builder A / 0.5–2d | `apps/api/src/providers/gnani.ts`, `apps/api/src/media/`, `tests/contract/`, `docs/source/VERIFICATION.md` | Approved key/spend/language + synthetic clip → verified recorder/codec/STT/TTS contract and pinned extraction candidate | `npm run test:contract`; authorized tiny live smoke + selected Android recorder/playback evidence; explicit timeout/conversion budget | T01 and spend gate; disable adapter, retain labeled fixture/manual path; revoke/rotate credentials only with permission. |
| T03 Systems (Draco), Builder B / 2–3d | `packages/contracts/src/visit.ts`, `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/0001_initial/migration.sql`, `packages/db/prisma/seed.ts`, `apps/api/src/auth/`, `apps/api/src/policy/assignments.ts` | Reviewed fields/identity + logical model → schema, seed, centralized authorization | Unit/`npm run test:integration`, `npm run db:migrate:test`, repeated seed; two workers/supervisors cross-scope denied; remote fixture-auth rejected | T01/G1; code rollback with additive schema retained; no production destructive down migration. |
| T04 Product/Implementation (Athena/Helios), Builder B / 1.5–3d | `apps/web/src/routes/SignIn.tsx`, `NewVisit.tsx`, `Visit.tsx` in same directory; `apps/web/src/router.tsx` | DESIGN + contracts → identity/roster/history/capture/manual draft UI | `npm run test:e2e`, `npm run test:a11y`; visible timer/online limitation, keyboard and mic-denied path, history only after selection | T03; revert UI feature, keep manually entered drafts server-safe; no fake offline success. |
| T05 Systems/Implementation (Draco/Helios), Builder A / 1–2d | `apps/api/src/extraction/`, `apps/api/src/routes/extractions.ts`, `tests/unit/extraction.test.ts` | Pinned provider and fixtures → typed proposal/provenance/issues, deterministic clarification/read-back | Unit+contract tests on numbers, units, negation, history, injection and stale proposal; no model tools or write authority | T02/T03; disable extraction, manual validated input remains; preserve drafts. |
| T06 Implementation (Helios), Builder B / 2–3d | `apps/api/src/domain/visits.ts`, `apps/api/src/routes/visits.ts`, `tests/integration/visits.test.ts` | Domain/state model → revision edit/confirm/submit/reopen with audit+idempotency | Real DB concurrent retry/stale/confirmation tests; same key returns same transition, changed body conflicts; late model output never overwrites | T03; revert code keeping immutable revisions/audit and additive schema; no record deletion. |
| T07 Product/Systems (Athena/Draco), Builder B / 1–2d | `apps/web/src/routes/ReviewQueue.tsx`, `ReviewVisit.tsx`; `apps/api/src/routes/reviews.ts`; `tests/e2e/review.spec.ts` | T06 + assigned supervisors → approve/return/correct/resubmit journey | E2E/DB integration: exact-version approval, return reason, stale conflict, fresh confirmation, cross-supervisor denial | T04/T06; disable review mutation UI/API while preserving pending submissions. |
| T08 Systems/Implementation (Draco/Helios), Builder A / 2–4d | `eval/fixtures/manifest.json`, `eval/src/scorer.ts`, `eval/src/run.ts`, `eval/tests/scorer.test.ts`, `apps/web/src/routes/Evaluation.tsx`, `docs/evaluation/` | Frozen 30-scenario corpus/splits + approved generation budget → reproducible results and honest chart | `npm run eval:self-test`; wrong values/units/negation/denominators fail as expected; seeded artifact replay; actual metric counts only; no visit mutation | T05, schema freeze; keep reports marked obsolete if versions change; never fabricate replacements or drop failures. |
| T09 Implementation (Helios), both builders / 1.5–3d | `.github/workflows/ci.yml`, `tests/security/`, `tests/e2e/`, `apps/api/src/observability/`, `apps/api/src/media/cleanup.ts` | Completed slice → required CI/security/device/load/cleanup evidence | Type/unit/contract/integration/E2E/a11y/security/fixture-load/migration checks; log/bundle secret inspection; selected Android test; staging crash cleanup | T07/T08; revert unsafe feature, block release, preserve audit; use fixture-only debugging. |
| T10 Product (Athena), both builders / 1–2d | `docs/demo/script.md`, `docs/demo/evidence.md`, `README.md`, `SETUP_AND_INITIALIZATION.md` | Measured artifacts + accepted limitations → reproducible 60s demo/script/setup and contribution record | Manual run includes correction/failure and supervisor action; synthetic and online labels; no unsupported medical/accuracy/time-saving claims; G3 review | T09; withdraw inaccurate claim/artifact; no public posting without approval. |
| T11 Human release owner / 0.5–1d | `docs/demo/submission-checklist.md`, `DECISION_LOG.md` | G3 + verified eligibility/terms → user-authorized public post/submission and release record | Verify current official rules/deadline, real nominated post links and submission receipt; no bought engagement | T10 + explicit publish/spend/deploy instructions; rollback public/deployment actions only by authorized plan, no agent automatic posting. |

## Conditional calendar

October 19–20: G0/G1/G2 and scaffold/provider spike if approvals arrive. October 21–25: fixture-to-live worker/review slice. October 26–29: evaluator and correction loop. October 30–November 2: hardening/device verification. November 3–6: freeze and demo preparation. November 7–10: submission/buffer, with source deadline November 10 at 23:59 IST rechecked before submission. Total T00–T11 planning envelope is about 14–28 builder-days before approval delays; two builders can parallelize some, not all, tasks. If gates slip, reduce scope openly, not validation or security.

## Next approved task

Currently **planning review only**: ask human to resolve G0/G1 and approve G2. T01 is the next implementation task only after explicit authorization. There is no authorized production-code task at handoff.
