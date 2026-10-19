# SakhiLine: review conclusions and debate record

Date: 19 October 2026. Source: `/Users/anshjohnson/Ganini/SakhiLine — Project Brief & Architecture.pdf`, all nine pages, including the architecture diagram on page 4.

**Status: provisional.** Atlas and Orion completed a substantive proposal/rebuttal exchange. Juno received review requests and an extracted summary, but has not supplied a critique. October reports Juno awaiting human approval for a shell command. This report does not represent three-agent consensus. It is Orion's corrected handoff version of the Atlas–Orion synthesis; Atlas's earlier draft remains in Ganini.

## Conclusion

Keep the central idea: an ASHA speaks visit notes in one supported Indian language mixed with English terms, checks the extracted form, and submits it to a supervisor. Build one trustworthy documentation loop and demonstrate its errors honestly. Make additional channels conditional, rather than prerequisites for shipping.

The Ganini folder contains only the brief, not an implementation. This is a design review, not a code audit or a measured demonstration of accuracy, time savings, or clinical suitability.

## What the debate changed

| Topic | Initial positions and challenge | Result |
|---|---|---|
| Evon | Atlas initially called it essential to the measured differentiator. Orion challenged this: scenario generation and free-text judging are optional; deterministic scoring produces the accuracy number. | Atlas revised his position. Evon is optional scenario-expansion tooling, admitted only if access and fixtures are ready by day 2. No GPU requirement on the deadline path. |
| Synthetic evaluation | Orion initially described the overall loop as circular. Atlas distinguished TTS-to-STT robustness testing from generator-as-judge bias. | Orion accepted the distinction. Keep Timbre-generated test speech; avoid Evon judging its own generated answers. Synthetic results still do not establish field accuracy. |
| Identity | Orion proposed explicit roster selection. Atlas argued manual browsing every time would weaken the voice-first experience. | Voice lookup may propose a roster candidate. Confirm a short identifier and context before exposing history or attaching notes; disambiguate multiple matches. Never treat a plausible name match as verified identity. |
| Telephony | Orion favored removing integration from the core; Atlas favored retaining the brief's should-ship status. | Conditional after the core and evaluator work. If integration has not started by roughly October 29–30, defer it. An 8 kHz simulated test is not a live telephone demonstration. |
| Offline queue | Orion highlighted retry, durability, storage, and privacy requirements. Atlas challenged its effort-to-demo-value ratio. | Defer full offline record-and-sync from the contest MVP. State this limitation visibly; the resulting demo does not yet solve no-data capture. |
| Latency | The brief targets approximately 1.2 seconds. Atlas argued correctness should not be blocked by an unmeasured cascade target. | Keep an aspirational target; publish measured end-to-end p50/p95, including endpoint detection and network delay. |
| Custom audio orchestration | Orion questioned custom VAD/barge-in work. | Use the provider's documented endpoint detection first. Defer custom barge-in. These features are present in the original brief's page 7 stack and page 4 diagram, despite being optional in the revised design. |

These are Atlas–Orion agreements. Juno's assent or objections are unknown.

## Corrections verified against current sources

