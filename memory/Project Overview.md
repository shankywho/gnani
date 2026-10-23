---
tags: [sakhiline, context]
---
# Project Overview

**SakhiLine** is voice-assisted visit documentation for **ASHA workers** (India's community health workers), built for the Gnani AI contest by a team of two. All data is synthetic.

## Core loop (MVP)
1. Worker signs in; the server derives role and assignments.
2. Worker picks an **assigned** beneficiary and confirms the reference. Duplicate names (two "Sunita"s) must be disambiguated. History is only visible after a context is confirmed.
3. Worker records a short clip (≤30s, ≤10MiB, online only), or types the fields by hand.
4. Gnani STT turns the clip into a transcript; extraction turns the transcript into **proposed** typed fields: BP (mmHg), Hb (g/dL), TT dose, follow-up date, note.
5. Worker corrects the fields and **confirms an exact revision** (content hash), then submits (idempotent).
6. Supervisor **approves**, or **returns** with a reason. The worker reopens the visit as a new draft, confirms it again and resubmits.
7. An `/evaluation` screen shows an honest synthetic robustness eval: 30 scenarios (20 dev, 10 held out) × 3 conditions (clean, noise-a, noise-b).

Worked example: `"Sunita ka BP check kiya, 110 by 70, Hb 9 tha, TT ka doosra injection due hai agle hafte."` → BP 110/70, Hb "9", TT recorded, follow-up **unresolved** (`AMBIGUOUS_DATE`).

## Hard rules (never break)
- Documentation only: **no diagnosis, triage, thresholds, treatment, or "urgent" wording.**
- Synthetic data only: no real names, phones, Aadhaar or patient audio.
- The model only proposes. The server checks identity, assignment, schema, revision and state transition on every call.
- Field states: `recorded | not_measured | unknown | not_mentioned`. Never fill a missing value from history.
- Free text from the model is never rendered or spoken. Use fixed templates only (clarification catalog, read-back).
- Keys stay server-only and never go in logs. No paid API calls without explicit approval.
- Mock/fixture results must be labelled `FIXTURE`, never passed off as real STT accuracy.
- October canvas rule (`CLAUDE.md`): **one screen = one route file**, registered in the router.

## Deferred (not MVP)
Offline queue, phone calls, reminders, clinical flags, live streaming form-fill, multiple languages, GPU hosting.

## Key repo docs
`SAKHILINE_BUILD.md` (Shanky's spec) · `docs/BUILD_SUMMARY_SHANKY.md` · `docs/workspace-requirements.md` (Johny's integration guide) · `HANDOFF.md` · `DESIGN.md` · `API.md` · `DATABASE.md` · PDFs: Project Delivery Plan, Shanky Work Plan.

Language: Hinglish (Hindi + English medical terms), see A-1 in [[Decisions and Open Questions]].
