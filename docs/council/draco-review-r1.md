# Draco — Cross-Review Round 1 (SakhiLine)

**Role:** Draco, Claude systems member
**Correlation:** request `1e36102b-98fd-40c7-b1fa-6e64c216171b`, round 1 (cross-review)
**Read for this round:** `docs/council/athena-independent.md`, `docs/council/helios-independent.md`, `PROJECT_CONTEXT.md`, `docs/source/VERIFICATION.md`. Not re-reading my own `draco-independent.md` content here beyond citing it.
**No approvals granted here.** No application code written.

---

## Critique of Athena's independent report

### A-1. Evidence citations are not anchored to the source (MAJOR)
All three proposals cite "Page/Path Evidence" in generic terms ("Mentioned in project brief regarding unreliable network environments," "Inherent to ASHA health worker context") rather than specific pages or passages. Both Helios's report and mine cite exact pages/sections throughout. The brief is a 9-page document with specific tables and a labeled architecture diagram (p.4) — vague evidence citations make claims unverifiable against source and weaker as planning artifacts. **Fix is cheap** (go back and cite actual page numbers / `brief-extracted.txt` line ranges), but as filed this doesn't meet the evidentiary bar the round asked for.

### A-2. "Robust Speech-to-Text Pipeline" doesn't engage the transport/format constraints now on record (MAJOR)
Proposal #2's validation plan ("Audio noise stress tests with varied input audio files") assumes audio format is a solved problem. `VERIFICATION.md` S2/S3 (filed the same hour, before Athena's report) establishes that Prisma's REST endpoint does **not** list WebM (the default browser `MediaRecorder` output) among supported formats, and the realtime endpoint expects raw PCM16LE in specific frame sizes — not arbitrary audio blobs. A "robust STT pipeline" proposal that doesn't name this transcoding/capture problem is incomplete regardless of noise-robustness testing, since the pipeline doesn't yet have a verified way to get browser audio to Prisma at all. I'm not flagging this as a BLOCKER against Athena specifically — Helios's H-02 independently caught the same issue and proposes the right fix (a bounded integration spike) — but Athena's proposal should be read as "robustness after a currently-unverified prerequisite," not as filed.

### A-3. Zero security treatment (MAJOR)
Nothing in the report addresses authentication/authorization for the supervisor approval queue, API key handling, or safeguards against accidental real-PII entry — despite the brief's explicit synthetic-data-only compliance constraint (p.2) and a reviewer-facing dashboard holding health-adjacent records. Given the domain, this is a real gap, not a nice-to-have.

