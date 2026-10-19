# Draco — Vote on PROPOSAL_R2.md

Reviewer: Draco (Claude systems member)
Date: 2026-10-19
Naming R2 explicitly per the vote contract in `docs/council/PROPOSAL_R2.md`.

Full point-by-point response to Helios's round-1 critique of my own D1–D6 proposals is filed in `docs/council/draco-review-r1.md` (appended "Owner response" section) — summary: D1/D2/D3/D6 accepted and revised, D4 and D5 (both BLOCKER) conceded in full. This vote treats those resolutions as adopted.

## P1–P6 votes

- **P1 (scope reduction to online short-recording slice): APPROVE.** Directly resolves my round-1 concerns about gateway contention and the unvalidated 1.2s target by removing both from MVP commitments and reporting latency instead of asserting it. Unresolved, not a blocker: the reduction from the brief's "live" push-to-talk to stop-and-process recording needs explicit G0 human sign-off, since it changes a must-ship item from the source brief.
- **P2 (speech contract spike): APPROVE.** "Validate actual MIME, decoded codec, duration, channels and size; do not trust extensions" plus "never send it under a fake MIME type" closes the risk I raised against Helios's own H-02 (an unresolved capture-mechanism choice gating the latency target) more conservatively than I had proposed — it doesn't pick AudioWorklet-PCM vs. transcode in advance, but it forecloses the dangerous failure mode (mislabeled audio) either way. Leave the AudioWorklet-vs-transcode choice to the spike itself; not a blocker.
- **P3 (transactional, versioned visits): APPROVE.** Supersedes H-03 with stronger guarantees (idempotency keys with request-hash conflict detection, version preconditions, `confirmedRevision` cleared on any edit, no invented clinical thresholds). No objections from my domain. Unresolved, not a blocker: domain review of field semantics/units is pending (G1).
- **P4 (safe, accessible review experience): APPROVE.** This is the direct resolution of my conceded D4 BLOCKER — fixed-template clarifications, deterministic read-backs from confirmed drafts only, keyword filters demoted to supplemental diagnostics. Also closes the accessibility gap I flagged in round 1 as missing from all three independent reports (44px touch targets, keyboard flow, screen-reader states, non-color-only errors). No objections.
- **P5 (synthetic evaluation): APPROVE.** Resolves my conceded D5 BLOCKER (no volunteer recordings) and the TTS→STT circularity I raised in round 0/1 by labeling the result honestly ("synthetic self-consistency/robustness, not natural-worker/clinical accuracy") rather than trying to validate it against human speech without authorization. Concurrency-1, demo-isolated evaluation runs also resolve my revised D1 position. No objections.
- **P6 (observability and human gates): APPROVE.** No Redis/GPU/reminders in MVP resolves the H-03/H-05 Redis-scope ambiguity I flagged in round 1 — it's definitively out. Logging exclusions (no audio/transcript/identifier/key/token logging) are sound. G0–G3 gates map cleanly onto the open human-decision items (`PROJECT_CONTEXT.md` U1–U8) I surfaced in round 1. Unresolved, not a blocker: hosting/OIDC vendor and retention duration need human choice (G1).

## Unresolved blockers from my seat

None at the engineering/architecture/safety level. All open items above are human-decision gates the document already names (G0 live-experience reduction, G1 field semantics/hosting/spend/retention, language-fluent reviewer for P4's numerical read-back) — not defects in the proposal. Consistent with the vote contract's own framing, this APPROVE is not spend or implementation authorization, and none of G0–G3 are opened by this internal council vote alone.
