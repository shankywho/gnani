# Integration contracts

Status: planned adapters; no authenticated vendor call executed in this council. Documentation checks are indexed in [source verification](docs/source/VERIFICATION.md), retrieved 2026-10-19. Verify actual account access, price and formats at T02 before treating any contract as tested.

## Provider boundary

| Adapter | Application input | Application output | Failure and authority |
|---|---|---|---|
| STT | Validated bounded audio, selected language, request ID | Transcript, provider request ID, timing, format/version metadata | Timeout/rate/auth/invalid-media classified; no record writes or guessed fallback transcript. |
| Extraction | Frozen transcript, authorized history explicitly labeled old, visit time/timezone, pinned schema | Tentative typed observations, provenance, unresolved issues | Invalid/ambiguous output stays unresolved; no tools, arbitrary advice or DB authority. |
| Read-back TTS | Approved deterministic text from confirmed typed fields, voice/model/language config | Verified playable audio plus equivalent visible text | TTS failure cannot block text confirmation; no arbitrary transcript/note sent as advice-shaped speech. |
| Identity | Verified OIDC/session integration selected at G1 | Server actor/role/scope | Fail closed; client role hints and fixture mode never accepted in remote/live mode. |
| Database | Scoped domain transaction | Versioned records, transitions, durable receipts | No provider calls inside DB transactions; unique/FK/version constraints required. |

## Gnani facts and unresolved tests

Short-clip REST STT is documented at `POST https://api.vachana.ai/stt/v3`, multipart `audio_file`/`language_code`, with `X-API-Key-ID`; success includes `transcript` and `request_id`. Its listed duration maximum is 60s; the application's initial 30s cap is stricter. Browser WebM is not listed, so T02 must verify recorder output/conversion rather than rename the MIME type. [Official REST contract](https://docs.gnani.ai/api/STT/speech-to-text).

Future streaming uses a separate raw-PCM framing/pacing contract; it cannot reuse arbitrary recorder blobs. Documented completed-segment events are not proof of token-level partial transcripts. [Official realtime STT](https://docs.gnani.ai/api/STT/stt-websocket).

Timbre realtime documents model-specific voice catalogs, base64 audio events and completion, with container-specific streaming behavior. Select and pin one compatible voice/language/output contract; reassembled bytes must be playable in the selected browser and spoken numbers reviewed. [Official realtime TTS](https://docs.gnani.ai/api/TTS/tts-websocket).

Credential name `GNANI_API_KEY` is a proposed server variable; the wire header follows provider docs. Never expose it as a public Vite variable or browser WebSocket header. No key was created or copied here.

## Hosted extraction

Vendor/model unresolved. T02 compares a small frozen synthetic transcript set only after explicit spending authorization, then pins provider/model/prompt/schema versions. Record schema-validity rate and exact field errors separately. A model switch or silent fallback invalidates the evaluation identity and requires rerun/versioning. JSON shape alone is not semantic truth. Do not use generated “ground truth” or an LLM judge as the primary numeric scorer.

## Deferred contracts

PSTN/Exotel/Twilio, outbound reminders, Evon hosting/beta access, Redis/BullMQ and durable browser recording sync are not MVP dependencies. An 8kHz degraded synthetic fixture does not demonstrate a live phone call. No external API URL, credit conversion, beta access or MCP capability is invented for these features. Reopen with provider documentation, cost, identity/privacy/error/recovery requirements and human scope approval.

## Budget and provenance

Programme credits are not a verified currency/minute allowance. Record human-approved ceiling, per-test duration/count, retry bound, provider usage before/after and stop condition before paid spikes. Cache generated synthetic audio and manifests; do not run billable load tests. Credit exhaustion yields a visible error/manual path, never a fabricated “live” response. Fixture and live modes must be labeled in UI and artifacts.
