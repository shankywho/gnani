# Helios independent proposal — 2026-10-19

Role: Staff Implementation Engineer, Codex. Revision H1. Written before reading Athena or Draco submissions or the previous conclusions document in this run. Prior session context already contained earlier council conclusions; complete historical blindness is impossible. This report independently rechecks the repository and source brief.

## Baseline

`git log -3 --oneline` shows `ee72b63 Initialize October workspace`; `git ls-files` returns no tracked files. Initial `git status --short` lists untracked `.gitignore`, `CLAUDE.md`, and `SakhiLine-review-conclusions.md`. `.gitignore` excludes October-generated agent configuration. `CLAUDE.md` describes desired React route conventions; it is not evidence of a React implementation. No package manifest, source entrypoint, schema, migrations, API implementation, tests, deployment manifest or CI workflow exists. `.codex/hooks.json` and `.gemini/settings.json` are local tool configuration; credentials were not read or copied.

Source: supplied PDF, pages 1–9. Product intent: synthetic ASHA visit voice documentation, worker confirmation, supervisor review, reproducible evaluation. Two builders and November 10 deadline are source assumptions pending human reconfirmation. Endpoint capabilities, pricing, supported languages and formats are unverified at proposal time.

## H-01 — Build one short recording-to-review vertical slice

- Problem/evidence: PDF pp.4–8 proposes live streaming, calls and multiple workers; repository has no executable foundation.
- Proposal: React/TypeScript worker and supervisor routes, one Node/TypeScript service, PostgreSQL; explicit record/stop/upload/transcribe/review/confirm/submit/approve flow before streaming.
- Benefit: validates the whole user task with a small two-person build.
- Alternative: immediate full-duplex WebSocket gateway; reject initially because provider streaming support is unverified and implementation is larger.
- Dependencies: verified provider access; selected language; reviewed visit schema; synthetic fixture.
- Risks: reduced live-demo spectacle; medical number transcription errors; cross-role access.
- Effort: 5–8 builder-days plus provider discovery; not a commitment before scaffolding.
- Validation: synthetic utterance becomes an editable draft, cannot submit without confirmation, supervisor can review only assigned records; no treatment advice; measure completion time.

## H-02 — Prove the speech contract before designing transport

- Problem/evidence: PDF p.4 assumes 16kHz streaming and p.9 explicitly leaves endpoint/audio/language contracts open.
- Proposal: one bounded integration spike with actual documented request/response, MIME/codec/sample-rate contract, timeout and error behavior. Browser recording format must match verified vendor support or explicit server conversion.
- Benefit: avoids building an unsupported gateway and false 1.2s latency promise.
- Alternative: generic provider abstraction supporting many vendors; reject as unnecessary scope. One thin provider adapter and fixture mode suffice.
- Dependencies: user-supplied credential setup and human-approved credit cap before paid requests.
- Risks: endpoint changes; unsupported code mixing; credit spend; translation corrupting readings.
- Effort: 0.5–2 builder-days.
- Validation: authorized synthetic request succeeds; malformed/oversized audio rejected locally; timeouts recover; no keys in frontend or logs. Separate proposed tests from executed probes.

## H-03 — Make confirmation and revisions transactional

- Problem/evidence: PDF p.5 requires review/fix/submit and supervisor return/resubmit; duplicated retries and stale screens can lose edits.
- Proposal: server-side state machine, immutable submitted revision, optimistic version check, idempotent submission and append-only transition audit. Use the database for consistency; no Redis requirement initially.
- Benefit: prevents duplicate visits, unconfirmed submission and approval of stale content.
- Alternative: status field editable from clients; reject due to authorization and lost-update risks.
- Dependencies: scoped identities and assignments; JSON validation; migration plan.
- Risks: schema overgrowth; review races; missing correction history.
- Effort: 2–4 builder-days within vertical-slice effort, not additive in full.
- Validation: retry creates one transition; cross-user request denied; old version conflicts; return requires reason; resubmission requires fresh worker confirmation.

## H-04 — Publish an honest deterministic evaluation

- Problem/evidence: PDF pp.5–6 wants hundreds of synthesized calls and Evon free-text judging, which risks circular ground truth and cost.
- Proposal: author a small reviewed synthetic corpus with fixed expected fields first, explicit noise recipes/seeds, numeric/date/negation scoring, field-specific denominators, held-out scenarios and latency percentiles. Publish artifacts and limitations.
- Benefit: reproducible evidence without needing a GPU or claiming real-worker accuracy.
- Alternative: LLM-as-judge primary score; reject for structured clinical fields. Optional qualitative notes cannot replace exact comparisons.
- Dependencies: stable schema, provider contract, approved language and synthetic references.
- Risks: TTS-to-STT optimism; tiny sample bias; unsafe denominator exclusions.
- Effort: 2–4 builder-days; scale only after credit review.
- Validation: scorer deliberately fails swapped values, wrong units and negation; identical seeds reproduce inputs; failures counted in denominators; no fabricated results.

## H-05 — Gate offline, telephony and operational infrastructure

- Problem/evidence: PDF pp.5–9 includes browser recording queues, calls, Redis/BullMQ, GPU Evon, reminders, VAD and barge-in within a two-person schedule.
- Proposal: MVP degrades to explicit online-only draft capture, keeps text edits locally only with an approved privacy design; defer durable offline audio, PSTN calls, reminders, GPU, VAD/barge-in and Redis to separately approved milestones. Future offline requires visible queue, quota/eviction/retry tests, sign-out cleanup and a user-triggered foreground retry.
- Benefit: keeps scope testable and avoids implying an emergency service works offline.
- Alternative: background sync promise; reject because lifecycle/storage guarantees require device validation.
- Dependencies: human scope decision because this reduces source-brief channel coverage; no silent change to brief.
- Risks: network-poor users excluded from MVP; contest fit needs verification; future sensitive local storage.
- Effort: scope/UX gate 0.5–1 day; offline and calls require separate estimates after spikes.
- Validation: connectivity interruption never reports successful submission; explicit demo limitation; no emergency-response claims; future queue retention and eviction tests before rollout.

## Critical questions / uncertainty

Confirm contest-only synthetic demo versus pilot; primary language; actual two builders and availability; deadline; permitted API spend; provider access; domain reviewer for visit field/unit definitions. No production authorization implied. Proposal acceptance is distinct from human approval to implement.
