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

## Open, need answers (Johny lane)
- [ ] Gnani API key available? Spend ceiling and retry allowance for live STT? (G1)
- [ ] Optional TTS read-back in scope?
- [ ] Real extraction LLM, or ship with the mock (labelled)?
- [ ] Browser recorder format vs Gnani-supported formats: is conversion needed (ffmpeg)?
- [ ] Hosting/deploy approved at all, or local demo only?
- [ ] Web stack confirmation: React + Vite + react-router (assumed)
