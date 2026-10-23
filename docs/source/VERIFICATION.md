# External source verification

Retrieved 2026-10-19 by Helios. Public documentation was read; no authenticated Gnani requests, key creation, GPU rental, phone calls or paid load tests were performed. Recheck contracts during implementation because vendor docs can change. IDs below are citations used by planning documents.

| ID | Source | Observed facts / limitation |
|---|---|---|
| S1 | [Official challenge](https://www.gnani.ai/internship) | Deadline November 10, 2026, 11:59 PM IST; solo or two-person entry; use Gnani technology and name contributions; synthetic data; public demo before submission. 5,000 programme credits are stated, not a rupee/dollar budget. Terms at registration prevail. No submission or post made. |
| S2 | [Prisma REST](https://docs.gnani.ai/api/STT/speech-to-text) | `POST https://api.vachana.ai/stt/v3`; multipart `audio_file`, `language_code`, header `X-API-Key-ID`; short synchronous clips, maximum 60 seconds, ideal <=30. Listed formats include WAV, MP3, OGG, FLAC, AAC, M4A, not WebM. `transcript` and `request_id` appear in successful responses. Hindi listed. Account compatibility and exact recorder outputs untested. |
| S3 | [Prisma realtime](https://docs.gnani.ai/api/STT/stt-websocket) | Raw mono PCM16LE; 512 samples/1,024-byte frames paced at 32 ms for 16 kHz or 64 ms for 8 kHz. Documented events include connected/processing/transcript. Do not assume token-level partials or forward WebM blobs as PCM. End-to-end latency unmeasured. |
| S4 | [Timbre realtime](https://docs.gnani.ai/api/TTS/tts-websocket) | Model-specific voice catalogs; v2.5 and v3.0 listed. Hindi and Hinglish options are documented. WAV/raw/MP3/OGG and telephony formats have different framing. Base64 audio chunks plus completion event; OGG is documented as delivered after synthesis completes. Playback and spoken medical-number fidelity untested. |
| S5 | Supplied PDF: `/Users/anshjohnson/Ganini/SakhiLine — Project Brief & Architecture.pdf` | Nine pages; page-numbered extraction in `brief-extracted.txt`. Original source retained outside repository; architecture diagram inspected on p.4. Assertions such as Evon access, latency and formats remain hypotheses unless verified independently. |

No conversion between programme credits and API minutes is assumed. No specific LLM vendor or real deployment is authorized. An 8 kHz synthetic recording is not a PSTN integration, and synthetic accuracy cannot establish clinical or field performance.

## Recheck 2026-10-24 (Johny, J3)

Public docs only. **Still no authenticated Gnani request**: no key was configured and no spend is approved.

- S2 is unchanged: `POST https://api.vachana.ai/stt/v3`, multipart `audio_file` + `language_code`, header `X-API-Key-ID`. Success: `{success, request_id, timestamp, transcript}`. Errors: `{success:false, error:{type,message}}` with 400/403/429/500/503.
- Language: `en-IN` "accepts English-Hindi mixed audio" and outputs Latin script. We picked it (`GNANI_LANGUAGE_CODE`) for Hinglish visits because the extractor expects Latin script. Unverified against real speech.
- Duration: the docs disagree with themselves (the endpoint description says 30s max, the schema says 60s). The app cap is 30s, so either is satisfied.
- Format: WAV only in the app. The browser records PCM WAV, so no WebM conversion is needed. The server checks the RIFF/WAVE header and duration, not the declared MIME type.
- Adapter `apps/api/src/providers/gnani.ts`: 30s timeout, no retries (billing). 400→UNSUPPORTED_MEDIA, 429→RATE_LIMITED, timeout→TIMEOUT, everything else→PROVIDER_FAILURE. Covered by `tests/contract/gnani.test.ts` using a stubbed fetch.
- Pending: one authorized live smoke with a synthetic clip, once a key and a spend ceiling are approved (G1).

## Live smoke 2026-10-24 (Johny, authorized by the repo owner in chat)

One authenticated request, synthetic audio only. Input: the worked-example sentence spoken by macOS `say` (voice Rishi, Indian English), 16 kHz mono PCM16 WAV, 8.41 s. Path: running API (`STT_PROVIDER=gnani`, `GNANI_LANGUAGE_CODE=en-IN`) → `POST /api/v1/visits/:id/extractions` → real `stageClip` → Gnani `/stt/v3` → mock regex extractor.

- Result: HTTP 200, wall time **686 ms** for the whole request (STT plus extraction, local network, N=1; not a latency claim).
- Expected: `Sunita ka BP check kiya, 110 by 70, Hb 9 tha, TT ka doosra injection due hai agle hafte.`
- Transcript: `sunita ka bp check kiya 110 by 70 hb nine tha tt ka doosra injection due hai ugly haft`
- Extracted: BP 110/70 ✅ · TT recorded ✅ · Hb **not_mentioned** ❌ (Gnani wrote "nine" as a word; the extractor only matches digits) · follow-up **not_mentioned** ❌ ("agle hafte" came back as "ugly haft", so no `AMBIGUOUS_DATE` issue was raised).
- Findings: (1) Gnani's verbatim output spells numbers out. The documented `format=transcribe` (inverse text normalization, which writes numbers as digits) may fix this but is untested. (2) A mis-transcribed time phrase silently becomes `not_mentioned` instead of `unknown`, which hides missing meaning; the worker must catch it during review. (3) This is TTS speech, not a human voice: N=1, not an accuracy measurement.

## Live check 2026-10-24: `format=transcribe` (Johny, authorized in chat)

Same synthetic 8.41 s clip, second authenticated request, with `format=transcribe` (documented inverse text normalization). HTTP 200, 722 ms through the whole request. The transcript was **identical** to verbatim: `... hb nine tha ... ugly haft`. Inverse text normalization did not turn "nine" into "9" for this `en-IN` mixed clip (N=1). The option stays available as `GNANI_STT_FORMAT` (default `verbatim`), but it is not a fix. Number words have to be handled after STT (extractor or a normalisation step).

## Live evaluation run 2026-10-24 (Johny, authorized in chat)

`npm run eval:live`: run `903e554a`, code `e8a2876`, manifest `04b5a0b8`. The 30 manifest scenarios (clean only), each spoken by macOS `say` (voice Rishi, en_IN) into 16 kHz mono WAV, one Gnani `/stt/v3` call each (30 billed calls, serial, `en-IN`, verbatim), then the mock extractor and the exact scorer.

- STT: 30/30 HTTP success. Per-clip STT p50 344 ms, max 783 ms.
- Fields: 120 expected, 99 correct, 7 wrong, 14 missed. **82.5% accuracy, 88.3% coverage, 5.8% wrong rate.** The FIXTURE clean condition on the same scenarios scores 96.7%.
- Main losses: follow-up date (6 missed, 2 wrong), TT mention (5 missed, 2 wrong: "dose" → "dost"), Hb (2 wrong, 2 missed).
- Confound: the TTS voice reads ISO dates badly ("2026-10-27" → "2,026 to 1027"), so some date losses come from the synthetic voice, not from Gnani or the worker.
- This is synthetic TTS speech, not human or field audio. Artifact: `eval/runs/latest-live.json` (includes every heard transcript and audio hash).
