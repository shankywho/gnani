# SakhiLine engineering council report

Date: 2026-10-19. Actual participants: **Athena / Gemini**, **Draco / Claude** (self-reported Sonnet 5), **Helios / Codex**. No unavailable member was impersonated. Work scope: evidence review, debate and planning documentation only.

## A. Repository audit and open questions

Baseline Git has one empty initialization commit and no tracked app files. Pre-existing untracked `.gitignore`, `CLAUDE.md` and `SakhiLine-review-conclusions.md` are preserved. No manifests, app source, database/schema/migration, API routes, tests, CI or deployment files existed. Agent configuration is local tooling; no secret values copied. See [full factual audit](../../PROJECT_CONTEXT.md).

The supplied PDF was extracted all nine pages, and its page-4 architecture diagram was visually inspected by Helios. [Page-numbered source](../source/brief-extracted.txt) and [official-source verification](../source/VERIFICATION.md) separate source intent from current vendor facts. No authenticated Gnani request, measured latency, clinical review, user interview or device validation occurred.

Critical open choices: contest-only synthetic demo vs pilot, primary language, actual two-builder availability/deadline, recording-first scope reduction, qualified field reviewer, identity/hosting/retention and approved provider spend. User was asked scope/language questions; absent answer remains provisional, never approval.

### Independence limits

Helios and Draco disclosed earlier-session memory exposure. Athena initially reported accidentally reading `SakhiLine-review-conclusions.md`; its later R2 review explicitly acknowledges that read, resolving inconsistent wording in its raw independent file. No clean-room independence is claimed. Current reports were requested separately and current cross-review was released only after all three initial submissions existed; Athena was asked to expand its initial generic report before synthesis. Reports are retained rather than silently rewritten to make the process look stronger.

## B. Independent agent proposals

Raw role reports preserve original evidence/benefits/alternatives/dependencies/risks/effort/validation: [Athena](athena-independent.md), [Draco](draco-independent.md), [Helios](helios-independent.md).

| Agent / proposal | Independent position | Disposition in R2 |
|---|---|---|
| A1.1 | Offline-first sync engine | Real need recognized; durable audio/text queue deferred, human accepts online-only limitation. |
| A1.2 | Robust Gnani speech pipeline | Bounded provider/device spike, labeled fixture/manual fallback and honest scoring. |
| A1.3 | Schema-driven validation | Shared shape+semantic checks, provenance, worker confirmation and server policy. |
| D1 | Priority lane for stress/live gateway | Revised twice, finally dropped in favor of separate concurrency-1 evaluation; no latency guarantee. |
| D2 | Browser persistent storage request | Corrected from hours-only durability fix to future device/storage/privacy design. |
| D3 | Benchmark and pin extraction LLM | Accepted with explicit spend gate, separate schema/correct-value metrics and frozen versions. |
| D4 | Structural schema + regex medical filter | Regex boundary rejected after BLOCKER; deterministic prompts/read-backs accepted. |
| D5 | Human-read synthetic-script subset | Excluded after BLOCKER; only authorized synthetic voices, biased synthetic results honestly labeled. |
| D6 | Partial-save phone checkpoints | Deferred with PSTN; future draft/identity/version semantics noted. |
| H01 | One short-recording-to-review vertical slice | Accepted recommendation, human scope reduction gate retained. |
| H02 | Prove speech contract first | Accepted; actual MIME/codec/format/resource bounds, no fake media type. |
| H03 | Transactional confirmation/revisions | Accepted with idempotency hash, immutable submitted snapshot and stale conflict semantics. |
| H04 | Deterministic evaluation | Accepted with frozen split/seeds/denominators; no fabricated results or real-world claims. |
| H05 | Gate offline/calls/infrastructure | Accepted; deferred functionality visible, no real-data/urgent-response implication. |

Athena's original evidence citations and qualitative effort estimates were thin; Draco/Helios explicitly challenged them. Final source references, task paths and effort ranges are in the shared design/roadmap, not falsely attributed as original Athena estimates.

## C. Cross-review matrix and debate transcript

Full actual reviews: [Athena round 1](athena-review-r1.md), [Draco round 1 and owner response](draco-review-r1.md), [Helios round 1](helios-review-r1.md). The following is a condensed, attributed paraphrase of those artifacts, not an invented verbatim conversation.

| Topic / dimensions | Objection | Owner response / change |
|---|---|---|
| Medical output — security/UX | Helios BLOCKER: regex misses advice and blocks harmless notes | Draco conceded; R2 permits fixed templates/deterministic confirmed-field read-back only. |
| Human recordings — security/cost/scope | Helios BLOCKER: invented script does not make voice synthetic or establish authorization | Draco conceded; no human-voice collection in scope. |
| Offline — UX/operations/accessibility | Helios MAJOR: `persist()` doesn't guarantee data durability; Athena wants no-data support | Draco withdrew hours-only framing; Athena R2 explicitly accepts no persistent queue, subject to human scope gate. |
| Scheduling — performance/maintainability/cost | Helios MAJOR: BullMQ isn't installed; priority doesn't protect quota/running jobs | Draco first suggested in-process priority, then accepted serial, separate evaluation. No scheduler for MVP. |
| Capture/latency — performance/scope | Draco MAJOR: H02 hadn't selected PCM capture versus conversion | R2 requires measured codec/device spike rather than mislabeling audio or asserting 1.2s. Recording-first needs human approval. |
| Data — security/migration/maintainability | All identify schema risk; Draco highlights H03 as major improvement | R2 adds central policy, versioning, immutable submission and idempotency transaction. No existing-data migration. |
| Product claims — UX/cost | Generic “faster/more accurate” claims unsupported | Matched synthetic task protocol, counts, exact scores/failures and measured latency; no clinical/field accuracy claim. |
| Accessibility/language — accessibility/UX | Draco notes independent reports under-specify accessible interaction | R2 includes keyboard/text alternatives, focus/errors/status, touch size and fluent review. |

