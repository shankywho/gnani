---
tags: [sakhiline, log]
---
# Progress Log

Newest first. Format: `## YYYY-MM-DD — who — phase` then what changed, commit, tests run.

## 2026-10-24 — Johny — J1 root workspace ✅
- Root npm workspace + lockfile, `.env.example`, all required root scripts, plus a tested-setup section in `SETUP_AND_INITIALIZATION.md`.
- 📣 **Shanky:** I edited `eval/package.json` (changed `workspace:*` to `*` because npm rejects pnpm syntax, and aligned ts/vitest/@types/node). Your per-package lockfiles are now unused.
- Verified: clean `npm ci`; typecheck exit 0; 125 tests green; integration, security, load, eval self-test, migrate and seed all exit 0.
- Correction to J0: the "typecheck exit 0 despite errors" note was wrong. My shell pipe hid the real exit code; the errors were missing modules, now fixed by hoisting.
- Next: J2 `server.ts`.

## 2026-10-24 — Johny — J0 baseline ✅
- Test Postgres 16 is up (Docker, port 54320); `prisma migrate deploy` and the seed both ran fine.
- Typecheck: contracts and db clean. Tests: contracts 35, db 6, api 66, eval 18 → **125 green**. Matches `HANDOFF.md`.
- Blockers for running standalone, all fixed by J1: eval uses `workspace:*` (npm rejects it); root `tests/` needs a root `node_modules`. For this check I used temporary symlinks and removed them afterwards.
- Next: [[Johny Roadmap]] J1 (root workspace).

## 2026-10-24 — Johny — setup
- Read every project doc and both PDF plans. Created this shared vault at `memory/` and seeded claude-mem (memory #984, work list `johny-phases`).
- State: Shanky phases 0–8 done (last commit `e2bb5a3`). Missing: root workspace, `server.ts`, providers/media, `apps/web`, `eval/src/run.ts`.
- Next: [[Johny Roadmap]] J0 (baseline check).
