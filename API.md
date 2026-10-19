# API contracts

Status: **Implemented in Shanky's lane**. All `/api/v1` routes implemented across `apps/api/src/routes/` (`session.ts`, `beneficiaries.ts`, `visits.ts`, `reviews.ts`, `extractions.ts`). Backend strictly derives actor/role from verified session / identity verifier; never trusts client-supplied role or organization. Mutations require CSRF protection when session-authenticated and enforce `If-Match` ETags (`"visit:<id>:<revision>"`). Idempotency keys enforced on `POST /visits`, `POST /visits/:id/submit`, and `POST /visits/:id/reviews`. Consistent error envelopes `{ "error": { "code", "message" }, "requestId" }` implemented across all error status codes.

## Common behavior

Envelope: success returns the typed resource, `requestId` and revision where relevant. Error: `{ "error": { "code": "STALE_REVISION", "message": "Refresh this visit before retrying." }, "requestId": "opaque" }`. No stack, transcript, secret or other beneficiary data in errors. Use 400 validation, 401 unauthenticated, 403 insufficient role, 404 inaccessible/missing resource consistently, 409 stale/idempotency conflict, 413 body too large, 415 unsupported media, 422 unresolved semantic input, 429 quota/rate cap, 502 provider failure, 504 timeout. Error messages must not reveal whether an unassigned beneficiary exists.

ETag format `"visit:<id>:<revision>"`; `If-Match` required for edit/confirm/submit/review. All mutation body schemas reject unknown keys. Idempotency keys required for creation/submission/review, scoped to actor+operation+resource and request hash. Key length proposed 16–128 characters; do not place personal data in it. Replay identical request returns original result; changed body returns 409. Prefer stable UUID keys generated client-side.

## Endpoints

| Method/path | Input | Authority/output |
|---|---|---|
| `GET /session` | None | Current server-verified actor and safe capabilities; 401 when absent. OIDC redirect/callback paths depend on selected integration and must be documented before implementation. |
| `GET /beneficiaries?cursor=&limit=` | Bounded opaque cursor, limit <=50 | Worker assigned synthetic references only; no visit history. |
| `POST /beneficiaries/:id/context` | Explicit selected reference confirmation | Worker assignment checked; short-lived actor/beneficiary-bound `contextId`/expiry. No name-only resolution. |
| `GET /beneficiaries/:id/history?contextId=` | Confirmed identity context | Matching actor/beneficiary/scope and expiry checked; paginated authorized synthetic history. |
| `POST /visits` | `contextId`, `visitAt`, `visitTimezone`, idempotency key | Create scoped draft/revision 1, server assigns worker/supervisor; no client review status. |
| `GET /visits/:id` | None | Assigned worker/supervisor, immutable revision and allowed actions; all history/revisions scoped. |
| `POST /visits/:id/extractions` | Multipart audio + language + expected revision | Worker draft only; <=30s/10MiB proposed limits; actual codec validation/conversion. Returns tentative proposal ID/fields/transcript/issues/provenance and base revision; never mutates confirmed content automatically. |
| `PATCH /visits/:id/draft` | Typed observations, note, provenance, expected version | Worker draft only; explicit accepted/manual fields create new immutable revision and clear confirmation. Reject applying late extraction to changed base revision. |
| `POST /visits/:id/confirm` | Revision, content hash, unresolved-field acknowledgements | Worker confirms exact validated snapshot; returns confirmation receipt. No model-generated blanket approval. |
| `POST /visits/:id/submit` | Revision, idempotency key | Same worker, current confirmation and state validated; atomic submitted receipt/audit. No direct transcript-to-submit. |
| `GET /reviews?cursor=&limit=` | Bounded pagination | Supervisor assigned pending revisions only. No clinical-risk ranking. |
| `POST /visits/:id/reviews` | Revision, action `approve` or `return`, required bounded reason for return, idempotency key | Supervisor only; exact submitted version; 409 if stale; atomic transition/audit. |
| `POST /visits/:id/reopen` | Returned revision, version precondition | Worker creates correction draft; cannot reopen approved record in MVP. |
| `POST /visits/:id/readback` | Confirmed revision | Authorized actor; deterministic allowlisted read-back excluding arbitrary notes; optional TTS verification/budget gate. Text equivalent always available. |
| `GET /evaluation/runs/:runId` | Known synthetic run | Access policy selected at release; authenticated read-only by default. No public paid-run trigger. |
| `GET /health` / `GET /ready` | None | Minimal liveness/readiness, no config values; readiness fails if live mode has unsafe/missing identity config. |

## Draft field example

```json
{
  "revision": 2,
  "observations": {
    "hemoglobin": {
      "status": "recorded",
      "value": "9.0",
      "unit": "g/dL",
      "source": {"type": "transcript", "span": [18, 25]}
    },
    "bloodPressure": {"status": "not_measured"},
    "followUpDate": {"status": "unknown"}
  }
}
```

Example is invented data, not clinical guidance. Offsets refer to a frozen transcript with declared offset convention (Unicode code points proposed); schema must make that convention explicit in tests. Remaining required protocol fields are omitted from the fragment. Semantic validation blocks guessed/missing units, contradictory values or ambiguous dates until correction or explicit allowed unresolved acknowledgement. Historical readings cannot be used as current defaults.

## Provider and evaluation integration

No provider keys in browser requests. STT/TTS details belong to [INTEGRATIONS.md](INTEGRATIONS.md); application errors remain stable across provider failures. Evaluator is a local controlled runner using shared adapters with concurrency 1, writing only evaluation tables/artifacts. Contract tests exercise all envelopes, policy denials, size/format bounds, late proposals, stale versions and duplicate retries without paid provider access.