Round 1: proposals cross-reviewed and original owners revised positions. Round 2: consolidated P1–P6 artifact reviewed and all three filed explicit approvals. Round 3: final documentation alignment check, no new production work. If an unresolved material contradiction emerges, it remains a blocker/human decision; no fourth circular debate or majority override.

## D. Explicit consensus and rejected alternatives

Exact approved recommendation: [PROPOSAL_R2.md](PROPOSAL_R2.md), SHA-256 `ab0ef019095c8dc6fd5147d7369df5b53208b9b83b29beabd1645caf08e9df0b`.

| Member | P1 | P2 | P3 | P4 | P5 | P6 | Actual evidence |
|---|---|---|---|---|---|---|---|
| Athena | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | [R2 vote](athena-review-r2.md) |
| Draco | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | [R2 vote](draco-review-r2.md) |
| Helios | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | APPROVE | [R2 vote](helios-review-r2.md) |

No unresolved council blocker against R2 at voting. Human gates remain closed. [Full decision records](../../DECISION_LOG.md) contain problem/evidence/alternatives/benefits/drawbacks/risks/votes/resolution/owner/date/next action. Rejected/deferred alternatives include regex safety, generator-as-judge, priority infrastructure, real/human voice collection, offline/PSTN/GPU/clinical flags and the 1.2s guarantee. Approval is of the recommendation and its gates, not acceptance of deployment/health-data risk.

Round-3 confirmations: [Athena final check](athena-final-check.md), [Draco final check](draco-final-check.md), [Helios final check](helios-final-check.md). Athena and Draco explicitly retained all P1–P6 votes against the R2 hash and reported no material contradiction. Draco's non-blocking repository-boundary question was clarified in BACKEND_CONTEXT.md; no R2 semantic amendment was needed. Implementation remains unauthorized.

## E. Prioritized feature portfolio

1. Correct beneficiary + scoped version-safe worker/supervisor documentation loop.
2. Verified Gnani short-clip STT + manual fallback.
3. Pinned typed extraction with unit/negation/history semantics.
4. Small deterministic synthetic evaluation and honest result view.
5. Verified deterministic TTS read-back if budget permits; text is mandatory.

Streaming/offline are next-iteration research; calls/reminders/clinical flags/GPU/multi-language expansion are backlog. [Ranked portfolio](../../IMPLEMENTATION_ROADMAP.md) records impact/fit/complexity/risk/dependencies/time-to-value and overlapping estimates.

## F. Architecture and data/API/security design

One React client + Node/TypeScript service + PostgreSQL/Prisma ORM, a narrow Gnani adapter and pinned structured extractor. Models propose; workers confirm; domain service owns state and audit. Evaluator reuses adapters with isolated writes and serial runs. No existing app is misrepresented as implemented.

[PRD](../../PRD.md), [design](../../DESIGN.md), [Mermaid architecture](../../ARCHITECTURE.md), [database entities/migration plan](../../DATABASE.md), [API contracts](../../API.md), [threat model](../../AUTHENTICATION_AND_SECURITY.md), [integration contracts](../../INTEGRATIONS.md). Identity/hosting, language, fields and budget remain explicit preimplementation gates rather than guessed external capabilities.

## G. Documentation files

All requested root deliverables are provided: README.md; PROJECT_CONTEXT.md; BACKEND_CONTEXT.md; PRD.md; DESIGN.md; ARCHITECTURE.md; DATABASE.md; API.md; AGENTS.md; IMPLEMENTATION_ROADMAP.md; SETUP_AND_INITIALIZATION.md; FEATURE_DEVELOPMENT.md; AUTHENTICATION_AND_SECURITY.md; MCP_CONNECTION.md; INTEGRATIONS.md; TESTING_AND_QA.md; DEBUGGING.md; DECISION_LOG.md.

Original CLAUDE.md, .gitignore, prior conclusions and source PDF are preserved. No variants/routes/packages/migrations/app code were created. Proposed migration design is documentation, not an executed schema change. Required work-state tool was unavailable; no service write is claimed.

## H. Step-by-step implementation roadmap

[T00–T11](../../IMPLEMENTATION_ROADMAP.md) supplies exact target paths, owner roles, inputs/outputs, acceptance checks, proposed verification commands, effort ranges, dependencies, rollback and gates. Calendar envelope preserves freeze/demo/submission buffer before the source's November 10 deadline. Staffing and dates are conditional, not promised. Two actual builders must be mapped to role responsibilities by the human.

## I. Verification matrix and risk register

[Verification and risks](VERIFICATION_AND_RISKS.md) distinguishes executed discovery/doc checks from unexecuted app tests. [QA plan](../../TESTING_AND_QA.md) covers unit, contract, integration, E2E, security, accessibility, fixture load, migrations/rollback and device tests. Main risks: incorrect beneficiary/values, unsupported audio/provider access, budget, data exposure, misleading metrics, scope and unknown real-world readiness. No clinical or production compliance claim is made.

## J. Next approved implementation task

**None yet.** Current authorized work ends with planning artifacts and human review. Resolve G0/G1 and explicitly approve G2 before T01 scaffold. No production code, spending, credential change, deployment or public post is authorized by internal council consensus.