### A-4. Self-measuring stress test not acknowledged (MINOR)
The Risk Assessment section calls the "offline stress-testing harness... a critical mitigation" for Gnani-tech reliability risk, without noting that the harness measures Timbre-voiced audio through Prisma — the same TTS→STT circularity both Helios (H-04) and I (my #5) flagged independently in our own reports. Converging misses across two independent reviewers makes this worth surfacing even though Athena's report predates seeing either.

### A-5. Report is closer to validating the brief's existing framing than proposing an independent re-scoping (MINOR / QUESTION)
The Overview/Architectural Soundness/Contest Feasibility/Risk Assessment sections largely restate the brief's own Must/Should/Nice-to-have tiers and "ambitious but feasible" framing rather than proposing cuts, reorderings, or alternatives of Athena's own. Question for round 2: does Athena have an independent scope opinion that differs from the brief's own prioritization, or is agreement-with-brief the actual position?

### A-6. No cost or accessibility treatment (QUESTION)
Neither the 5,000-credit budget nor GPU-hosting cost for Evon is mentioned (contrast with Helios's explicit credit-spend gating). Accessibility (low-literacy UI, touch-target size on low-end Android, font scaling) also isn't addressed — though note this gap is shared by Helios's report and my own round-0 report, so it's a council-wide gap, not Athena-specific; flagging it here since the round instructions ask me to cover the dimension explicitly.

**What's solid in A's report:** the three proposals that are present (offline-first sync, STT pipeline, Zod validation) correctly identify real brief requirements and don't contradict any verified fact; effort/risk/validation fields are filled in the right shape, just thinly evidenced.

---

## Critique of Helios's independent report

### H-a. H-02's "format must match verified vendor support" doesn't commit to a capture mechanism, and that choice gates the 1.2s latency target (MAJOR)
H-02 correctly identifies the format mismatch (PCM16LE vs. browser `MediaRecorder` WebM/Opus output per `VERIFICATION.md` S3) but leaves the resolution open ("Browser recording format must match verified vendor support or explicit server conversion"). These are materially different architectures: (a) capture raw PCM client-side via Web Audio API/`AudioWorklet` (more client complexity, no server transcode step), vs. (b) accept browser-native audio and transcode server-side per chunk (simpler client, adds real-time transcoding latency on the critical path). This directly intersects my own round-0 item #1 (gateway contention vs. the 1.2s live-demo latency target): option (b) makes that budget measurably harder to hit. Recommend H-02's spike explicitly test option (a) first and only fall back to (b) with a measured latency cost if (a) proves infeasible in target browsers.

### H-b. H-03 says "no Redis requirement initially" — this creates an unresolved dependency conflict with H-05 and with my own round-0 #1 (QUESTION, not yet a blocker)
My round-0 proposal #1 (priority lanes between live and stress-test traffic) assumed BullMQ/Redis as already-planned MVP infra (brief p.7 lists Redis+BullMQ as baseline stack). H-03 explicitly defers Redis for the transactional-confirmation slice ("no Redis requirement initially"), and H-05 gates "durable offline audio... Redis" as a deferred item too, but doesn't say whether Redis/BullMQ is in or out of the *job-queue* (sync workers, stress-test runs) MVP as opposed to just the offline-audio-durability MVP. If Redis/BullMQ is fully deferred, my #1 mitigation needs a different (lighter) implementation for MVP — e.g., a simple in-process concurrency cap or request-priority header, rather than a BullMQ priority queue. **I'm revising my own #1 accordingly**: for the MVP slice as scoped by H-01/H-03, use a simple bounded worker pool / connection cap with priority ordering in the gateway process itself, not a BullMQ-dependent fix, and only move to BullMQ priority queues once/if Redis enters scope for sync workers.

### H-c. H-04's circularity fix addresses ground-truth, not input-realism — my #5 is complementary, not redundant (MINOR, convergence note)
H-04's deterministic evaluation (fixed expected fields, seeded noise recipes, exact-match scoring) correctly removes the "judge" half of the circularity problem (no more LLM-as-judge ambiguity) but the corpus is still Timbre-voiced audio scored through Prisma — it doesn't address whether synthetic TTS speech is acoustically representative of real ASHA speech. My round-0 #5 (small human-voiced-script validation subset) targets exactly that remaining gap. Recommend merging: adopt H-04's scoring methodology wholesale, and add my human-voiced subset as a secondary validation set — **contingent on resolving whether recording volunteers reading invented scripts violates the brief's "no... recorded calls" constraint (p.2)**, which I flagged as a genuine open question in my round-0 report and still cannot resolve from the text alone.

### H-d. H-05's telephony gate does not threaten the "Noise Canceller" award thesis — correcting my own initial read (not a critique of Helios, a self-correction)
On first pass I read H-05 (defer PSTN/Exotel/Twilio) as potentially undercutting the brief's "Noise Canceller" award target (p.8: "measured accuracy on noisy, phone-degraded audio from the stress test"). On closer reading, that award's evidence comes from the stress-test noise degrader (H-04, simulated 8kHz/codec/packet-loss on synthetic audio), not from live PSTN calls — H-05 only defers the *live telephony channel*, not the *noise-degradation evaluation*. So H-05's gate is sound and doesn't need a BLOCKER flag. It does cost the team the literal "phone call" demo moment the brief describes as part of the pitch (p.1 channel table, p.5 flow 3's spoken read-back) — that's a legitimate scope tradeoff for a human to accept, not an engineering defect. **My own round-0 #6 (partial-save checkpoint for phone fallback) is accordingly deferred along with H-05's telephony gate** — withdrawing it from the MVP recommendation below; it should be revisited only if/when PSTN re-enters scope.

### H-e. H-05's "online-only draft capture... text edits locally only" narrows, not eliminates, my round-0 #2 (storage durability) — still applicable at reduced scope (MINOR, convergence note)
If offline *audio* durability is deferred per H-05, the MVP still caches *text* edits locally (per H-05's own description) between draft and submit. My round-0 #2 (`navigator.storage.persist()`, explicit eviction warning) still applies to that smaller local-text cache — a supervisor's in-progress correction or an ASHA's confirmed-but-not-yet-submitted draft is exactly the kind of state that shouldn't silently evaporate. Recommend keeping a lightweight version of #2 in MVP scope even under H-05's reduction.

### H-f. Strong points, no critique needed
H-01's rejection of a full-duplex gateway as the starting point (for a verified reason — streaming support unconfirmed, larger build) is the right call for a 2-person/23-day team and matches the brief's own "cut from the bottom" instruction (p.8). H-03's state-machine/idempotency design closes a real correctness gap (duplicate submissions, stale-approval races) that neither the brief, Athena's report, nor my own report caught — this is the strongest single proposal across all three independent reports. H-02's citation of exact PCM framing parameters (512 samples/1024 bytes, 32ms/64ms pacing) from `VERIFICATION.md` is new, concrete, and correctly treated as unverified-until-spiked rather than assumed.

**No direct critique of my own proposals exists in either report** — both were written before either agent read mine. The intersections above (H-b, H-c, H-d, H-e) are the substantive equivalent: places where Helios's independent proposals converge with, narrow, or supersede premises in my round-0 items #1, #2, #5, and #6, and I've adjusted accordingly rather than leaving silent conflicts.

---

## Dimension coverage (explicit, per round instructions)

| Dimension | Assessment |
|---|---|
| **Security** | Covered well by Helios (H-02 credential/key handling, H-03 cross-role access denial). Absent in Athena's report (A-3, MAJOR). My own round-0 report covered medical-safety content-filtering but not auth/access control — gap I'm noting against myself too. |
| **Performance** | Covered by Helios (H-02 latency validation, though H-a above notes an unresolved capture-mechanism choice that affects it) and by my round-0 #1/#3. Athena names "API latency" as a risk but proposes no mitigation (MINOR gap, folded into A-4/A-6 context). |
| **UX** | Partially covered: H-03 (confirmation/retry UX), H-05 (explicit demo-limitation messaging so a dropped connection never silently claims success). Not addressed by Athena. Accessibility specifically (see below) is a UX subset left open by all three reports. |
| **Maintainability** | Reasonably covered across all three (H-03 "schema overgrowth" risk named; Athena's "increasing schema complexity" risk named; my report reused existing components rather than proposing new services throughout). No major gaps. |
| **Migration** | **N/A, with reason:** `PROJECT_CONTEXT.md` (E1–E7) confirms no application code, schema, or data exists yet — this is a greenfield build, so there is nothing to migrate from. The one relevant mention is H-03's "migration plan" dependency, which is about initial schema tooling choice (e.g., Prisma Migrate), not migrating existing data. |
| **Accessibility** | **Gap across all three independent reports**, including my own. The brief itself motivates this (p.1–2: workers "less comfortable with English forms," voice-first design implies low-literacy users) but none of the three reports name font scaling, touch-target sizing for low-end Android, or screen-reader/voice-read-back behavior as explicit design requirements. Flagging as a round-2 item for whichever report(s) take ownership of the ASHA-app UI slice. |
| **Cost** | Covered explicitly only by Helios (credit-spend gating, GPU-hours-only-when-used framing, consistent with `VERIFICATION.md`'s note that 5,000 credits is not a currency budget). Not addressed by Athena or by my own round-0 report — a gap I'm also owning. |
| **Operations** | Covered well by Helios (H-05: foreground retry requirement, sign-out cleanup, queue retention/eviction tests before any future offline rollout). Not addressed by Athena. My round-0 report touched operational concerns only narrowly (gateway priority lanes). |
| **Scope** | All three reports engage scope, but at different depths: Helios proposes an explicit MVP/deferred split with human-approval gates (H-05, strongest); my round-0 report assumed the brief's existing Must/Should/Nice tiers without re-deriving them; Athena's report largely restates the brief's own tiers (A-5) rather than proposing independent cuts. |

---

## Suggested revised MVP (round 1 — proposal only, no approval implied)

1. **Online-only vertical slice** (H-01, adapted): record → upload → batch transcribe via Prisma REST (≤30s clips, per `VERIFICATION.md` S2's ideal limit, not live streaming) → draft form → worker confirms/corrects → submit → supervisor approve/return (H-03's transactional state machine from day one — it's cheap and closes a real correctness gap).
2. **Speech-contract spike** (H-02) as a hard gate before any live-streaming work: resolve Web Audio API/`AudioWorklet` raw-PCM capture (preferred) vs. server-side transcode (fallback, with measured latency cost) per H-a above. If neither comfortably fits the 1.2s target, the MVP's "live" channel degrades gracefully to short-buffer record-and-send rather than continuous streaming — a fallback option not yet explicit in Helios's report, surfaced here.
3. **Medical-safety structural guardrail** (my round-0 #4) in MVP from day one, not deferred: no open "advice" field in the Zod schema, plus a keyword/regex check on generated follow-up text before TTS. This is cheap and is a trust floor, not a feature to cut under time pressure.
4. **Deterministic evaluation on a small, reviewed synthetic corpus** (H-04) — adopt its scoring methodology; defer the "hundreds of calls" large-scale run and GPU-hosted Evon-at-scale until the core flow is proven. Keep the noise-degrader simulation in scope even though live telephony is deferred (H-d above) — it's the actual evidence source for the Noise Canceller award.
5. **Lightweight local-draft durability** (narrowed version of my round-0 #2, per H-e): `persist()` + eviction warning for the local text-draft cache that H-05's online-only MVP still relies on, even though full offline-audio durability is deferred.
6. **Gateway priority ordering** (narrowed version of my round-0 #1, per H-b): in-process concurrency cap / priority ordering between live and stress-test traffic, without a Redis/BullMQ dependency, since Redis is not committed to this MVP slice.

### Explicitly deferred (pending separate approval/spikes, per H-05's gating logic)
- Live full-duplex WebSocket streaming gateway (contingent on step 2's spike outcome)
- Phone-call/PSTN fallback (Exotel/Twilio) — my round-0 #6 (partial-save checkpoint) deferred alongside it
- Durable offline audio queue + Redis/BullMQ job infrastructure at full scope
- GPU-hosted Evon at production/large-batch scale
- Outbound reminder calls
- Rule-based supervisor flag thresholds (blocked on a named domain/health-department reviewer — `PROJECT_CONTEXT.md` U6 — not an engineering task)
- Large-scale (hundreds-of-calls) stress run
- Human-voiced validation subset (my round-0 #5's complement to H-04) — blocked on resolving the "recorded call" constraint ambiguity first

### Outstanding human decisions this review surfaces (not resolvable by council alone)
Per `PROJECT_CONTEXT.md` U1–U8, still unresolved: contest-only vs. pilot scope, primary language commitment, actual team availability, approved API spend cap, a named domain reviewer for clinical field/unit semantics, and whether reading invented scripts aloud for validation audio counts as a "recorded call" under the brief's synthetic-data rule. None of these block continuing the council process, but several (spend cap, domain reviewer, recorded-call interpretation) block specific MVP items above from leaving "proposed" status.

---

## Owner response to Helios's round-1 critique of my (Draco) proposals

Helios's `helios-review-r1.md` critiqued D1 (priority lane), D2 (storage persistence), D3 (LLM benchmark), D4 (medical filter, **BLOCKER**), D5 (volunteer samples, **BLOCKER**), D6 (call checkpoints). Point-by-point response below; this supersedes the corresponding items in my round-0 and round-1 text above where they conflict.

**D1 — priority lane (MAJOR, accepted and further revised).** Agreed on both counts. I already dropped the BullMQ dependency in my own round-1 critique of H-03 (above), but Helios goes further and correctly: priority scheduling doesn't protect a vendor quota or a running evaluation job regardless of what it's built on, and the 1.2s figure is the brief's own aspirational phrasing ("under about 1.2 seconds," p.5), not a validated pass/fail threshold for this MVP. **Revised position:** drop priority scheduling entirely for MVP; run stress/evaluation traffic as a separate, concurrency-capped (≤1) batch job never interleaved with live/demo sessions, under an explicit spend cap. Latency gets measured and reported (p50/p95, record-stop to editable draft), not asserted against 1.2s as a requirement.

**D2 — storage persistence (MAJOR, accepted).** Agreed — `persist()` is a hint the browser can refuse, not a durability guarantee, and I was wrong to frame the fix as "hours-only." **Revised position:** reclassify as research for a future offline milestone, not an MVP fix. Any local draft state kept in the reduced online-only MVP (P1's "Local unsaved form state may survive transient network failures while the page remains open") needs foreground retry, explicit quota/eviction error surfacing to the worker, and a defined sign-out/cleanup policy before it's trusted for anything beyond transient in-session recovery — matching P1's own "page-close durability is not promised" framing, which I now defer to.

**D3 — LLM benchmark (MINOR, accepted).** Agreed on all three refinements: gate any paid 2–3-candidate comparison on explicit human spend approval; keep structured-output-validity and correct-medical-value as separate metrics rather than one blended score; freeze provider/model/prompt/schema versions together with no silent runtime fallback between them. No objection, folding directly into P2/P5's pinned-version approach.

**D4 — medical filter (BLOCKER, conceded).** Correct, and the correction is more than cosmetic. My round-0 proposal's stronger half (no open "advice"/"recommendation" field in the Zod schema at all) still stands, but I over-relied on a keyword/regex filter over free-generated follow-up text as a second line of defense, and Helios is right that regex can simultaneously miss real advice-shaped output and false-positive-block harmless documented statements — neither failure mode is acceptable in a health-adjacent tool. **Revised position, adopting P4's resolution:** the primary safety boundary is that clarification/follow-up text is drawn from a fixed, pre-approved UI template set — never free LLM-generated text rendered or spoken — and read-backs are deterministic from the worker-confirmed draft, not from model output. Extraction output is treated as untrusted structured data throughout. A keyword filter may still run as a supplemental diagnostic/logging signal, but it is explicitly not the safety boundary.

**D5 — volunteer samples (BLOCKER, conceded, consistent with my original framing).** I'd already flagged this exact ambiguity as an open, unresolved question in my round-0 report rather than a firm recommendation ("this needs a direct ruling... not an assumption either way"), so this isn't a reversal of a confident claim — it's the correct resolution of a question I deliberately left open. **Revised position:** do not collect volunteer recordings in this scope. Keep TTS-only stress-test numbers honestly labeled as synthetic self-consistency/robustness measurements (not natural-worker or clinical accuracy, per P5), and defer any human-voiced comparison indefinitely, pending specific contest and human authorization that doesn't currently exist.

**D6 — call checkpoints (MAJOR, accepted; already deferred).** I withdrew this item in my own round-1 review once I confirmed H-05's telephony gate doesn't undercut the Noise Canceller award thesis, so it's already out of MVP scope. For the record, when/if telephony re-enters scope: agreed that a persisted partial field must remain an explicit unconfirmed draft state (never implied as confirmed/submitted), resumption must bind to an authenticated worker and an exact confirmed-beneficiary/version context rather than inferring identity from caller ID, and the brief's "urgent" framing for the no-data phone channel (p.1) should not be read as license to relax confirmation rigor.

### Continued critique: PROPOSAL_R2.md (P1–P6)

Read in full for this response. R2 resolves essentially every open item above: P1 drops the 1.2s guarantee and BullMQ/Redis/offline/PSTN from MVP (closes D1/D2/D6); P2's "never send it under a fake MIME type" plus mandatory decoded-codec validation closes the capture-mechanism ambiguity I flagged against Helios's own H-02 more conservatively than I'd proposed; P4's fixed-template clarifications and deterministic confirmed-draft read-backs are exactly D4's resolution, and separately close the accessibility gap I flagged as missing across all three independent reports (44px touch targets, keyboard flow, screen-reader states); P5's "synthetic self-consistency/robustness, not natural-worker/clinical accuracy" labeling plus "No volunteer recordings... admitted now" is D5's resolution. I found no new BLOCKER-level issues in R2 against my own domain (architecture/reliability/safety). My vote and rationale are filed separately in `docs/council/draco-review-r2.md` per the vote contract.
