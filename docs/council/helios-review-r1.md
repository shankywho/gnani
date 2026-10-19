# Helios cross-review — round 1

2026-10-19. Actual reviewer: Helios / Codex. Read all three filed reports only after each agent submitted an initial report. Athena's initial report needed a requested A1 expansion; initial status and file reads raced, so file contents are the evidence. This is a substantive review, not an approval.

| Proposal | Severity | Critique / required revision |
|---|---|---|
| Athena A1.1 offline sync | MAJOR | User need is valid, but reliable capture is not established by local storage plus a queue. Must account for recorder codecs, storage quota/eviction, shared-device disclosure, idempotency and visible acknowledgement. Defer durable offline audio unless human explicitly prioritizes it over the core contest slice. Planning range 3–6 builder-days only after a device spike, not merely “High.” |
| Athena A1.2 robust speech | QUESTION | A provider does not guarantee accuracy. Name the source endpoints, supported language, held-out fixtures, wrong-value metric and manual fallback. Avoid unsupported claim that manual entry is always slower. Gate provider integration on an authorized bounded test. |
| Athena A1.3 schema validation | MAJOR | Zod shape checks do not establish semantic correctness or role authorization. Add missing/not-measured/explicit-negative distinctions, units, provenance, worker confirmation, immutable submitted versions and server validation. Prefer one schema, not a framework. |
| Draco D1 priority lane | MAJOR | BullMQ is a desired dependency in the PDF, not installed infrastructure. Priority cannot protect vendor quotas or a running job. For contest MVP run evaluation separately from demo traffic with concurrency 1 and a spend cap. If future concurrency is needed, design quotas/admission control before priority scheduling. 1.2s remains an unvalidated aspiration, not a pass criterion. |
| Draco D2 storage persistence | MAJOR | `persist()` can be denied and does not make browser audio loss impossible. Foreground retry, eviction/quota errors, acknowledgement and sign-out policy are required. Accept as future offline research; do not call it an hours-only durability fix. |
| Draco D3 LLM benchmark | MINOR | Agree with fixture comparison then pinning. Gate any 2–3 candidate paid comparison on human spend approval; structured-output validity and correct medical values are separate metrics. Freeze provider/model/prompt/schema versions, no silent runtime fallback. |
| Draco D4 medical filter | BLOCKER | Regex cannot enforce medical safety and may both miss advice and block harmless documented statements. Use allowlisted UI clarification templates and deterministic read-backs from worker-confirmed fields. Extraction output is untrusted structured data; no arbitrary model-generated advice rendered or spoken. No diagnostic/treatment output slot, no clinical thresholds invented. Any keyword filter is supplemental only. |
| Draco D5 volunteer samples | BLOCKER | Synthetic script content does not make a human voice synthetic. Consent, contest interpretation and data handling are unresolved. Do not collect volunteer recordings in this scope. Keep TTS-only measurements honestly labeled; defer independent human-voice comparison pending specific human/contest authorization. |
| Draco D6 call checkpoints | MAJOR | Useful for later calls, but persisting a field must not make it confirmed/submitted. Keep unconfirmed drafts distinct, bind resume to authenticated worker/confirmed beneficiary and exact version; do not infer caller identity from phone number. Defer calls from core and remove “urgent” framing. |

## Dimension checks

| Dimension | Assessment across A1.1–3 / D1–6 / H1–5 |
|---|---|
| Security | Server-side assigned-roster authorization, bounded media validation, no model write authority, no credentials in frontend; offline/call identity is unresolved. |
| Performance | Measure record-stop to editable draft p50/p95 separately from TTS first audio; no fabricated 1.2s result. Serialize synthetic evaluation. |
| UX | Confirm beneficiary before history, show proposed versus confirmed fields, preserve edits on failure, provide text correction and honest online-only limitation. |
| Maintainability | One service, one schema, one provider adapter. Avoid Redis, GPU, telephony and priority scheduler until evidenced. |
| Migration | No existing data to migrate. First schema/seed must use synthetic identities only; review forward/backward compatibility before any future data migration. |
| Accessibility | Label record/stop states, visible transcript, keyboard and screen-reader operation, no audio-only confirmation, focus/error messages and large touch controls. |
| Cost | Cache synthetic audio, approve spend ceilings first, stop on 429/quota failure, no live API load testing by default. |
| Operations | Minimal health/readiness, structured redacted logs, request IDs, timeout/retry bounds, synthetic reseed/reset and no sensitive payload logging. |
| Scope | Narrow vertical slice plus deterministic eval first; offline/calls have real product value but need explicit deferral approval because source brief includes them. |

## Owner response / revision to Helios proposals

H-01's recording flow changes the source must-ship live experience. This is a recommended scope reduction requiring human acceptance, not a silent interpretation. Offer documented streaming later only if the end-to-end slice and device spike pass. H-03's transactional scope must preserve worker manual edits and bind every confirmation to the exact revision. H-04 requires no unsupported headline number: define targets before running and publish failures/abstentions with denominators. H-05 must not persist audio locally by default under the label “offline-ready.” All H proposals remain conditional on language, demo scope and domain field review.

Recommended candidate: single-language, synthetic-only, online short-clip voice-to-confirmation-to-review with text correction; Postgres transactional audit; strict extraction with deterministic UI prompts; small frozen deterministic evaluation, no concurrent paid stress. No production or pilot authorization.
