---
tags: [sakhiline, decisions]
---
# Decisions and Open Questions

Canonical sources: the repo's `DECISIONS.md` (Shanky's A-0…A-10, plus the audit pass) and `DECISION_LOG.md`.

## Settled (from Shanky's lane)
- A-1 Language: Hinglish with English clinical loanwords
- A-2 Identity: `FixtureVerifier` locally; `APP_MODE=live` rejects it. OIDC vendor still undecided
- A-3 Extraction: deterministic mock + an http stub that throws `NOT_CONFIGURED`. No LLM vendor chosen yet
- A-4 Limits: context TTL 600s, note ≤2000, transcript ≤16000, return reason ≤1000, idempotency key 16–128
- A-9 Proposals are cached ephemerally; a stale `baseRevision` → 409 `STALE_REVISION`
- A-10 Scorer uses exact canonical matching; failures stay in denominators

## Settled (Johny lane)
- STT language `en-IN` (mixed English-Hindi, Latin output); configurable via `GNANI_LANGUAGE_CODE`
- `STT_PROVIDER=mock` by default; live is never a silent fallback

## Open, need answers (Johny lane)
- [ ] Gnani API key available? Spend ceiling and retry allowance for live STT? (G1)
- [ ] Optional TTS read-back in scope?
- [ ] Real extraction LLM, or ship with the mock (labelled)?
- [x] ~~Recorder format~~ → the browser records PCM WAV, so no ffmpeg (J3, 2026-10-24)
- [ ] Hosting/deploy approved at all, or local demo only?
- [ ] Web stack confirmation: React + Vite + react-router (assumed)

## Needs from Shanky (found by Johny)
- [ ] 🐞 **Fixture identity 500s on non-UUID ids.** `routes/session.ts` fixture-login and `auth/fixtureVerifier.ts` (`x-fixture-actor-id`) both call `actor.findUnique({ where: { id } })` *before* the issuer/subject lookup. A non-UUID like `worker-a` makes Postgres throw → 500. Through the header this affects **every request** in local mode (e.g. `x-fixture-actor-id: junk`). Fix: only do the id lookup when the value is a UUID. Live mode is unaffected (it returns early).
- [ ] `ErrorCode` has no `INTERNAL`. `server.ts` sends `code: "INTERNAL"` for 500s, so please add it to the contracts enum.
- [ ] Per-package `package-lock.json` files are unused now that the root workspace exists; fine to delete.
