import { readFile } from "node:fs/promises";
import { SttResult, TranscribeClip } from "@sakhiline/contracts";

// Gnani Vachana short-clip STT, per docs.gnani.ai/api/STT/speech-to-text (rechecked 2026-10-24).
export const GNANI_STT_URL = "https://api.vachana.ai/stt/v3";

export interface GnaniOptions {
  apiKey: string;
  /** en-IN accepts English-Hindi mixed speech and returns Latin script, which the extractor expects. */
  languageCode?: string;
  /** "transcribe" turns on Gnani's inverse text normalization (e.g. "nine" → "9"); default "verbatim". */
  format?: "verbatim" | "transcribe";
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
}

/** Live adapter. The language comes from server config; the client's language hint is ignored. No retries (each call is billed). */
export function createGnaniTranscribe(opts: GnaniOptions): TranscribeClip {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const languageCode = opts.languageCode ?? "en-IN";
  const timeoutMs = opts.timeoutMs ?? 30_000;

  return async (clip) => {
    const started = Date.now();
    const fail = (code: Extract<SttResult, { ok: false }>["code"]): SttResult => ({ ok: false, code, latencyMs: Date.now() - started });
    try {
      const form = new FormData();
      form.append("audio_file", new Blob([await readFile(clip.path)], { type: clip.mimeType }), "clip.wav");
      form.append("language_code", languageCode);
      if (opts.format === "transcribe") form.append("format", "transcribe");
      const res = await doFetch(GNANI_STT_URL, {
        method: "POST",
        headers: { "X-API-Key-ID": opts.apiKey },
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 400) return fail("UNSUPPORTED_MEDIA");
      if (res.status === 429) return fail("RATE_LIMITED");
      if (!res.ok) return fail("PROVIDER_FAILURE");
      const body = (await res.json().catch(() => null)) as { success?: boolean; transcript?: unknown; request_id?: unknown } | null;
      if (!body?.success || typeof body.transcript !== "string") return fail("PROVIDER_FAILURE");
      return {
        ok: true,
        transcript: body.transcript,
        providerRequestId: typeof body.request_id === "string" ? body.request_id : undefined,
        latencyMs: Date.now() - started,
        mode: "live",
      };
    } catch (err) {
      return fail((err as Error)?.name === "TimeoutError" ? "TIMEOUT" : "PROVIDER_FAILURE");
    }
  };
}

/** Fixture mode: always the worked-example transcript, labelled mode "mock". Never presented as real STT. */
export const mockTranscribe: TranscribeClip = async () => ({
  ok: true,
  transcript: "Sunita ka BP check kiya, 110 by 70, Hb 9 tha, TT ka doosra injection due hai agle hafte.",
  latencyMs: 0,
  mode: "mock",
});
