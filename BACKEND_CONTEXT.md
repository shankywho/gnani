# Backend context

Status: **Implemented in Shanky's lane**. Backend packages and services are operational and fully tested. Data access strictly mediated via `packages/db` repositories; only `packages/db` imports Prisma. Domain logic (`apps/api/src/domain/visits.ts`) orchestrates atomic database transitions and generates structured audit logs without logging sensitive patient observations or transcripts. Johny's lane integrates the HTTP server entrypoint (`server.ts`), speech providers (`providers/`), media staging (`media/`), and UI (`apps/web/`).

## Proposed modules

| Target path | Responsibility / caller |
|---|---|
| `apps/api/src/server.ts` | Express entrypoint, strict same-origin/CORS policy, bounded bodies, health/readiness and shutdown. |
| `apps/api/src/auth/` | OIDC/session integration selected at G1; verified actor and session, CSRF/origin checks, no client-supplied roles. |
| `apps/api/src/policy/assignments.ts` | Central organization/worker/supervisor scope checks used by every route and repository query. |
| `apps/api/src/routes/` | Transport only: parse shared schema, check identity/context/version/idempotency, call domain service, return stable errors. |
| `apps/api/src/domain/visits.ts` | Draft edits, revision-bound confirmation, atomic submission/review/return, state/audit consistency. |
| `apps/api/src/media/` | Bounded media staging/inspection/conversion/deletion; no shell interpolation from names or transcripts. |
| `apps/api/src/providers/gnani.ts` | Documented STT/TTS requests, server-only keys, timeout/error normalization; no visit writes. |
| `apps/api/src/extraction/` | Pinned model/prompt/schema; untrusted structured output; no tools/DB authority. |
| `packages/contracts/src/visit.ts` | Typed observations and validation shared with UI, always revalidated server-side. |
| `packages/db/prisma/` | Schema/migration/seed; repository layer is the only DB writer. |

Exact package versions remain T01 work. Express, Prisma ORM and Zod are proposed dependencies, not already installed.

`apps/api/src/domain/visits.ts` invokes transactional repository functions exposed by `packages/db`; it does not instantiate or call Prisma ORM directly. This clarifies the non-blocking boundary question from Draco's final review without changing R2.

## Request lifecycle

Authenticate → derive assignment scope → validate body/media/version → bounded provider work outside DB transaction if needed → validate output → return tentative proposal → explicit worker edit/confirmation → atomic domain transition. Never infer success from a client animation or model response. Use 409 for concurrent/stale updates, stable error codes for retries and operation/request IDs for support. Preserve manual edits after late inference responses.

## Runtime limits and failure policy

Proposed application limits: 30s clip, 10MiB upload, bounded text/note lengths and paginated lists. Tune only through reviewed contract changes. Provider timeouts/concurrency must be fixed in the integration spike; baseline proposal is 30s operation timeout, one optional retry only within approved spend cap. An application timeout does not prove vendor processing/billing stopped. Do not retain an open DB transaction around a network request.

Private staging cleanup is part of success/failure paths, plus startup/periodic sweep after crash. No raw payloads in logs; only IDs, timing, error classes and version metadata. Graceful shutdown stops new media work, allows bounded active work to settle, deletes temporary files where safe and leaves unsubmitted drafts unsubmitted. No background job infrastructure until justified and approved.

Tests call domain services through authenticated routes and DB transactions; fixture mode never bypasses assignment policy. Remote/live mode must fail readiness if it exposes test identity injection or lacks valid identity config. [API](API.md), [database](DATABASE.md) and [security](AUTHENTICATION_AND_SECURITY.md) specify the boundaries.
