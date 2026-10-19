# Product requirements — SakhiLine

Status: proposed synthetic contest demonstration, based on council candidate R2. Actual approvals and human gates are in [DECISION_LOG.md](DECISION_LOG.md). Existing behavior: none; all requirements below are planned. Source: PDF pp.1–9, [verification](docs/source/VERIFICATION.md).

## Problem and users

ASHA workers need to document visits without losing meaning while switching between spoken notes and structured forms. Supervisors need attributable, reviewable records and an explicit correction path. Time savings and adoption have not been established through interviews or field trials. The first demonstration models these tasks using invented beneficiaries only.

## Scope

MVP recommendation: one language, assigned beneficiary selection/confirmation, authorized history, short online recording, transcription and proposed structured fields, text correction/manual fallback, exact-revision worker confirmation, idempotent submission, supervisor approve/return, resubmission, and honest synthetic evaluation.

Explicitly deferred: durable offline recordings or draft queue, phone calls, reminders, clinical flags/thresholds, multi-language UI, GPU Evon, live partial-token form filling, custom VAD/barge-in and real-world deployment. This reduces the original brief's live/offline/call vision; G0 requires human agreement. An online demo does not solve no-data field work.

## User stories and acceptance

| ID | Story | Acceptance |
|---|---|---|
| FR1 | Worker selects a beneficiary | Only assigned synthetic references returned; ambiguous names require reference confirmation; history inaccessible before confirmed selection. |
| FR2 | Worker records a visit | Visible record/stop/timer and mic-denied state; proposed 30s/10MiB application limits; unsupported formats rejected or safely converted; online requirement visible. |
| FR3 | Worker checks extraction | Current observations distinct from history; every proposal has provenance or unresolved marker; edits preserved during retries; no default medical readings. |
| FR4 | Worker confirms/submits | Server binds confirmation to revision; edits invalidate it; unresolved entries explicitly acknowledged; retries produce one submission and receipt. |
| FR5 | Supervisor reviews | Sees assigned submissions only; approves exact immutable revision or returns with bounded reason; stale actions conflict; approved records read-only. |
| FR6 | Worker corrects returned visit | New draft revision; returned reason visible; fresh confirmation required before resubmission; full audit retained. |
| FR7 | Viewer inspects evaluation | Clearly synthetic label; counts, versions, noise conditions, failure/abstention rates, exact-field scores and latency visible; no placeholder result presented as measured. |
| FR8 | Worker cannot use speech | Keyboard/manual correction available; voice is optional for entering the same approved field schema. |

## Success measures, not results

- Prototype task-completion target: >=90% over >=10 scripted synthetic tasks, including at least one failure and correction. Report numerator, denominator, protocol and participant count.
- Zero observed wrong-beneficiary submissions in that task set; this is an observed test target, not a guarantee of safety.
- Complete keyboard operation; screen-reader status and visible alternatives to audio; contrast and touch target checks.
- Compare manual entry to dictation+correction on matched synthetic tasks, including supervisor review time; publish distributions without promising a percentage improvement.
- Evaluate 30 base synthetic scenarios (20 development, 10 held out), with clean/two-noise conditions only if approved budget permits. Report exact-field accuracy, wrong values, coverage, abstentions, schema failures and end-to-end failures together.
- Latency: recording-stop to editable-draft p50/p95; TTS first-audio separately. Source's ~1.2s is aspirational for future streaming, not a measured result or current release promise.

## Product gates

Human must confirm synthetic contest scope, deadline/two-builder availability, language, and recording-first reduction (G0). Domain field meanings, identity integration, spend/retention/hosting need G1. Actual implementation needs G2. Deployment, public posting and any real-data pilot require separate approval. Unanswered questions stay in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
