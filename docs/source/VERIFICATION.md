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
