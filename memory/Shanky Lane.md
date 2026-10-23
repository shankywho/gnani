---
tags: [sakhiline, shanky, phase]
owner: shanky
status: done
---
# Shanky Lane — backend, data, policy, extraction, scorer

| Phase | What | Commit |
|---|---|---|
| ✅ 0 | Decisions + seams (`DECISIONS.md`, `seams.ts`, `errors.ts`) | `3773a6c` |
| ✅ 1 | Contracts: `contentHash`, `proposal`, `visit` (Zod) | `e847efd` |
| ✅ 2 | DB: Postgres 16, Prisma 7.10.1, immutability triggers, idempotent seed, repos | `7ef975b` |
| ✅ 3 | Auth + policy: session, CSRF, contextStore, deny-by-default | `a41d65a` |
| ✅ 4 | Domain + visit routes, ETags, idempotency | `5d04642` |
| ✅ 5 | Review loop: approve/return/reopen, readback, races | `a7abb19` |
| ✅ 6 | Extraction: mock regex provider, http stub, validate, proposal accept | `5bbd08d` |
| ✅ 7 | Eval: 30-scenario corpus, mulberry32 noise, exact scorer, aggregate | `dd6702e` |
| ✅ 8 | Hardening: security tests, log capture, 250-concurrency load, e2e skeletons | `20ed411` |
| ✅ fix | Audit fixes: race locks, session expiry, pagination, corpus gaps | `fb5a7f4`, `bef588f`, `e2bb5a3` |

Seed: org "Demo Org (synthetic)"; `worker-a`, `worker-b`, `sup-a`, `sup-b`; beneficiaries `SYN-0001…0008` (two named Sunita: 0001 and 0002; 0007/0008 belong to worker-b only).

E2E specs `tests/e2e/worker.spec.ts` and `review.spec.ts` are `test.skip` until Johny's UI exists.

✅ Verified 2026-10-24 (J0): **125 tests green** (contracts 35, db 6, api 66, eval 18). `HANDOFF.md` is right; `BUILD_SUMMARY_SHANKY.md` (104) is out of date.

Backlog (optional stretch S): a live-vs-mock reconcile helper and extra non-manifest scenarios.
