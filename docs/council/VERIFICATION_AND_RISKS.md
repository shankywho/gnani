# Verification matrix and risk register

Date: 2026-10-19. This file separates executed discovery/document checks from proposed application tests.

## Executed evidence

| Check | Result |
|---|---|
| Repository tree, initial git status, tracked files and initialization log | Read successfully; no implementation/manifests/schema/tests/deployment/CI at baseline. Three original untracked files preserved. |
| Supplied PDF | All nine pages extracted; p.4 architecture visually inspected. Source file unchanged. |
| Official challenge and provider documentation | Public pages read; contracts summarized with links/date in `docs/source/VERIFICATION.md`. No account/credit/price/integration verified. |
| Actual council requests and submissions | Athena/Gemini and Draco/Claude contacted through October; reports verified on disk, exposure limitations recorded. Exact final votes recorded in decision log, never inferred from status. |
| Documentation completeness/internal links/proposal identity | PASS: assert-based final check verified all 18 required documents, 34 Markdown files, valid local links and balanced code fences, unchanged R2 SHA-256, 18 explicit individual votes and all three final retention confirmations. No app manifest exists. |

No unit, integration, E2E, clinical, security, accessibility, load or migration test has run against an application. No deployment, paid Gnani request, GPU, phone call, public post, human voice collection or real health-data use occurred. Test plans and commands are in `TESTING_AND_QA.md` and roadmap; they are not passing results.

## Risks and owners

| ID | Risk / severity | Mitigation / owner | Release or decision gate |
|---|---|---|---|
| R1 | Scope exceeds two-person deadline / high | Recording-first slice, explicit deferrals, dependency/effort ranges; Athena+human | G0 scope reduction and staffing unresolved. |
| R2 | Wrong beneficiary/medical number / high | Assignment/identity confirmation, provenance/units, current/history split, exact worker confirmation; Draco | G1 qualified field reviewer and executed regression/UX checks; no clinical guarantee. |
| R3 | Provider/audio/account/cost mismatch / high | Bounded authorized device/provider spike, explicit caps and manual fallback; Helios | G1 spend/access + T02. No paid call executed. |
| R4 | Data disclosure or real data entered / high | Synthetic-only input policy, server scope, secret isolation, staging cleanup; Draco | T03/T09 controls before remote use; any real data blocks release for human review. |
| R5 | False accuracy/time-saving claims / high | Fixed references/splits/seeds/denominators and honest synthetic labels; all | T08/T10 measured artifacts and G3. |
| R6 | Lost in-memory edits on tab close / medium | Explicit no durable offline promise; server drafts after saved revision; manual feedback; Athena | G0 acceptance; durable storage requires future design. |
| R7 | Duplicate/stale transitions / high | Transaction/version/idempotency invariants, real DB concurrency tests; Helios | T06/T07 before release. |
| R8 | Accessibility/language mismatch / high | Text alternative/keyboard/touch/focus + fluent review/device testing; Athena | G1 language + T09; automated scan alone insufficient. |
| R9 | Peer independence/review quality / medium | Disclose prior context; preserve raw reports; exact revisions and explicit votes; Helios | No claim of a clean-room process; unresolved blockers prevent approval. |
| R10 | Unknown hosting/identity/privacy posture / high | OIDC/session interface but vendor/region/retention unresolved; Draco+human | G1 before remote integration; new pilot review before real data. |
| R11 | Tooling work-state capability unavailable / low | No fictional tool use; actual artifacts and task gates retained | `work_state_write` absent from exposed tools; limitation disclosed. |

All risk mitigations above are planned unless explicitly marked executed. No application residual risk is accepted on the user's behalf.
