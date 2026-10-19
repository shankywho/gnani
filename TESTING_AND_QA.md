# Testing and QA

Status: **Implemented and passing in Shanky's lane**. Complete test suite covering Contracts (35 tests), Database Integration (5 tests on real PostgreSQL), API Unit/Integration/Security/Load (49 tests), and Evaluation Scorer/Corpus (15 tests + `eval:self-test`). Total 104 tests passing across all packages with zero external key requirements and strictly synthetic data. Playwright E2E skeletons authored and marked `test.skip("awaiting Johny's UI")`. Real health data and production deployments remain unexecuted per human G2 gates.

## Verification matrix

| Layer / target | Required cases | Proposed command / gate |
|---|---|---|
| Type/build | Shared schema compatibility, UI/API compile, clean install | `npm ci`, `npm run typecheck`, `npm run build`; T01 onward. |
| Unit/domain | Missing vs negative vs not measured; numeric/date/unit normalization; current vs history; confirmation invalidation; forbidden state transitions | `npm test -- packages/contracts apps/api/src/domain`; T03/T05/T06. |
| Provider contract | Correct request/header/media shape; response parsing; malformed payload; auth/quota/timeout; no secret logging | `npm run test:contract`; fixture responses by default; paid smoke requires G1. |
| Database integration | Scoped queries, idempotent replay/body mismatch, two concurrent approvals, stale edit, immutable submitted revision, return/reconfirm/resubmit | `npm run test:integration`; disposable local PostgreSQL; T03/T06/T07. |
| E2E | Assigned identity→record/manual draft→edit→confirm→submit→review→return→correct→approve, plus duplicate/stale/failure states | `npm run test:e2e`; synthetic fixture provider; T07/T09. |
| Security | Cross-actor/resource denial, client role spoof, missing/invalid session, CSRF/origin, prompt injection, escaped notes, oversized/spoofed media, remote fixture-auth rejection | `npm run test:security`; T09; controls mapped in security document. |
| Accessibility | Keyboard complete flow, screen reader, focus/error/status announcements, contrast, zoom/mobile width, text alternatives and >=44px controls | `npm run test:a11y` plus manual device/screen-reader checklist; T04/T09. Automated scans alone insufficient. |
| Evaluation correctness | Wrong numbers/units/negation fail; missing fields/abstentions count correctly; errors remain in denominator; scenario split leakage caught; seed/hash reproducibility | `npm run eval:self-test`; T08. |
| Synthetic performance | Provider-free concurrency/size/timeouts/backpressure; stop-to-editable p50/p95 on authorized sample; exclude no failures silently | `npm run test:load:fixture`; bounded local load; live evaluation requires explicit budget. |
| Migration/rollback | Apply initial schema to empty DB, repeated synthetic seed idempotent, app rollback with additive schema, fixture recovery | `npm run db:migrate:test`, `npm run db:seed:test`; disposable DB only; no production reset. |
| Device/media | Selected Android/browser mic permission/codec/playback; network interruption; page close honestly loses unsaved memory-only edits | Manual matrix with OS/browser/version; T02/T09. |

## Evaluation protocol

Proposed first corpus: 30 reviewed base scenarios, 20 development/10 held out, clean and two fixed noise conditions (90 cases if budget approved). Split before paraphrases/noise variants. Freeze schema, expected JSON, transcript scripts, relative-time context, voice/model versions and seeds before running. Reports contain expected count per field, exact correct/wrong/missing/schema-failed/provider-failed counts, coverage and latency distributions. Use deterministic field comparison after declared normalization; no fuzzy numeric pass and no LLM-as-primary-judge.

The protocol must include synthetic silence/garbage, corrected readings, negation, duplicate names, absent units, old/current conflict, unknown dates and interrupted processing. No human recordings are collected. Synthesized speech robustness does not establish real-worker accuracy. Claim only metrics actually produced by checked artifacts; no chart shows mock numbers as results.

## Release criteria

G3 requires passing applicable implemented checks with actual logs, no unresolved security/data-loss blockers, visible synthetic/online limitation, authorized live Gnani proof, tested correction and failure journey, accessible flow review, reproducible evaluation artifacts and a qualified field/language review. Proposed product targets are in PRD, not passing results. If language/provider/budget prevents a test, record it as BLOCKED, not pass or waived by silence.
