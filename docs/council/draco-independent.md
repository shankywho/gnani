# Draco — Independent Council Proposal (SakhiLine)

**Role:** Draco, Claude systems member (architecture/reliability/safety lens)
**Provider disclosure:** Running as Claude Sonnet 5 (model id `claude-sonnet-5`), Anthropic. This matches my assigned role (Claude systems) — no provider mismatch to disclose.
**Correlation:** request `a3f01c02-b8ab-498e-ac96-a3393b0e1283`, round 0 (independent).

## Independence limitation (disclosed)

This is **not a clean-room review**. This session's own memory layer surfaced, unprompted, prior observations from earlier today showing this exact PDF was already loaded and "extracted and analyzed" multiple times in this working session (including a prior multi-agent debate round with agents named Juno/Orion/Atlas that reportedly produced a "SakhiLine Debate Conclusions & Recommendations document"), and the repo root contains `SakhiLine-review-conclusions.md`, which I did **not** open for this task. I cannot fully rule out that my framing below is anchored by residual context from that earlier pass rather than purely fresh analysis, even though I did not re-read the conclusions file or any `docs/council/*` file (I confirmed `docs/council/helios-independent.md` exists and deliberately left it unread). Treat the independence of this submission as **partial, not absolute**, and weight cross-review accordingly.

## Baseline (role-specific)

Repo at `/Users/anshjohnson/October/untitled-workspace` currently contains no application code — only `CLAUDE.md` and the (unread) conclusions file. There is no existing architecture to critique in-repo; all evidence below is against the brief PDF (`/Users/anshjohnson/Ganini/SakhiLine — Project Brief & Architecture.pdf`, 9 pages). My baseline concern as the systems/reliability reviewer: the brief's architecture diagram (p.4) is sound at the box level, but several reliability, safety-enforcement, and measurement-validity gaps exist between the boxes — the kind that don't show up until integration, and that a 2-person/23-day team won't have slack to discover late.

---

## Proposed improvements

### 1. Stress-test traffic shares the gateway with the latency-critical live path
- **Problem:** The architecture (p.3–4) routes live app traffic, phone-call traffic, and "hundreds of synthetic noisy calls" through one voice gateway, explicitly "so the Prisma → dialogue engine → Timbre pipeline is built and tested once." The live-app target is "under about 1.2 seconds" end-to-end (p.5).
- **Evidence:** PDF p.3 ("The app, the phone call and the synthetic test traffic all enter one voice gateway"); p.4 diagram shows all three inputs converging on one "Voice gateway" box; p.5 states the 1.2s target "needs streaming at every stage."
- **Benefit of fixing:** Protects the one number the demo is built around (p.1: "Every accuracy claim in the demo comes with a measured number") from being quietly degraded by self-inflicted load, including during the live demo recording itself.
- **Alternative (what to do instead):** Keep the pipeline code shared (that's the right call, don't fork it) but add a cheap priority lane: tag synthetic-caller connections at the gateway and give live/call traffic strict priority in the WebSocket accept queue and worker pool (BullMQ already in the stack, p.7 — use priority queues, not a new system). No new service, no new dependency.
- **Dependencies:** Voice gateway (Node/TS WebSocket server), BullMQ job priorities.
- **Risks if unaddressed:** Running a hundreds-of-calls stress batch right before/during demo recording silently inflates the showcased latency number — the exact failure mode that undermines "Noise Canceller" credibility.
- **Effort:** Low (0.5–1 day) — this is a queue-priority flag, not new infrastructure.
- **Validation:** Load the stress harness at full synthetic volume concurrently with a scripted live-flow run; assert p95 live latency stays under the 1.2s target during contention.

### 2. Offline queue (flow 2) has no stated storage-durability guarantee
- **Problem:** "With weak or no data, the app records audio locally and queues it in the phone's browser storage" (p.5). No persistence API, eviction handling, or retry/backoff is specified.
- **Evidence:** PDF p.5, flow 2, steps 1–2; p.7 tech stack row "ASHA app... browser storage for the offline queue" — same gap, no durability note.
- **Benefit of fixing:** The product's entire pitch is "voice removes most of [the paperwork]" (p.1) — losing a recorded visit to storage eviction on a budget Android phone recreates exactly the data-loss problem SakhiLine exists to solve, for the hardest-to-reach users (weak-signal, likely lower-end devices).
- **Alternative:** Explicitly request persistent storage (`navigator.storage.persist()`) at queue time and surface a UI warning if the browser denies it, rather than assuming default (evictable) storage silently holds. This is a few lines, not a new dependency.
- **Dependencies:** PWA service worker / browser storage layer already planned (p.7).
- **Risks if unaddressed:** Silent data loss on exactly the offline/low-data cohort the "Real Deal" award (p.8) is targeted at — a credibility risk if discovered during judging or a real pilot.
- **Effort:** Low (hours).
- **Validation:** Manual test: fill storage near quota on a low-end Android Chrome/PWA profile, queue a few recordings, force backgrounding/memory pressure, confirm recordings survive or the user is explicitly warned.

