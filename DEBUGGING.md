# Debugging guide

Status: **Updated with implemented backend runbook in Shanky's lane**. Backend services, database migrations, and evaluation runners are operational locally. Test database runs on PostgreSQL 16 at `localhost:54320` (`packages/db/docker-compose.test.yml`). Production deployment, real-data pipelines, and paid cloud keys remain gated.

## Reproduction and evidence

Use a synthetic fixture ID, operation/request ID, schema/prompt/model version, actor role and error class. Never paste token values, connection strings, audio, transcripts, visit notes, private identity claims or production records into a bug report. Capture expected/actual state and exact revision. Preserve user edits and audit history; do not reset data as a diagnostic shortcut.

| Symptom | First checks | Safe response |
|---|---|---|
| App won't start | Manifest exists? T01 complete? Correct Node version/lockfile? | This planning repo has no start script. After implementation use documented clean-install/build checks. |
| Mic fails | Permission, HTTPS/localhost secure context, supported codec/device | Explain permission state and offer manual entry. Never claim recording is queued offline. |
| STT invalid-media | Actual decoded codec/MIME/duration; recorder container; conversion bounds | Reproduce with synthetic known-good clip; don't spoof file extensions. |
| Provider 401/403/quota | Server secret presence as boolean only, account permissions, approved credit cap | Stop automatic retries and report stable error; no credential values in logs. |
| Provider timeout | Operation elapsed time, concurrency, provider request ID | Preserve edits; bounded retry only within budget; timeout is not proof of cancelled billing. |
| Extraction wrong/malformed | Frozen transcript/version, unit/date/history provenance, schema issue category | Leave field unresolved or manual; no silent model switch or default clinical value. |
| Submission duplicated | Actor/resource/idempotency key hash, atomic audit/state transaction | Return original receipt; never create an additional visit on retry. |
| Stale edit/review | ETag and current revision, another review action | Return 409 and explicit refresh; don't approve a new unseen version. |
| History denied | Verified actor and active assignment, identity context/expiry | Consistent safe denial; don't reveal other beneficiary existence. |
| Audio remains staged | Cleanup success/failure/crash sweep and private path ownership | Quarantine from static serving; follow approved retention/cleanup policy, don't delete unrelated files. |
| Accuracy chart changes | Base split/manifest hash, seeds, model/schema/prompt versions, denominators | Reproduce exact run; retain failures and state synthetic limits. |

## Rollback / escalation

After implementation, revert the smallest code change while retaining additive schema/audit data. Disable an unverified speech feature visibly and preserve manual draft entry; don't silently label fixtures live. Provider/cost errors halt live runs. A cross-user disclosure, real data accidentally entered, or advice-shaped system output blocks release and requires human/security review. No destructive migration, account change or production deployment is authorized by this runbook.
