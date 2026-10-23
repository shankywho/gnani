---
tags: [sakhiline, log]
---
# Progress Log

Newest first. Format: `## YYYY-MM-DD — who — phase` then what changed, commit, tests run.

## 2026-10-24 — Johny — live Gnani smoke ✅
- First real Gnani call: synthetic TTS clip of 8.4 s, 686 ms through the full API. Transcript: "sunita ka bp check kiya 110 by 70 hb nine tha tt ka doosra injection due hai ugly haft".
- BP and TT correct; Hb and follow-up missed because numbers come back spelled out and the date phrase was garbled. Logged for Shanky and in `VERIFICATION.md`.

## 2026-10-24 — Johny — Gnani key configured, branch pushed
- Gnani key stored only in the local `.env` (gitignored). Each teammate needs their own `.env`; copy `.env.example`.
- The live STT smoke (one synthetic `say`-generated WAV) was blocked pending an explicit OK for a billed call. Still pending.
- Pushed `johny-lane` to origin so Shanky can see the vault and the bug report.

## 2026-10-24 — Johny — J3 speech + media ✅ (live smoke pending)
- WAV staging with a real header check, a 1h crash sweep, the Gnani adapter (live + mock), and startup guards.
- 146 tests green, including 16 new contract and media tests and an end-to-end WAV → proposal test. No real Gnani call made.
- Next: J4 web app. The recorder must output PCM WAV.

## 2026-10-24 — Johny — J2 API server ✅
- `apps/api/src/server.ts` is live: health, all five of Shanky's routers, CSRF, error envelope, access log. Run with `npm run dev:api`.
- Tests: new `apps/api/tests/server.test.ts` (health, 404 envelope, bad JSON → 400, login → roster → CSRF), and the full suite is 129 green. A curl smoke against the running server passed.
- 🐞 Found a bug in Shanky's lane: fixture identity 500s on non-UUID ids. Logged under "Needs from Shanky" in [[Decisions and Open Questions]].
- Next: J3 speech/media adapters.

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
