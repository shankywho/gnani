import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGnaniTranscribe, GNANI_STT_URL } from "../../apps/api/src/providers/gnani.js";

// Contract tests against Gnani's documented REST shape. No network: fetch is stubbed.
async function clip() {
  const dir = await mkdtemp(join(tmpdir(), "gnani-test-"));
  const path = join(dir, "c.wav");
  await writeFile(path, Buffer.from("RIFF....WAVE"));
  return { path, mimeType: "audio/wav", seconds: 1 };
}

const respond = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as typeof fetch;

describe("Gnani STT adapter contract", () => {
  it("sends multipart audio_file + language_code with the key header, maps success", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchStub = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ success: true, request_id: "req_1", timestamp: "x", transcript: "BP 110 by 70" }));
    }) as unknown as typeof fetch;

    const r = await createGnaniTranscribe({ apiKey: "k-test", fetch: fetchStub })(await clip(), "hi-IN");
    expect(r).toMatchObject({ ok: true, transcript: "BP 110 by 70", providerRequestId: "req_1", mode: "live" });
    expect(seen!.url).toBe(GNANI_STT_URL);
    expect((seen!.init.headers as Record<string, string>)["X-API-Key-ID"]).toBe("k-test");
    const form = seen!.init.body as FormData;
    expect(form.get("audio_file")).toBeInstanceOf(Blob);
    expect(form.get("language_code")).toBe("en-IN"); // server config wins over the client hint
  });

  it.each([
    [400, { success: false, error: { type: "INVALID_REQUEST_ERROR", message: "too long" } }, "UNSUPPORTED_MEDIA"],
    [403, { success: false, error: { type: "FORBIDDEN", message: "credits" } }, "PROVIDER_FAILURE"],
    [429, { success: false, error: { type: "RATE_LIMIT_ERROR", message: "slow" } }, "RATE_LIMITED"],
    [500, { success: false, error: { type: "API_ERROR", message: "x" } }, "PROVIDER_FAILURE"],
    [503, { success: false, error: { type: "SERVICE_UNAVAILABLE", message: "x" } }, "PROVIDER_FAILURE"],
    [200, "not json", "PROVIDER_FAILURE"],
    [200, { success: true }, "PROVIDER_FAILURE"],
  ])("status %i → %s classification", async (status, body, code) => {
    const r = await createGnaniTranscribe({ apiKey: "k", fetch: respond(status, body) })(await clip(), "en-IN");
    expect(r).toMatchObject({ ok: false, code });
  });

  it("times out as TIMEOUT, not a hang", async () => {
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason)))) as unknown as typeof fetch;
    const r = await createGnaniTranscribe({ apiKey: "k", fetch: hang, timeoutMs: 20 })(await clip(), "en-IN");
    expect(r).toMatchObject({ ok: false, code: "TIMEOUT" });
  });

  it("network error is PROVIDER_FAILURE and never echoes the key", async () => {
    const boom = (async () => { throw new Error("ECONNRESET k-secret"); }) as typeof fetch;
    const r = await createGnaniTranscribe({ apiKey: "k-secret", fetch: boom })(await clip(), "en-IN");
    expect(r).toMatchObject({ ok: false, code: "PROVIDER_FAILURE" });
    expect(JSON.stringify(r)).not.toContain("k-secret");
  });
});
