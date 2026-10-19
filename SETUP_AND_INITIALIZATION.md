# Setup and initialization

Status: future implementation instructions; **not currently runnable**. First resolve G0/G1 and receive explicit implementation authorization G2 in [roadmap](IMPLEMENTATION_ROADMAP.md). No package or environment file is created in this planning run.

## Existing prerequisites versus planned prerequisites

Existing: Git repository and October instructions in `CLAUDE.md`. Node/Python available to the council do not constitute a tested app environment.

Planned: supported Node LTS pinned after scaffold verification, npm lockfile, TypeScript, React/Vite frontend, Express backend, shared Zod contract, PostgreSQL and Prisma ORM. Exact dependency versions and compatible Node range must be resolved and recorded by T01. No Python, Redis or GPU requirement for the initial app; deterministic audio fixture generation may use ffmpeg as a bounded offline tool after approval.

## Proposed workspace

```text
apps/web/src/routes/          # separate files per future screen
apps/api/src/                # HTTP, identity, domain, speech adapter
packages/contracts/src/      # schema + validation, no provider keys
packages/db/prisma/          # schema, additive migration, synthetic seed
eval/fixtures/               # synthetic manifests, expected records
eval/src/                    # deterministic scorer and runner
tests/e2e/                   # browser journeys
```

## Initialization sequence after authorization

1. T01 creates root `package.json` with npm workspaces, lockfile, TypeScript configuration and scripts. Every package import must have a declared dependency in the importing workspace's manifest. No global-only packages.
2. Create frontend/backend/contracts/database workspace manifests. Use installed platform features rather than optional dependency wrappers. Start with fixture-only provider and isolated synthetic test data.
3. T03 selects verified identity middleware and local PostgreSQL arrangement, then creates the first schema migration and deterministic synthetic seed. The repository currently has no database to migrate.
4. Create `.env.example` with names and harmless comments only; add `.env`, caches, raw staging and local dumps to `.gitignore` while preserving October rules. Never place secrets in any `VITE_` variable.
5. T02 verifies authorized vendor access with bounded synthetic input and records selected language/codec/model versions and budget. No public sample should contain real phone numbers, identifiers or patient audio.
6. Once scripts exist, verify a clean checkout via `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e`. These are required future scripts, not checks run now.

## Proposed environment names

| Name | Scope / purpose |
|---|---|
| `DATABASE_URL` | Server; database connection secret. |
| `GNANI_API_KEY` | Server; vendor key transmitted only to documented endpoint. |
| `GNANI_LANGUAGE_CODE` | Server; selected verified language code. |
| `EXTRACTION_MODEL`, `EXTRACTION_API_KEY` | Server; pinned extraction provider contract, vendor unresolved. |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | Server; gated identity integration. |
| `SESSION_SECRET`, `APP_ORIGIN` | Server; session protection and strict origin. |
| `PROVIDER_MODE` | `fixture` locally or verified `live`; no silent fallback. |
| `AUDIO_STAGING_DIR` | Server private staging; not static web content. |
| `VITE_API_BASE_URL` | Public URL only, never credentials. Prefer same-origin paths. |

These variables do not exist in the repository yet. Names are a contract proposal, not discovered credentials. Do not print environment values during setup.

Externally reachable mode must refuse fixture identity injection and fail readiness if required auth/provider config is invalid. A fixture demo must identify itself visibly and must never claim live inference. No remote deployment or spend is authorized by this guide.