### 3. "Whichever hosted LLM is fastest" leaves the schema-reliability variable unpinned
- **Problem:** "The real-time conversation logic runs on whichever hosted LLM is fastest" (p.6) — but the dialogue engine depends on strict function-calling against a Zod schema (p.4, p.7), and function-calling schema-adherence reliability varies meaningfully across hosted LLMs, especially under code-mixed Hindi/English input the brief itself describes (p.1: "Sunita ka BP check kiya, Hb 9 tha...").
- **Evidence:** PDF p.4 ("validated against a strict schema (Zod). Missing or unclear fields get a follow-up question, never a guess"); p.6 ("runs on whichever hosted LLM is fastest"); p.7 ("Dialogue engine... hosted LLM with function calling; Zod schemas").
- **Benefit of fixing:** Avoids discovering late (day 15 of 23) that the "fastest" model has a materially worse schema-adherence rate on code-mixed input, forcing a last-minute swap under deadline pressure.
- **Alternative:** Spend a half-day now benchmarking 2–3 candidate hosted LLMs against the actual Zod schema using a handful of realistic code-mixed transcripts (can hand-write these, don't need Evon yet), and lock the choice for the 23-day window. Revisit only if a hard latency wall is hit.
- **Dependencies:** None new — this is a decision gate before dialogue-engine implementation starts.
- **Risks if unaddressed:** Mid-build model swap burns days the 2-person team doesn't have, and schema-adherence failures look like "the AI is bad at listening" to a demo viewer — fatal to the "Jugaad Genius"/credibility narrative.
- **Effort:** Low (0.5 day), pays for itself by preventing a much larger late-stage cost.
- **Validation:** Script in the eventual evaluator (p.6, "Evaluator... Score vs ground truth") to also report schema-validation failure rate per model, not just field accuracy.

### 4. "Never diagnoses or recommends treatment" is stated as a rule, not enforced structurally
- **Problem:** Medical safety is listed as "(our own rule)" with no technical mechanism (p.3): "SakhiLine logs and reminds; it never diagnoses or recommends treatment." The dialogue engine is an LLM with function calling generating follow-up questions and (per flow 1 step 4) handling "missing or unclear fields." Nothing described prevents the LLM from generating a treatment-adjacent follow-up or free-text note under ambiguous clinical input (e.g., "Hb 9 tha" is itself a low-hemoglobin reading close to actionable territory).
- **Evidence:** PDF p.3, Medical safety row; p.4 step 4 (follow-up question generation); no corresponding guardrail appears anywhere in the architecture diagram (p.4) or data-flow steps (p.4–6).
- **Benefit of fixing:** Converts a values statement into something that actually holds under LLM non-determinism — relevant both for the judges (this is a health-adjacent product) and for real ASHA/beneficiary safety if this ever leaves the hackathon.
- **Alternative:** Two cheap, no-new-dependency controls: (a) the Zod schema itself should contain no open "advice"/"recommendation" field — structurally, the LLM has nowhere to put clinical advice even if it generates it; (b) a lightweight keyword/regex check on any generated follow-up-question or read-back text before it's sent to Timbre for speech, logging (not blocking silently) any hit for human review. This is instruction-design + a few lines of filtering, not a new classifier/model.
- **Dependencies:** Zod schema design, dialogue-engine prompt.
- **Risks if unaddressed:** A single demo-video moment where the assistant appears to suggest a dosage or treatment would be a disqualifying-looking failure for a health-worker tool, independent of actual harm.
- **Effort:** Low (schema is being designed anyway; filter is ~1 day including test cases).
- **Validation:** Add adversarial test scripts to the Evon-generated stress-test corpus (p.5–6) specifically probing ambiguous/concerning readings, and check zero advice-shaped output across them.

### 5. The stress-test measures Prisma against Timbre's own voice, not independent ground-truth audio
- **Problem:** "The stress test uses Gnani's text-to-speech to generate test data for Gnani's speech-to-text, so the system measures itself" (p.6) — explicitly flagged by the brief's own authors as the "Jugaad Genius angle," but a closed TTS→STT loop risks measuring Timbre/Prisma self-consistency rather than real-world ASHA-speech robustness (synthetic TTS prosody, pronunciation regularity, and code-switching patterns are systematically different from real speakers').
- **Evidence:** PDF p.6, "Where the Gnani models are used" section, explicit self-measurement statement; p.5 flow 5 describes the full synthetic-only pipeline (Evon writes scripts → Timbre voices them → noise degrader → Prisma transcribes → evaluator scores).
- **Benefit of fixing:** Makes the headline accuracy numbers defensible against the obvious judge question ("isn't this just testing itself?"), directly protecting the "Noise Canceller" award thesis (p.8) which depends on those numbers being credible.
- **Alternative:** Within the same synthetic-data constraint (p.2: no real beneficiaries/records/recorded *calls*), get a small number of team members or volunteers to read Evon-generated (invented) scripts aloud and run those through the same noise degrader + Prisma pipeline, as a sanity-check subset compared against the TTS-only numbers. This doesn't reuse any real patient data — only the script content is synthetic, same as the rest of the pipeline.
- **Dependencies:** None new; reuses noise degrader and evaluator already planned.
- **Risks if unaddressed:** A judge or reviewer who clocks the closed-loop measurement can reasonably discount the headline accuracy numbers as self-graded, which is the opposite of the brief's own positioning ("backed by measured accuracy numbers instead of claims," p.1).
- **Effort:** Low–Medium (a few hours to collect ~15–20 human-read samples; no new infra).
- **Validation:** Compare Prisma word-error-rate / field-accuracy on the human-voiced subset vs. the matched TTS-voiced subset; report the delta alongside the main accuracy chart rather than hiding it.
- **Uncertainty flagged here, not a firm recommendation:** whether recording volunteers reading invented scripts counts as a "recorded call" under the brief's "no... recorded calls" constraint (p.2) is genuinely ambiguous from the text alone — this needs a direct ruling from whoever owns the contest-rules interpretation before implementing, not an assumption either way.

