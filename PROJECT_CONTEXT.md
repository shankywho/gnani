# SakhiLine project context

Audit date: 2026-10-19 (Asia/Kolkata). Status: planning only. No application exists yet.

## Existing evidence

| ID | Evidence | Finding |
|---|---|---|
| E1 | `git log -3 --oneline` | One initialization commit, `ee72b63`. |
| E2 | `git ls-files` | No tracked files at council start. |
| E3 | Initial `git status --short` | `.gitignore`, `CLAUDE.md`, `SakhiLine-review-conclusions.md` were pre-existing untracked files. Preserve them. |
| E4 | `CLAUDE.md` | October guidance: each future screen gets its own route file; new imports must be reflected in a manifest. This is guidance, not implemented React behavior. |
| E5 | `.gitignore` | Ignores local October `.gemini/settings.json`, `.codex/config.toml`, `.codex/hooks.json`. Those are tooling, not application configuration. |
| E6 | `docs/source/brief-extracted.txt` | Page-numbered extraction of the user-supplied nine-page PDF. Page 4 diagram also visually inspected by Helios. |
| E7 | `SakhiLine-review-conclusions.md` | Prior provisional Atlas/Orion review, explicitly missing Juno review. Historical input, not current council approval. |

Repository tree at start: three ordinary files above, `.git`, and ignored local agent configuration. No `package.json`, lockfile, source entrypoint, database schema/migration, API route, test runner, deployment manifest, environment example or `.github/workflows` was present. There is no runnable frontend/backend, CI pass, service, database, authentication or measured evaluation to report. App environment variable names do not exist yet. No secret values were inspected or copied.

## Product intent from source

The PDF proposes synthetic ASHA home-visit voice documentation: identify a beneficiary, review history, speak observations, correct/confirm a form, submit for supervisor approval. It also proposes offline audio, telephone fallback and a synthetic robustness evaluation. The source's stack and deadline are desired future work, not existing repository capabilities.

## Uncertainty register

| ID | Unknown | Impact / owner / gate |
|---|---|---|
| U1 | Contest demo versus real-world pilot | Human must approve synthetic-only scope; real health data requires a new design and authorization. |
| U2 | Primary language and code mixing | Human choice; Hindi/English is a provisional example, not a product commitment. |
| U3 | Actual team availability and contest eligibility | Two builders assumed from PDF; verify before assigning calendar commitments. |
| U4 | Provider account, allowed models, rate limits and prices | Integration spike with explicit spend authorization; no API calls made by this council. |
| U5 | Real browser microphone/codec and device support | Spike on selected Android browser; documentation is not hardware validation. |
| U6 | Domain-reviewed field semantics and units | Named reviewer must approve form and fixtures; no clinical thresholds supplied. |
| U7 | Hosting region, identity provider and retention | Resolve before remote service or persisted recordings; no production deployment authorized. |
| U8 | Legal/privacy/organizational approval for any pilot | Unresolved; synthetic-demo planning does not establish compliance. |
| U9 | Real user completion time and usability | No study conducted; no time-saving claim is measured. |
| U10 | Full three-agent independence | Prior-context exposure exists; each report must disclose it. Current proposals remain separated until all three are filed. |

## Evidence boundaries

External facts and retrieval dates live in [source verification](docs/source/VERIFICATION.md). Proposed interfaces and controls live in the other planning files. Council votes authorize a recommendation only; human implementation approval remains separate. The current process and vote history live in [council report](docs/council/COUNCIL_REPORT.md) and [decision log](DECISION_LOG.md).
