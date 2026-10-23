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
- [ ] 🔴 **No worker visit list.** There's no `GET /visits` for workers (e.g. `?state=returned|draft|submitted`), so returned visits can't be found from the UI (FR6). Please add it; Johny will add a "My visits" route.
- [ ] I edited your e2e specs to match the real screens: added the "Start visit" click and the unclear-field acknowledgement, and replaced the empty-BP-input check with the status select. I also deleted `tests/e2e/playwright.d.ts`.
- [ ] 🐞 **Visit ETag ignores state.** `"visit:<id>:<rev>"` doesn't change on confirm/submit/review (same revision), so a conditional GET returns a stale 304. Worked around in `server.ts` (no-store, If-None-Match stripped on /api). Real fix: include state/confirmedRevision in the ETag, or don't use it for GET caching.
- [ ] **Return reason isn't exposed.** It's stored in `transition_audit.return_reason`, but `GET /visits/:id` doesn't return it, and FR6 requires the worker to see it. Please add `latestReturnReason`; the UI already shows it when present.
- [ ] 🗣 **Live STT spells numbers out** ("hb nine"). The mock extractor only matches digits, so Hb is lost. Gnani `format=transcribe` was tested live and **didn't help**, so the extractor (or a normalisation step before it) must handle number words ("nine", "nau", "saadhe nau"…). This blocks honest live-mode Hb extraction.
- [ ] 🗣 A garbled relative date ("ugly haft") came back as `not_mentioned` rather than `unknown`. Consider a softer "possible date phrase" issue, so the worker gets prompted.
- [ ] 🐞 **Fixture identity 500s on non-UUID ids.** `routes/session.ts` fixture-login and `auth/fixtureVerifier.ts` (`x-fixture-actor-id`) both call `actor.findUnique({ where: { id } })` *before* the issuer/subject lookup. A non-UUID like `worker-a` makes Postgres throw → 500. Through the header this affects **every request** in local mode (e.g. `x-fixture-actor-id: junk`). Fix: only do the id lookup when the value is a UUID. Live mode is unaffected (it returns early).
- [ ] `ErrorCode` has no `INTERNAL`. `server.ts` sends `code: "INTERNAL"` for 500s, so please add it to the contracts enum.
- [ ] Per-package `package-lock.json` files are unused now that the root workspace exists; fine to delete.