### 6. No partial-save checkpoint for the phone-call fallback under "patchy" rural coverage
- **Problem:** Network constraint is explicitly called out as core ("Rural data coverage is patchy... Offline queue and call fallback are part of the design, not extras," p.3), yet flow 3 (phone-call fallback, p.5) only describes a save-on-confirmation end state — no mention of persisting partial progress if the call drops mid-conversation, which is the single highest-risk moment for a voice-only, no-data-fallback user to lose a multi-minute description.
- **Evidence:** PDF p.3 Network constraint row; p.5 flow 3 steps 1–3 (call → transcribe/fill → confirm → save as pending review — nothing in between).
- **Benefit of fixing:** Protects the exact use case ("No data, urgent," p.1 channel table) that the phone-call channel exists for, from the exact failure mode (dropped calls) that channel is most exposed to.
- **Alternative:** Since the dialogue engine already fills fields incrementally (flow 1 step 4/5 describes live field-fill), checkpoint each newly-confirmed field to Postgres as a draft-status row during the call, not only at final confirmation — reusing the same Postgres write path already built for flow 1, no new component.
- **Dependencies:** Dialogue engine, Postgres schema (status field already needed for "pending review" per p.5).
- **Risks if unaddressed:** A worker who completes a long voice-only report, has the call drop before the final read-back confirmation, loses the entire report and must redo it on a connection that's already unreliable — the worst-case UX for the hardest-served channel.
- **Effort:** Low (a few hours — incremental writes to an existing table with an existing status field).
- **Validation:** Simulate a call drop at each step of flow 3 and confirm partial field data is recoverable/resumable rather than lost.

---

## Open questions / uncertainty (beyond #5 above)

1. Is the "whichever hosted LLM is fastest" line (p.6) a final decision already made outside this document, or genuinely open? If already decided, item #3 reduces to "benchmark schema-adherence on the chosen model" rather than a selection exercise.
2. "Rule-based supervisor flags, with thresholds set by the health department" (p.5, flow 4 step 2) — the brief doesn't say who supplies these thresholds for a hackathon submission with synthetic data only. Worth clarifying whether the team invents placeholder thresholds (and says so) or this feature gets cut given the 23-day window, since "Rule-based supervisor flags" is also listed under "Verify in Gnani's docs before writing code" (p.9), which seems like a mis-filed item — it's a product/domain decision, not a Gnani API behavior to verify, and leaving it there risks it never getting a real answer.
3. I could not verify any of this against actual Prisma/Timbre/Evon API documentation (out of scope for this pass, and the brief itself lists several items still needing verification, p.9) — my recommendations assume the brief's architecture description is accurate; if Prisma's streaming endpoint behaves differently than described, items #1 and #6 in particular may need revision.
