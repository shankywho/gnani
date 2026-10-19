# SakhiLine council decision log

Decision date: **2026-10-19, Asia/Kolkata**. Decision set: `docs/council/PROPOSAL_R2.md` (P1–P6), SHA-256 `ab0ef019095c8dc6fd5147d7369df5b53208b9b83b29beabd1645caf08e9df0b`.

**APPROVED below means unanimously approved council recommendation. Human G0/G1/G2/G3 remain pending. No production implementation, spend, deployment, publication or real-data use is authorized.** The user requested planning and this approval gate; this is not an additional approval flow invented by the council.

Actual vote evidence: [Athena R2](docs/council/athena-review-r2.md), [Draco R2](docs/council/draco-review-r2.md), [Helios R2](docs/council/helios-review-r2.md). Each explicitly APPROVES every P1–P6. Final alignment checks are separate artifacts, not inferred from an idle status. Any withdrawal or new blocker supersedes the row's status until resolved; the exact R2 file remains immutable.

Final round-3 [Athena](docs/council/athena-final-check.md), [Draco](docs/council/draco-final-check.md) and [Helios](docs/council/helios-final-check.md) retain all P1–P6 approvals. No blocker or vote withdrawal was reported. A non-blocking file-boundary clarification was added to backend context. Database type/index/length details are provisional G1 engineering specifications under the approved model, not new clinical or scope authority.

## Decision records

| ID | Proposal revision | Problem | Evidence | Alternatives | Benefits | Drawbacks | Risks | ATHENA vote | DRACO vote | HELIOS vote | Resolution | Owner | Date | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D01 | P1 / R2 | Three-channel scope from an empty repo | E1–E7; PDF pp.1,4–9; A1.1/H01/H05/D1/D2/D6 | Full live/offline/PSTN now vs recording-first | One demonstrable worker/supervisor loop | Reduced source live/offline capability | Network-poor users excluded from MVP; actual staffing unknown | APPROVE | APPROVE | APPROVE | APPROVED recommendation; G0 scope decision pending | Product/Athena + human | 2026-10-19 | Human confirm synthetic contest scope, language, staffing, recording-first reduction. |
| D02 | P2 / R2 | Unverified recorder/provider and extraction contract | S2–S4; H02; Draco H-a/D3 | Assume codecs/fastest LLM vs bounded spike/pinning | Prevent unsupported transport and model drift | Discovery work before feature spectacle | Access, credits, conversion, numerical fidelity unresolved | APPROVE | APPROVE | APPROVE | APPROVED recommendation; G1 access/spend choices pending | Systems/Draco | 2026-10-19 | Approve spike ceiling/provider choices, then T02 after implementation authorization. |
| D03 | P3 / R2 | Unauthorized, stale or duplicate visit transitions | PDF p.5; H03; A1.3 | Client-editable status vs transactional domain state | Scoped immutable review/confirmation/audit | More explicit schema/state design | Domain semantics/auth vendor unresolved | APPROVE | APPROVE | APPROVE | APPROVED recommendation; G1 semantics/identity pending | Systems/Draco + Implementation/Helios | 2026-10-19 | Human/domain review schema/identity, then T03/T06 after G2. |
| D04 | P4 / R2 | Advice-shaped output and inaccessible confirmation | PDF pp.1–5; Draco D4; Helios R1 BLOCKER | Free generated prompts/regex vs fixed templates/read-back | Bounded system output and accessible manual path | Less conversational experience | Human correction still fallible; language validation missing | APPROVE | APPROVE | APPROVE | APPROVED recommendation; D4 original regex reliance superseded, no open council blocker | Product/Athena + Systems/Draco | 2026-10-19 | Approve field/language templates; T04/T09 verify behavior. |
| D05 | P5 / R2 | Circular/overstated accuracy and unbounded evaluation cost | PDF pp.5–6; H04; Draco D5; Helios R1 BLOCKER | Generator-as-judge or human recordings now vs frozen synthetic scorer | Reproducible exact metrics and honest limits | Does not prove natural-worker performance | Small sample and TTS bias remain | APPROVE | APPROVE | APPROVE | APPROVED recommendation; human voice collection excluded, paid runs gated | Implementation/Helios + Systems/Draco | 2026-10-19 | Freeze reviewed corpus/versions, obtain spend cap, T08 only after G2. |
| D06 | P6 / R2 | Operational/spend/security scope can grow silently | H05; all cross-review dimensions; U1–U10 | Redis/GPU/calls now vs minimal service and explicit gates | Observable bounded delivery and honest verification | Less asynchronous capability | Hosting/retention/real-world compliance not resolved | APPROVE | APPROVE | APPROVE | APPROVED recommendation; G0–G3 not opened by council | Implementation/Helios + human | 2026-10-19 | Resolve human gates, then T01 scaffold if explicitly authorized. |

E/S IDs resolve in [project context](PROJECT_CONTEXT.md) and [source verification](docs/source/VERIFICATION.md). A/H/D proposal IDs resolve in raw independent reports; D1–D6 are Draco's original proposal numbers, distinct from this decision log's D01–D06.

## Alternatives and deferrals

Covered by unanimous R2 approval; this does not rewrite the raw original proposals as separate unanimous votes.

| Alternative | Resolution / rationale |
|---|---|
| Immediate full-duplex/partial-token live filling, 1.2s pass promise | DEFERRED; completed-segment/audio contract and end-to-end measurement needed. Human must accept recording-first reduction. |
| Durable offline audio or persistent text queue | DEFERRED; browser persistence hint is no guarantee. Need device/quota/eviction/privacy/acknowledgement design. In-memory edits are not durable offline storage. |
| PSTN calls, partial call recovery, outbound reminders | DEFERRED; new identity/media/cost/recovery contracts. No urgent/emergency claim. |
| Redis/BullMQ or in-process priority scheduler as initial requirement | REJECTED for MVP; serial separated evaluator is simpler and does not pretend priority solves vendor quotas. |
| Regex as medical safety boundary | REJECTED; deterministic templates and confirmed-field read-back instead. No arbitrary generated questions/advice. |
| Volunteer/human voice comparison now | DEFERRED pending specific human/contest/data authorization. No collection performed. |
| LLM-generated truth or LLM primary scoring for structured values | REJECTED; reviewed fixed expected fields and deterministic normalization/comparison. |
| GPU Evon as required path, multiple languages, clinical thresholds | DEFERRED; access/cost/scope/domain policy not justified for this deadline path. |

## Human decision register

| Gate | Status | Decision required |
|---|---|---|
| G0 | NEEDS HUMAN DECISION | Contest demo vs pilot; two builders/deadline; language; source live requirement reduction. Asked during council; no answer assumed. |
| G1 | NEEDS HUMAN DECISION | Named domain reviewer/field units, identity/hosting, retention and bounded API spend/access. No arbitrary spending amount assumed. |
| G2 | CLOSED | Explicit authorization to implement this exact plan after prerequisites accepted. Current prompt authorizes planning only. |
| G3 | CLOSED | Executed release criteria plus separate deployment/publication/submission authorization. |

Next authorized activity: human review/choice of gates. Next implementation task after approval: T01, not started. No silence, peer message or council vote can approve on the human's behalf.