- **Streaming UX:** the documented Prisma endpoint returns transcripts for completed speech segments. Do not promise token-level partial transcripts without confirming another supported API. It already provides VAD. Its raw mono PCM16LE framing and pacing requirements must be implemented explicitly; a browser recording container is not automatically a valid streaming frame. Keep API credentials in the backend proxy. [Gnani realtime STT documentation](https://docs.gnani.ai/api/STT/stt-websocket).
- **Batch:** a documented batch API exists: create, start, poll, and retrieve transcripts. Its documentation says batch inverse text normalization is unsupported; live and batch output need consistent application-level number/date handling. [Gnani batch documentation](https://docs.gnani.ai/api/STTBatch/Introduction).
- **Evon access:** the brief's categorical “not on the API” is too strong. Gnani advertises selected closed-beta API access starting October 12, while its contest FAQ still describes self-hosting. Team access is unverified; neither beta admission nor GPU hosting should block this MVP. [Evon beta page](https://www.gnani.ai/evon-waitlist), [contest FAQ](https://www.gnani.ai/internship).
- **Eligibility and delivery:** the contest page confirms the November 10, 2026, 11:59 PM IST deadline, genuine use of at least one Gnani model/API, synthetic-data restrictions, and public-demo requirements. Prisma and Timbre already meet the model-use condition. Awards and engagement-based internship shortlisting are separate processes; more model integrations do not guarantee either. [Official contest page](https://www.gnani.ai/internship).
- **Browser offline limits:** background synchronization has limited availability and browser storage is subject to quotas and possible eviction. Do not promise recordings will silently synchronize while the app is closed on every phone. [MDN Background Synchronization](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API), [MDN storage limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Sources were checked on October 19. No authenticated vendor calls were made; documentation is not an integration test.

## Smallest complete architecture

```text
Scoped synthetic roster → identity confirmation → authorized history
Microphone → backend voice gateway → Prisma segment transcripts
          → hosted LLM proposes fields → schema and semantic checks
          → worker reviews/corrects/confirms → versioned visit in Postgres
          → supervisor approves exact version or returns for correction

Frozen synthetic fixtures → Timbre → controlled audio degradation
          → same transcription/extraction path → isolated evaluator results
```

Retain React, Node/TypeScript, Zod, and Postgres/Prisma ORM from the brief. Keep synthetic evaluations separate from visit records. The page 4 diagram should show the confirmation/domain-service boundary before any visit write, instead of suggesting raw STT output writes directly to Postgres.

Use one narrow visit form and one language initially. Preview completed-segment extraction as tentative; freeze the confirmation snapshot so later model output cannot overwrite the worker's corrections. Separate historical values from current visit observations. Represent missing, explicitly negative, unknown, and not measured distinctly. Preserve negation, units, and the source transcript segment for each proposed field. Resolve relative dates against the visit time and timezone, including recordings processed later. Ask when meaning is ambiguous; schema-valid output can still be wrong.

The LLM must not have direct write authority. Backend authorization restricts workers to their roster and supervisors to assigned records. Confirmation, submission, correction, and approval are explicit transitions. Require a visit version for approval and reject stale updates. Use an idempotency key for submissions so retrying after a dropped connection produces one logical visit.

Remove “urgent” from the phone fallback description. It is a documentation channel when mobile data is unavailable, not a triage or emergency-response service. Rule-based prioritization and clinical thresholds remain deferred; this review supplies no treatment advice or clinical rules.

If offline capture is later added, require acknowledged local persistence, visible queued/uploading/failed/processed states, retry without duplicates, and deletion only after a durable server acknowledgment or deliberate discard. Preserve the identity and visit timestamp with the recording. Shared-device access, retention, and encryption/key handling require a separate design before real health data is introduced. The synthetic-only demo must not claim production-grade privacy or reliability.

## Make the stress test defensible

1. Author a small set of structured ground-truth visits first; independently review and freeze them. Evon may expand scripts, but generated truth is not automatically correct.
2. Split by underlying scenario before creating paraphrases and noise variants. Keep a held-out set untouched by prompt tuning. Cache synthetic audio instead of repeatedly spending credits regenerating identical fixtures.
3. Score numbers, dates, identifiers, and enums deterministically after declared normalization. Never fuzzy-match a wrong clinical number into a pass. Keep any rubric-based free-text assessment separate from exact structured-field scores.
4. Include code mixing, native-script numbers, corrections, negation, historical-versus-current readings, missing units, duplicate names, and ambiguous dates. Test silence, interrupted audio, severe noise, and extraction failure.
5. Publish dataset size, language, voices, degradation parameters, and per-condition results. Distinguish recognition errors, extraction errors, and correction/confirmation failures. Report exact accuracy, unresolved rate, coverage, and wrong-value rate together; an abstention is not a correct completed field.
6. Label charts “synthetic robustness evaluation.” Timbre speech may omit natural accents, hesitations, and environmental interactions. Do not infer clinical or real-world performance, and do not use real patient recordings to evade the contest's synthetic-only rule.

For the time-saving claim, compare manual entry with dictation plus correction on matched synthetic tasks. Include supervisor review time and report participant/task counts. A proposed study or target is not a measured result.

## Delivery priorities and checks

| Window | Deliverable |
|---|---|
| October 19–20 | Verify account access and audio formats; choose one supported language, freeze schema and initial fixtures. Decide optional Evon access now. |
| October 21–25 | Identity-safe, worker-confirmed visit loop with manual correction and explicit errors. |
| October 26–29 | Supervisor approve/return loop and deterministic stress-test report. |
| October 30–November 2 | Reliability and device checks. Continue telephony only if it passed the start gate; use already prepared optional Evon fixtures, with no late model integration. |
| November 3–6 | Freeze features, record the 60-second demo, publish the genuine public post. |
| November 7–10 | Submission, documentation, and contingency buffer. |

Suggested ownership: one builder owns microphone/gateway/model integration and audio fixtures; the other owns form/review workflow, persistence, authorization, and scoring. Both review schema semantics and run the end-to-end demo together.

Before demonstrating, check that unresolved identity blocks history/commit, unconfirmed fields cannot submit, retries create one visit, stale approvals fail, absent values remain absent, and evaluator runs cannot populate visit tables. Include one correction and one failure case in the demo rather than hiding them behind an accuracy chart. None of these checks has been executed against an implementation.

## Outstanding contribution and limits

Juno's independent safety/inclusion critique and rebuttal remain required to complete the requested three-agent debate. Reopen the decision table when that input arrives; do not append a name without incorporating their actual position.

Not checked: real device/browser behavior, vendor account access, credit costs, telephony setup, GPU availability, implementation correctness, clinical validation, or real-user time savings. No application code or original PDF was changed. This report is suitable for planning a synthetic contest demo, not authorizing a health-data deployment.
