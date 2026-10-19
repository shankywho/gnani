# Authentication, safety and security

Status: **Implemented and verified in Shanky's lane** (threat model mitigations S-01 through S-11 verified in unit and integration test suites against real PostgreSQL). Synthetic demo only. Identity contract enforced via `IdentityVerifier` / `FixtureVerifier` in local test mode and strictly rejected in live mode (`APP_MODE=live`). Central policy enforces deny-by-default access control; CSRF protection, ETag revision matching, audio cleanup, prompt injection isolation, and structured log sanitization are active. Production deployment and real health data collection remain blocked pending human G2 authorization.

## Identity and authorization contract

Select a supported OIDC/session integration at G1; vendor and hosting are unresolved. Backend verifies issuer/audience/signature/expiry and maps verified issuer+subject to an active server-owned actor/organization/role. Reject missing or invalid identity. Opaque HttpOnly/Secure/SameSite session cookies, session expiry, logout invalidation and CSRF/origin protections are required if cookie sessions are selected. Do not expose provider tokens or secret configuration to browser storage.

Worker queries/writes only assigned beneficiaries/visits; supervisor reviews only assigned submitted revisions. Apply policy to list/detail/history/revision/media/evaluation queries, not just buttons. Deny by default. Never trust browser role, client organization, a spoken name, a known UUID or caller ID as authorization. Confirm synthetic beneficiary reference before exposing history. Short-lived context is bound to verified actor and confirmed beneficiary; it supplements assignment checks.

Fixture identity injection is allowed in tests/local fixture mode only. Externally reachable/live startup must refuse that bypass. A public role picker is a simulation, not real authentication, and cannot unlock billable operations. Hosting and access design must be approved before any public interactive demo.

## Threat model

| ID | Asset / threat | Required mitigation | Planned proof / residual risk |
|---|---|---|---|
| S-01 | Cross-worker record/history disclosure | Central server policy, scoped joins, organization consistency | Integration test with two workers/supervisors; UUID guessing denied. Policies not implemented yet. |
| S-02 | Token/key theft | Server secret storage, no frontend secret variables, redacted logs, secure cookies | Inspect built bundle/logs and secret-scanner output; host secret custody remains gated. |
| S-03 | Prompt injection through transcript/history | Treat input as quoted data; extraction has no tools/write authority; schema/semantic checks | Adversarial transcript cannot submit, change role or obtain other histories. Model output may still be semantically wrong. |
| S-04 | Medical advice generation | No advice output field; approved deterministic prompts/read-backs; arbitrary generated text never rendered/spoken | Adversarial advice-shaped output rejected; user notes quoted, excluded from spoken read-back. Regex is supplemental only. |
| S-05 | Wrong number/identity accepted | Provenance, explicit current/history distinction, unit/date validation, exact-revision worker confirmation | Correction/negation/duplicate-name cases; confirmation cannot prove clinical correctness. |
| S-06 | Duplicate/stale writes | DB transaction, optimistic revision, immutable submission, idempotency hash | Real DB race tests; duplicate retry returns original transition. |
| S-07 | Malicious/oversized media and conversion abuse | Byte/duration/codec bounds, content inspection, private random paths, restricted conversion process, no shell string interpolation, time/CPU limits | Spoofed MIME, huge/invalid audio, path traversal and conversion timeout tests. Tool availability gated. |
| S-08 | Billing abuse / provider exhaustion | Authenticated bounded endpoints, per-actor concurrency/rate limits, authorized caps, serial eval, no public paid run endpoint | Fixture load and quota simulation; retries may still incur vendor charges. |
| S-09 | Audio/transcript leakage in storage/logs | Delete private staging after work/failure, crash sweeps; no payload logging; access-scope synthetic transcript | Cleanup success/failure/crash tests; provisional 1h staging maximum needs approval. No real data admitted. |
| S-10 | CSRF/XSS | Session CSRF/origin checks, output escaping, bounded content, CSP and no arbitrary HTML | Cross-origin mutation rejected, transcript/script text escaped; review chosen framework defaults. |
| S-11 | Evaluation contamination / false claims | Separate namespace/authority, scenario split before variants, hashes/versioned artifacts, count failures | Eval run cannot submit visits; leaked base scenario fails check; synthetic label and denominators visible. |
| S-12 | Unauthorized release/data scope growth | Human G0–G3, explicit pilot and security-policy gate | Decision log checked before release; council recommendation is not human authorization. |

## Operational protections

TLS for remote requests; same-origin app/API preferred, explicit allowlist if CORS needed. Restrict service/db credentials to minimum rights; never share an evaluator identity with visit mutation privileges. Do not return audio/transcripts/notes in diagnostic endpoints. Use synthetic fixture IDs for support reproduction.

No password/reset implementation, OTP service, national-ID integration or phone-number authentication is assumed. Credential creation/rotation and spending require human approval. Pin dependencies and review vulnerabilities after scaffolding; no dependency scan has been run against an app because no manifest exists.

Any move to real health data requires organizational authorization, qualified privacy/security/domain review, data minimization/retention/deletion/export rules, encryption/key custody, access audit and incident response design. This plan makes no claim of regulatory or clinical readiness.
