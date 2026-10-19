# Experience design specification

Status: planned, no screens implemented. Read [R2](docs/council/PROPOSAL_R2.md) and actual [decision status](DECISION_LOG.md). Visual branding is provisional; the interaction contract below is the design scope.

## Screen and route contract

| Future route | Target file | Purpose / states |
|---|---|---|
| `/sign-in` | `apps/web/src/routes/SignIn.tsx` | Verified identity entry; expired/denied/loading. Fixture identity UI allowed only in explicitly local test mode. |
| `/visits/new` | `apps/web/src/routes/NewVisit.tsx` | Assigned roster, disambiguation, reference confirmation, prior history, record/stop, extraction, draft review. |
| `/visits/:visitId` | `apps/web/src/routes/Visit.tsx` | Draft edits, confirmation, submitted receipt, returned reason, new correction revision, approved read-only. |
| `/review` | `apps/web/src/routes/ReviewQueue.tsx` | Assigned pending records, empty/loading/error, bounded pagination; no clinical-risk ranking. |
| `/review/:visitId` | `apps/web/src/routes/ReviewVisit.tsx` | Exact revision and provenance, approve/return, stale-version conflict and return reason. |
| `/evaluation` | `apps/web/src/routes/Evaluation.tsx` | Synthetic results only, condition counts/version/failure denominators, no-data state until measured. |

These are proposed routes, not new pages created in this run. Each route file is registered separately per `CLAUDE.md`.

## Worker journey

1. Select assigned synthetic reference; show a minimal disambiguation list, not history for every name match. Confirm identifier/context before history request.
2. Show prior readings with source date and “previous visit” label. Never prepopulate them as current observations.
3. Record a short clip with large Record/Stop control, elapsed timer, microphone permission notice and visible online limitation. Explain memory-only unsaved state; do not claim offline durability.
4. Processing is cancellable locally; cancellation does not falsely promise the provider stopped billing. Leave manual-entry path available. Ignore late extraction for an edited draft unless user explicitly accepts a new proposal.
5. Display transcript alongside structured fields. Distinguish proposed, manually corrected, unknown, not measured and not mentioned without relying on color. Highlight numbers/units and unresolved ambiguity.
6. Review the complete snapshot and unresolved-field acknowledgements, then Confirm and Submit as distinct actions. Editing clears confirmation. Announce success only on durable server receipt containing visit ID/version/status.
7. Failure preserves current edits while the page remains open; show failed/not submitted, retry or manual continuation. A network drop is never silently treated as a successful visit.

## Supervisor journey

Queue → exact submitted snapshot → approve or return with reason → visible acknowledgement. Another reviewer's concurrent action yields an explicit stale-version message and refresh; never apply a late click to a newer revision. Returned records reopen as a new worker draft. Approved records cannot be edited in MVP.

## Accessibility and content

Use semantic form controls, programmatic labels and errors, logical tab order, visible focus, status live region, keyboard Record/Stop/Confirm and >=44px main touch controls. Contrast targets: WCAG AA baseline to verify during implementation; no compliance claim now. Transcript and editable text are always available; never require hearing TTS to submit. Confirm identity and numbers in text as well as any spoken read-back. A fluent reviewer must inspect code-mixed labels and number/date pronunciation.

No arbitrary LLM-generated questions or treatment text. Use approved fixed clarification templates and deterministic read-back of confirmed fields. Reported notes are quoted as user content and cannot instruct the model/system. No emergency service language. Evaluation charts must say “Synthetic robustness evaluation” and explain that synthesized speech does not establish field accuracy.

## Required failure prototypes

Mic denied; no assigned beneficiary; duplicate name; silent/too-long/unsupported clip; offline during upload; provider timeout/quota; malformed extraction; conflicting current/history reading; unresolved unit/date; stale edit; duplicate retry; stale supervisor approval; returned visit; no evaluation results. Test at narrow mobile width, keyboard zoom and screen reader before release.
